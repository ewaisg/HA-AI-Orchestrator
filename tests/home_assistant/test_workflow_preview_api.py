"""Exercise the authenticated offline preview with actual HA WebSocket transport."""

import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.components.websocket_api import ERR_UNAUTHORIZED

from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.websocket_api import (
    async_register_websocket_commands,
)
from custom_components.ai_orchestrator.workflow_preview_api import (
    MAX_PREVIEW_JSON_CHARS,
    WORKFLOW_PREVIEW_WEBSOCKET_TYPE,
)

FIXTURES = Path(__file__).parents[1] / "fixtures/workflows"


def request(snapshot="evening-open.json"):
    return {
        "type": WORKFLOW_PREVIEW_WEBSOCKET_TYPE,
        "workflow_json": (FIXTURES / "window-preview.json").read_text(),
        "snapshot_json": (FIXTURES / snapshot).read_text(),
    }


def setup(hass):
    async_register_websocket_commands(hass)
    async_get_runtime(hass).loaded_foundation_entry_ids.add("synthetic-foundation")


@pytest.mark.parametrize(
    ("snapshot", "eligible"),
    [("evening-open.json", True), ("daytime-open.json", False)],
)
async def test_admin_preview_is_redacted_and_has_no_side_effects(
    hass, hass_ws_client, snapshot, eligible
):
    setup(hass)
    client = await hass_ws_client(hass)
    with (
        patch.object(
            type(hass.services), "async_call", new_callable=AsyncMock
        ) as action,
        patch(
            "custom_components.ai_orchestrator.providers.lm_studio.LMStudioProvider.generate",
            new_callable=AsyncMock,
        ) as generate,
        patch.object(type(hass.states), "get") as state_read,
    ):
        await client.send_json_auto_id(request(snapshot))
        response = await client.receive_json()
    assert response["success"] is True
    result = response["result"]
    assert result["schema_version"] == 1
    assert result["eligible"] is eligible
    assert result["mode"] == "offline"
    assert result["enabled"] is False
    assert result["provider_calls"] == result["actions_executed"] == 0
    assert len(result["planned_steps"]) == (2 if eligible else 0)
    for omitted in ("synthetic_window", "notify.synthetic", "Write a short"):
        assert omitted not in json.dumps(result)
    action.assert_not_called()
    generate.assert_not_called()
    state_read.assert_not_called()


async def test_non_admin_cannot_preview(
    hass, hass_ws_client, hass_read_only_access_token
):
    setup(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id(request())
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED


async def test_preview_requires_loaded_foundation(hass, hass_ws_client):
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(request())
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "not_loaded"


@pytest.mark.parametrize("field", ["workflow_json", "snapshot_json"])
@pytest.mark.parametrize(
    "payload",
    [
        '{"sensitive-marker":',
        '{"schema_version":1,"schema_version":2}',
        '{"value":NaN}',
        "[" * 2000 + "]" * 2000,
        " " * (MAX_PREVIEW_JSON_CHARS + 1),
        '{"sensitive-marker":"private-content"}',
    ],
    ids=["syntax", "duplicate", "nan", "depth", "size", "schema"],
)
async def test_bad_input_returns_static_failure(hass, hass_ws_client, field, payload):
    setup(hass)
    client = await hass_ws_client(hass)
    message = request()
    message[field] = payload
    await client.send_json_auto_id(message)
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"] == {
        "code": "invalid_preview",
        "message": "Check the workflow and snapshot JSON.",
    }


@pytest.mark.parametrize(
    "extra", [{"live": True}, {"workflow_json": {}}, {"snapshot_json": 1}]
)
async def test_transport_schema_is_closed(hass, hass_ws_client, extra):
    setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({**request(), **extra})
    response = await client.receive_json()
    assert response["success"] is False


async def test_foundation_unload_stops_preview_availability(hass, hass_ws_client):
    setup(hass)
    client = await hass_ws_client(hass)
    async_get_runtime(hass).loaded_foundation_entry_ids.clear()
    await client.send_json_auto_id(request())
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == "not_loaded"
