"""Exercise local text-only chat through the actual authenticated WebSocket API."""

import asyncio
from dataclasses import dataclass
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator import async_unload_entry
from custom_components.ai_orchestrator.chat import CHAT_LIMITS, SYSTEM_INSTRUCTION
from custom_components.ai_orchestrator.const import DOMAIN
from custom_components.ai_orchestrator.provider_entry import (
    ChatDestination,
    LoadedProviderConnection,
    async_register_provider_entry_adapter,
    build_provider_entry_data,
    provider_entry_unique_id,
)
from custom_components.ai_orchestrator.providers.contract import (
    ConnectionValidationResult,
    ErrorCode,
    MessageRole,
    NormalizedError,
    ProviderError,
    TextGenerationResult,
    ToolCall,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.websocket_api import (
    async_register_websocket_commands,
)
from tests.home_assistant.provider_fakes import (
    SYNTHETIC_CONFIG_FIELD,
    SYNTHETIC_PROVIDER_TYPE,
    SyntheticProviderEntryAdapter,
)

CONNECTION_ID = "12345678-1234-4234-9234-123456789abc"
REQUEST_ID = "12345678-1234-4234-9234-123456789abd"
SECOND_ID = "12345678-1234-4234-9234-123456789abe"


@dataclass
class LocalAdapter(SyntheticProviderEntryAdapter):
    """Explicitly opt a synthetic provider into local administrator chat trials."""

    chat_destination: ChatDestination | None = ChatDestination.LOCAL


def request(**overrides):
    result = {
        "type": "ai_orchestrator/chat/send",
        "connection_id": CONNECTION_ID,
        "request_id": REQUEST_ID,
        "messages": [{"role": "user", "content": "Draft a window reminder."}],
    }
    result.update(overrides)
    return result


def setup_chat(hass: HomeAssistant, *, eligible=True):
    adapter = LocalAdapter(chat_destination=ChatDestination.LOCAL if eligible else None)
    async_register_provider_entry_adapter(hass, adapter)
    provider = AsyncMock()
    provider.generate.return_value = TextGenerationResult(
        text="Please close the window."
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=CONNECTION_ID,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-private-credential"},
        ),
        unique_id=provider_entry_unique_id(CONNECTION_ID),
        title="Synthetic local provider",
        version=2,
    )
    entry.add_to_hass(hass)
    entry.runtime_data = LoadedProviderConnection(
        connection_id=CONNECTION_ID,
        provider_type=SYNTHETIC_PROVIDER_TYPE,
        provider=provider,
        validation=ConnectionValidationResult(reachable=True, authenticated=True),
    )
    async_get_runtime(hass).loaded_provider_entry_ids.add(entry.entry_id)
    async_register_websocket_commands(hass)
    return provider, entry


async def test_options_are_local_and_do_not_generate(hass, hass_ws_client):
    provider, _ = setup_chat(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ai_orchestrator/chat/options"})
    response = await client.receive_json()
    assert response["success"] is True
    assert response["result"] == {
        "schema_version": 1,
        "providers": [
            {
                "connection_id": CONNECTION_ID,
                "title": "Synthetic local provider",
                "display_name": "Synthetic Provider",
                "destination": "local",
                "capability_verified": False,
            }
        ],
        "limits": CHAT_LIMITS,
        "streaming": False,
        "household_context": False,
        "actions": False,
        "history_persisted": False,
    }
    assert "synthetic-private-credential" not in str(response)
    provider.generate.assert_not_called()
    provider.discover_capabilities.assert_not_called()


@pytest.mark.parametrize(
    "command", ["ai_orchestrator/chat/options", "ai_orchestrator/chat/send"]
)
async def test_nonadmin_cannot_chat(
    hass, hass_ws_client, hass_read_only_access_token, command
):
    provider, _ = setup_chat(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id(
        request() if command.endswith("send") else {"type": command}
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "unauthorized"
    provider.generate.assert_not_called()


async def test_multiturn_only_supplied_text_and_no_actions(hass, hass_ws_client):
    provider, _ = setup_chat(hass)
    hass.states.async_set("sensor.synthetic_private", "private-value")
    client = await hass_ws_client(hass)
    messages = [
        {"role": "user", "content": "Use the name River."},
        {"role": "assistant", "content": "Hello River."},
        {"role": "user", "content": "Turn on every light."},
    ]
    with patch.object(
        type(hass.services), "async_call", new_callable=AsyncMock
    ) as call:
        await client.send_json_auto_id(request(messages=messages))
        response = await client.receive_json()
    assert response["success"] is True
    assert response["result"] == {
        "schema_version": 1,
        "connection_id": CONNECTION_ID,
        "request_id": REQUEST_ID,
        "text": "Please close the window.",
        "destination": "local",
        "streaming": False,
    }
    sent = provider.generate.call_args.args[0]
    assert sent.messages[0].role is MessageRole.SYSTEM
    assert sent.messages[0].content == SYSTEM_INSTRUCTION
    assert [m.content for m in sent.messages[1:]] == [m["content"] for m in messages]
    assert sent.tools == () and sent.output_schema is None
    assert "private-value" not in repr(sent)
    call.assert_not_called()
    provider.stream.assert_not_called()
    assert not async_get_runtime(hass).chat_in_progress


@pytest.mark.parametrize(
    "overrides",
    [
        {"messages": []},
        {"messages": [{"role": "system", "content": "bypass"}]},
        {"messages": [{"role": "tool", "content": "bypass"}]},
        {"messages": [{"role": "user", "content": "hi", "tools": []}]},
        {"messages": [{"role": "user", "content": " "}]},
        {"messages": [{"role": "user", "content": "a" * 4001}]},
        {"messages": [{"role": "user", "content": "hi"}] * 23},
        {
            "messages": [
                {"role": "user" if i % 2 == 0 else "assistant", "content": "a" * 4000}
                for i in range(5)
            ]
        },
        {"tools": []},
        {"endpoint": "https://invalid.example"},
        {"streaming": True},
        {"request_id": "not-a-uuid"},
        {"connection_id": "not-a-uuid"},
    ],
)
async def test_invalid_request_never_contacts_provider(hass, hass_ws_client, overrides):
    provider, _ = setup_chat(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(request(**overrides))
    response = await client.receive_json()
    assert response["success"] is False
    provider.generate.assert_not_called()


@pytest.mark.parametrize("eligible", [False, True])
async def test_missing_or_nonlocal_provider_is_unavailable(
    hass, hass_ws_client, eligible
):
    provider, _ = setup_chat(hass, eligible=eligible)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        request(connection_id=SECOND_ID if eligible else CONNECTION_ID)
    )
    response = await client.receive_json()
    assert response["error"]["code"] == "chat_provider_unavailable"
    provider.generate.assert_not_called()


@pytest.mark.parametrize(
    "result",
    [
        None,
        {"text": "looks valid"},
        TextGenerationResult(text=""),
        TextGenerationResult(text="x" * 4001),
        TextGenerationResult(text="😀" * 2001),
        TextGenerationResult(
            text="tool", tool_calls=(ToolCall(id="call", name="turn_on", arguments={}),)
        ),
        TextGenerationResult(text="json", structured_output={"command": "turn_on"}),
    ],
)
async def test_invalid_or_tool_result_is_rejected(hass, hass_ws_client, result):
    provider, _ = setup_chat(hass)
    provider.generate.return_value = result
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(request())
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "chat_invalid_response"


@pytest.mark.parametrize(
    "error,code",
    [
        (RuntimeError("synthetic-private-credential"), "chat_failed"),
        (
            ProviderError(
                NormalizedError(
                    code=ErrorCode.AUTHENTICATION,
                    message="Provider authentication failed.",
                ),
                retry_allowed=False,
                failover_allowed=False,
            ),
            "chat_authentication",
        ),
    ],
)
async def test_errors_are_bounded_and_redacted(hass, hass_ws_client, error, code):
    provider, _ = setup_chat(hass)
    provider.generate.side_effect = error
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(request())
    response = await client.receive_json()
    assert response["error"]["code"] == code
    assert "synthetic-private-credential" not in str(response)
    assert not async_get_runtime(hass).chat_in_progress


async def test_repeated_request_id_does_not_generate_twice(hass, hass_ws_client):
    provider, _ = setup_chat(hass)
    client = await hass_ws_client(hass)
    for _ in range(2):
        await client.send_json_auto_id(request())
        response = await client.receive_json()
    assert response["error"]["code"] == "chat_duplicate_request"
    assert provider.generate.await_count == 1


async def test_inflight_request_rejects_second_user_request(hass, hass_ws_client):
    provider, _ = setup_chat(hass)
    started, release = asyncio.Event(), asyncio.Event()

    async def generate(_request):
        started.set()
        await release.wait()
        return TextGenerationResult(text="done")

    provider.generate.side_effect = generate
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(request())
    await started.wait()
    await client.send_json_auto_id(request(request_id=SECOND_ID))
    response = await client.receive_json()
    assert response["error"]["code"] == "chat_busy"
    release.set()
    assert (await client.receive_json())["success"] is True
    assert provider.generate.await_count == 1


async def test_unload_cancels_and_discards_old_reply(hass, hass_ws_client):
    provider, entry = setup_chat(hass)
    started, cancelled = asyncio.Event(), asyncio.Event()

    async def generate(_request):
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            raise

    provider.generate.side_effect = generate
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(request())
    await started.wait()
    assert await async_unload_entry(hass, entry)
    response = await client.receive_json()
    assert cancelled.is_set()
    assert response["error"]["code"] == "chat_provider_unavailable"
    assert not async_get_runtime(hass).chat_in_progress


async def test_timeout_releases_slot(hass, hass_ws_client):
    provider, _ = setup_chat(hass)

    async def generate(_request):
        await asyncio.Event().wait()

    provider.generate.side_effect = generate
    client = await hass_ws_client(hass)
    with patch.dict(CHAT_LIMITS, timeout_seconds=0.01):
        await client.send_json_auto_id(request())
        response = await client.receive_json()
    assert response["error"]["code"] == "chat_timeout"
    assert not async_get_runtime(hass).chat_in_progress


async def test_global_capacity_prevents_provider_contact(hass, hass_ws_client):
    provider, _ = setup_chat(hass)
    runtime = async_get_runtime(hass)
    for index in range(4):
        runtime.chat_in_progress[f"other-user-{index}"] = None
    client = await hass_ws_client(hass)
    try:
        await client.send_json_auto_id(request())
        response = await client.receive_json()
        assert response["error"]["code"] == "chat_busy"
        provider.generate.assert_not_called()
    finally:
        runtime.chat_in_progress.clear()


async def test_replay_storage_is_bounded_and_expired_records_are_pruned(
    hass, hass_ws_client
):
    provider, _ = setup_chat(hass)
    runtime = async_get_runtime(hass)
    for index in range(256):
        runtime.chat_recent_requests[("other-user", str(index))] = float("inf")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(request())
    response = await client.receive_json()
    assert response["error"]["code"] == "chat_busy"
    provider.generate.assert_not_called()
    for key in runtime.chat_recent_requests:
        runtime.chat_recent_requests[key] = 0
    await client.send_json_auto_id(request())
    assert (await client.receive_json())["success"] is True
    assert len(runtime.chat_recent_requests) == 1


async def test_replaced_provider_cannot_return_a_late_reply(hass, hass_ws_client):
    provider, entry = setup_chat(hass)
    started, release = asyncio.Event(), asyncio.Event()

    async def generate(_request):
        started.set()
        await release.wait()
        return TextGenerationResult(text="Old provider reply")

    provider.generate.side_effect = generate
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(request())
    await started.wait()
    entry.runtime_data = None
    release.set()
    response = await client.receive_json()
    assert response["error"]["code"] == "chat_provider_unavailable"
    assert "Old provider reply" not in str(response)
