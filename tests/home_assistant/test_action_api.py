"""Admin transport boundary and exact argument forwarding for action controls."""

from unittest.mock import AsyncMock, Mock

import pytest
from homeassistant.components import websocket_api

from custom_components.ai_orchestrator.action_api import (
    websocket_action_catalog,
    websocket_action_confirm,
    websocket_action_propose,
    websocket_action_save,
)
from custom_components.ai_orchestrator.agent_store import (
    AgentPolicyError,
    AgentRevisionError,
    AgentStoreError,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.test_conversation_entity import CONNECTION_ID

COMMANDS = [
    ("catalog", websocket_action_catalog, {}),
    ("save", websocket_action_save, {"expected_revision": 0, "action_scopes": []}),
    (
        "propose",
        websocket_action_propose,
        {
            "expected_revision": 1,
            "request_id": CONNECTION_ID,
            "tool_id": "light_turn_on_v1",
            "registry_id": "synthetic",
            "arguments": {},
        },
    ),
    (
        "confirm",
        websocket_action_confirm,
        {"request_id": CONNECTION_ID, "token": "synthetic"},
    ),
]


@pytest.mark.parametrize("name,handler,extra", COMMANDS)
async def test_nonadmin_denied_before_manager(
    hass, hass_ws_client, hass_read_only_access_token, name, handler, extra
):
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("test")
    runtime.action_manager = AsyncMock()
    websocket_api.async_register_command(hass, handler)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json(
        {
            "id": 1,
            "type": f"ai_orchestrator/actions/{name}",
            "connection_id": CONNECTION_ID,
            **extra,
        }
    )
    result = await client.receive_json()
    assert not result["success"]
    assert result["error"]["code"] == "unauthorized"
    assert not runtime.action_manager.mock_calls


@pytest.mark.parametrize("name,handler,extra", COMMANDS)
async def test_admin_current_user_forwarded(
    hass, hass_ws_client, hass_admin_user, name, handler, extra
):
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("test")
    runtime.action_manager = AsyncMock()
    method = getattr(runtime.action_manager, f"async_{name}")
    method.return_value = {"schema_version": 1}
    websocket_api.async_register_command(hass, handler)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": f"ai_orchestrator/actions/{name}",
            "connection_id": CONNECTION_ID,
            **extra,
        }
    )
    result = await client.receive_json()
    assert result["success"]
    assert method.call_args.args[-1] == hass_admin_user.id


@pytest.mark.parametrize(
    "error,code",
    [
        (AgentPolicyError("private-canary"), "not_authorized"),
        (AgentRevisionError("private-canary"), "revision_conflict"),
        (AgentStoreError("private-canary"), "not_loaded"),
    ],
)
@pytest.mark.parametrize("name,handler,extra", COMMANDS)
async def test_static_redacted_errors(
    hass, hass_ws_client, hass_admin_user, error, code, name, handler, extra
):
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("test")
    runtime.action_manager = Mock(**{f"async_{name}": AsyncMock(side_effect=error)})
    websocket_api.async_register_command(hass, handler)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": f"ai_orchestrator/actions/{name}",
            "connection_id": CONNECTION_ID,
            **extra,
        }
    )
    result = await client.receive_json()
    assert result["error"]["code"] == code
    assert "private-canary" not in str(result)


async def test_unloaded_and_unknown_fields_denied(
    hass, hass_ws_client, hass_admin_user
):
    websocket_api.async_register_command(hass, websocket_action_catalog)
    client = await hass_ws_client(hass)
    base = {"type": "ai_orchestrator/actions/catalog", "connection_id": CONNECTION_ID}
    await client.send_json({"id": 1, **base})
    assert (await client.receive_json())["error"]["code"] == "not_loaded"
    await client.send_json({"id": 2, **base, "user_id": "impersonated"})
    assert (await client.receive_json())["error"]["code"] == "invalid_format"
