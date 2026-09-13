"""Exercise the Assist conversation entity through Home Assistant's own agent path."""

import asyncio
from collections.abc import Mapping
from dataclasses import dataclass, field
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.components import conversation
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import Context, HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import intent
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator.const import (
    DOMAIN,
    FOUNDATION_ENTRY_UNIQUE_ID,
)
from custom_components.ai_orchestrator.conversation import (
    BUSY_MESSAGE,
    CONVERSATION_LIMITS,
    CONVERSATION_SYSTEM_INSTRUCTION,
    FAILED_MESSAGE,
    INVALID_RESPONSE_MESSAGE,
    TIMEOUT_MESSAGE,
    TOO_LONG_MESSAGE,
)
from custom_components.ai_orchestrator.provider_entry import (
    ChatDestination,
    async_register_provider_entry_adapter,
    build_provider_entry_data,
    provider_entry_unique_id,
)
from custom_components.ai_orchestrator.providers.contract import (
    SAFE_ERROR_MESSAGES,
    ConnectionValidationResult,
    ErrorCode,
    MessageRole,
    NormalizedError,
    ProviderError,
    TextGenerationResult,
    ToolCall,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.provider_fakes import (
    SYNTHETIC_CONFIG_FIELD,
    SYNTHETIC_PROVIDER_TYPE,
    SyntheticProviderEntryAdapter,
)

CONNECTION_ID = "12345678-1234-4234-9234-123456789abc"
ENTITY_ID = "conversation.synthetic_local_ai"
CREDENTIAL = "synthetic-private-credential"
REPLY = "I cannot check the window, but closing it before rain is wise."


@dataclass
class LocalAdapter(SyntheticProviderEntryAdapter):
    """Synthetic adapter that hands back one caller-controlled provider."""

    chat_destination: ChatDestination | None = ChatDestination.LOCAL
    provider: AsyncMock | None = field(default=None)

    async def async_create_provider(self, config: Mapping[str, object]) -> AsyncMock:
        del config
        assert self.provider is not None
        return self.provider


async def setup_agent(
    hass: HomeAssistant,
    *,
    destination: ChatDestination | None = ChatDestination.LOCAL,
) -> tuple[AsyncMock, MockConfigEntry]:
    """Load one provider entry through Home Assistant's own config-entry manager."""
    provider = AsyncMock()
    provider.validate_connection.return_value = ConnectionValidationResult(
        reachable=True, authenticated=True
    )
    provider.generate.return_value = TextGenerationResult(text=REPLY)
    async_register_provider_entry_adapter(
        hass, LocalAdapter(chat_destination=destination, provider=provider)
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=CONNECTION_ID,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: CREDENTIAL},
        ),
        unique_id=provider_entry_unique_id(CONNECTION_ID),
        title="Synthetic local AI",
        version=2,
    )
    entry.add_to_hass(hass)
    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
    return provider, entry


async def converse(hass: HomeAssistant, text: str, conversation_id: str | None = None):
    """Send one sentence to this integration's agent exactly as Assist does."""
    return await conversation.async_converse(
        hass,
        text=text,
        conversation_id=conversation_id,
        context=Context(),
        language="en",
        agent_id=ENTITY_ID,
    )


@pytest.fixture(autouse=True)
async def _conversation_component(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "conversation", {})


async def test_agent_answers_with_model_text_and_calls_no_action(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """One sentence produces one bounded provider call and no Home Assistant action."""
    hass.states.async_set("binary_sensor.synthetic_window", "on", {"private": "state"})
    provider, _ = await setup_agent(hass)

    with patch.object(
        type(hass.services), "async_call", new_callable=AsyncMock
    ) as service_call:
        result = await converse(hass, "Is it going to rain?")

    assert result.response.response_type is intent.IntentResponseType.ACTION_DONE
    assert result.response.speech["plain"]["speech"] == REPLY
    service_call.assert_not_awaited()
    provider.generate.assert_awaited_once()
    request = provider.generate.await_args.args[0]
    assert request.messages[0].role is MessageRole.SYSTEM
    assert request.messages[0].content == CONVERSATION_SYSTEM_INSTRUCTION
    assert [message.content for message in request.messages[1:]] == [
        "Is it going to rain?"
    ]
    assert request.tools == ()
    assert request.output_schema is None
    serialized = str(request)
    assert "binary_sensor.synthetic_window" not in serialized
    assert CREDENTIAL not in serialized


async def test_agent_is_not_offered_as_a_device_control_agent(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """The entity declares no control feature and keeps a stable unique id."""
    await setup_agent(hass)

    state = hass.states.get(ENTITY_ID)
    assert state is not None
    assert state.attributes["supported_features"] == 0
    entity_entry = er.async_get(hass).async_get(ENTITY_ID)
    assert entity_entry is not None
    assert entity_entry.unique_id == f"{CONNECTION_ID}_conversation"


async def test_following_turn_carries_the_previous_turns_only(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """A second sentence in one conversation replays the earlier bounded turns."""
    provider, _ = await setup_agent(hass)

    first = await converse(hass, "What should I ask you?")
    provider.generate.return_value = TextGenerationResult(text="Ask me anything.")
    await converse(hass, "Remember that.", conversation_id=first.conversation_id)

    request = provider.generate.await_args.args[0]
    assert [(m.role.value, m.content) for m in request.messages] == [
        ("system", CONVERSATION_SYSTEM_INSTRUCTION),
        ("user", "What should I ask you?"),
        ("assistant", REPLY),
        ("user", "Remember that."),
    ]


async def test_separate_conversations_do_not_share_history(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """A new conversation id starts from the system instruction again."""
    provider, _ = await setup_agent(hass)

    await converse(hass, "First conversation.")
    await converse(hass, "Second conversation.")

    request = provider.generate.await_args.args[0]
    assert [m.content for m in request.messages[1:]] == ["Second conversation."]


@pytest.mark.parametrize(
    ("failure", "expected"),
    [
        (
            ProviderError(
                NormalizedError(
                    code=ErrorCode.AUTHENTICATION,
                    message=SAFE_ERROR_MESSAGES[ErrorCode.AUTHENTICATION],
                ),
                retry_allowed=False,
                failover_allowed=False,
            ),
            SAFE_ERROR_MESSAGES[ErrorCode.AUTHENTICATION],
        ),
        (TimeoutError(), TIMEOUT_MESSAGE),
        (RuntimeError(CREDENTIAL), FAILED_MESSAGE),
    ],
)
async def test_failures_answer_safely_without_provider_detail(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    failure: BaseException,
    expected: str,
) -> None:
    """A provider failure becomes a spoken error with no adapter text."""
    provider, _ = await setup_agent(hass)
    provider.generate.side_effect = failure

    result = await converse(hass, "Are you there?")

    assert result.response.response_type is intent.IntentResponseType.ERROR
    assert result.response.speech["plain"]["speech"] == expected
    assert CREDENTIAL not in str(result.response.as_dict())


@pytest.mark.parametrize(
    "result_value",
    [
        TextGenerationResult(text="   "),
        TextGenerationResult(
            text="ok",
            tool_calls=(ToolCall(id="1", name="light", arguments={}),),
        ),
        TextGenerationResult(text="ok", structured_output={"category": "x"}),
        TextGenerationResult(
            text="x" * (CONVERSATION_LIMITS["max_response_chars"] + 1)
        ),
    ],
)
async def test_unusable_replies_are_refused_and_not_remembered(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    result_value: TextGenerationResult,
) -> None:
    """Tool calls, structured output, empty and oversized text never reach Assist."""
    provider, _ = await setup_agent(hass)
    provider.generate.return_value = result_value

    first = await converse(hass, "Say something.")

    assert first.response.response_type is intent.IntentResponseType.ERROR
    assert first.response.speech["plain"]["speech"] == INVALID_RESPONSE_MESSAGE

    provider.generate.return_value = TextGenerationResult(text=REPLY)
    await converse(hass, "Try again.", conversation_id=first.conversation_id)
    request = provider.generate.await_args.args[0]
    assert all(
        message.role is not MessageRole.ASSISTANT for message in request.messages
    )


async def test_an_oversized_sentence_is_refused_before_any_provider_call(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """A sentence beyond the bound never reaches the provider."""
    provider, _ = await setup_agent(hass)

    result = await converse(hass, "x" * (CONVERSATION_LIMITS["max_message_chars"] + 1))

    assert result.response.speech["plain"]["speech"] == TOO_LONG_MESSAGE
    provider.generate.assert_not_awaited()


async def test_a_second_sentence_while_generating_is_refused(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """Only one generation per entity runs at a time."""
    provider, _ = await setup_agent(hass)
    release = asyncio.Event()

    async def slow(request):
        del request
        await release.wait()
        return TextGenerationResult(text=REPLY)

    provider.generate.side_effect = slow
    first = asyncio.ensure_future(converse(hass, "Take your time."))
    await asyncio.sleep(0)
    second = await converse(hass, "And now?")
    release.set()

    assert second.response.speech["plain"]["speech"] == BUSY_MESSAGE
    assert (await first).response.speech["plain"]["speech"] == REPLY
    assert provider.generate.await_count == 1


async def test_unloading_the_provider_entry_removes_the_agent(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """The agent exists only while its provider connection is loaded."""
    _, entry = await setup_agent(hass)
    assert async_get_runtime(hass).conversation_entry_ids == {entry.entry_id}

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.NOT_LOADED
    assert async_get_runtime(hass).conversation_entry_ids == set()
    assert conversation.async_get_agent(hass, ENTITY_ID) is None


async def test_a_provider_without_a_local_destination_gets_no_agent(
    hass: HomeAssistant, enable_custom_integrations: None
) -> None:
    """Only providers eligible for local chat expose a conversation entity."""
    _, entry = await setup_agent(hass, destination=None)

    assert entry.state is ConfigEntryState.LOADED
    assert hass.states.get(ENTITY_ID) is None
    assert async_get_runtime(hass).conversation_entry_ids == set()


async def test_status_reports_the_conversation_feature(
    hass: HomeAssistant, enable_custom_integrations: None, hass_ws_client
) -> None:
    """The panel status reflects a real, loaded conversation agent."""
    foundation = MockConfigEntry(
        domain=DOMAIN, data={}, unique_id=FOUNDATION_ENTRY_UNIQUE_ID
    )
    foundation.add_to_hass(hass)
    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert await hass.config_entries.async_setup(foundation.entry_id)
        await hass.async_block_till_done()
    await setup_agent(hass)

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ai_orchestrator/status"})
    response = await client.receive_json()

    assert response["result"]["features"]["conversation"] is True
