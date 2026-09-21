"""Model proposals cannot dispatch or enlarge explicit device grants."""

import asyncio
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from homeassistant.components import websocket_api

from custom_components.ai_orchestrator.action_ai_api import (
    async_cancel_action_interpretations,
    websocket_action_interpret,
)
from custom_components.ai_orchestrator.providers.contract import (
    TextGenerationResult,
    ToolCall,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.test_action_manager import setup_actions
from tests.home_assistant.test_chat import CONNECTION_ID

pytestmark = pytest.mark.usefixtures("enable_custom_integrations")


def message():
    return {
        "type": "ai_orchestrator/actions/interpret",
        "connection_id": CONNECTION_ID,
        "request_id": str(uuid4()),
        "expected_revision": 1,
        "prompt": "Turn on the synthetic light",
    }


async def prepare(hass, user):
    manager, entity, service, entry = await setup_actions(hass, user)
    websocket_api.async_register_command(hass, websocket_action_interpret)
    provider = entry.runtime_data.provider
    provider.generate.return_value = TextGenerationResult(
        text="",
        tool_calls=(
            ToolCall(
                id="call1",
                name="light_turn_on_v1",
                arguments={"registry_id": entity.id},
            ),
        ),
    )
    return manager, entity, service, entry, provider


async def test_model_only_proposes_and_sends_only_granted_target_metadata(
    hass, hass_ws_client, hass_admin_user
):
    manager, entity, service, _, provider = await prepare(hass, hass_admin_user)
    hass.states.async_set(entity.entity_id, "off", {"private": "PRIVATE_STATE"})
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message())
    result = await client.receive_json()
    assert result["success"]
    assert result["result"]["tool_id"] == "light_turn_on_v1"
    assert result["result"]["entity_id"] == entity.entity_id
    service.assert_not_called()
    request = provider.generate.call_args.args[0]
    assert len(request.tools) == 1
    assert request.tools[0].name == "light_turn_on_v1"
    assert "PRIVATE_STATE" not in str(request)
    assert not async_get_runtime(hass).action_ai_tasks
    proposal = result["result"]
    await manager.async_confirm(
        CONNECTION_ID, proposal["request_id"], proposal["token"], hass_admin_user.id
    )
    service.assert_called_once()


@pytest.mark.parametrize("bad", ["guessed", "extra", "multiple", "text", "mixed"])
async def test_bad_model_calls_never_issue_token_or_dispatch(
    hass, hass_ws_client, hass_admin_user, bad
):
    manager, entity, service, _, provider = await prepare(hass, hass_admin_user)
    call = ToolCall(
        id="call1",
        name="light_turn_on_v1",
        arguments={
            "registry_id": "guessed" if bad == "guessed" else entity.id,
            **({"brightness": 255} if bad == "extra" else {}),
        },
    )
    provider.generate.return_value = TextGenerationResult(
        text="I executed it" if bad in {"text", "mixed"} else "",
        tool_calls=()
        if bad == "text"
        else (call, ToolCall(id="call2", name=call.name, arguments=call.arguments))
        if bad == "multiple"
        else (call,),
    )
    manager.async_propose = AsyncMock(wraps=manager.async_propose)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message())
    result = await client.receive_json()
    assert not result["success"]
    assert "I executed it" not in str(result)
    service.assert_not_called()


async def test_non_admin_never_contacts_provider(
    hass, hass_ws_client, hass_admin_user, hass_read_only_access_token
):
    _, _, service, _, provider = await prepare(hass, hass_admin_user)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id(message())
    assert not (await client.receive_json())["success"]
    provider.generate.assert_not_called()
    service.assert_not_called()


async def test_permission_revoke_during_generation_denies_proposal(
    hass, hass_ws_client, hass_admin_user
):
    manager, _, service, _, provider = await prepare(hass, hass_admin_user)

    async def generate(request):
        await manager.async_save(CONNECTION_ID, [], 1, hass_admin_user.id)
        return provider.generate.return_value

    provider.generate.side_effect = generate
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message())
    assert not (await client.receive_json())["success"]
    service.assert_not_called()


async def test_busy_and_provider_cancel_keep_no_action_effect(
    hass, hass_ws_client, hass_admin_user
):
    _, _, service, entry, provider = await prepare(hass, hass_admin_user)
    started = asyncio.Event()

    async def generate(request):
        started.set()
        await asyncio.Event().wait()

    provider.generate.side_effect = generate
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message())
    await started.wait()
    await client.send_json_auto_id(message())
    assert (await client.receive_json())["error"]["code"] == "busy"
    async_cancel_action_interpretations(hass, entry.entry_id)
    assert (await client.receive_json())["error"]["code"] == "cancelled"
    assert not async_get_runtime(hass).action_ai_tasks
    service.assert_not_called()


async def test_suppressed_timeout_cannot_create_approval(
    hass, hass_ws_client, hass_admin_user
):
    manager, _, service, _, provider = await prepare(hass, hass_admin_user)

    async def delayed(request):
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            return provider.generate.return_value

    provider.generate.side_effect = delayed
    manager.async_propose = AsyncMock(wraps=manager.async_propose)
    client = await hass_ws_client(hass)
    with patch("custom_components.ai_orchestrator.action_ai_api.TIMEOUT_SECONDS", 0.01):
        await client.send_json_auto_id(message())
        assert not (await client.receive_json())["success"]
    manager.async_propose.assert_not_called()
    service.assert_not_called()


async def test_provider_replaced_during_proposal_revokes_new_token(
    hass, hass_ws_client, hass_admin_user
):
    manager, _, service, entry, _ = await prepare(hass, hass_admin_user)
    original = manager.async_propose

    async def changed(*args, **kwargs):
        proposal = await original(*args, **kwargs)
        entry.runtime_data = None
        return proposal

    manager.async_propose = changed
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message())
    assert not (await client.receive_json())["success"]
    assert not manager._pending
    service.assert_not_called()
