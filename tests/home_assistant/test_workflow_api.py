"""Stored-workflow WebSocket commands over actual HA transport."""

import json
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.components.websocket_api import ERR_UNAUTHORIZED

from custom_components.ai_orchestrator.const import (
    WORKFLOW_DELETE_WEBSOCKET_TYPE,
    WORKFLOW_LIST_WEBSOCKET_TYPE,
    WORKFLOW_RUN_MANUAL_WEBSOCKET_TYPE,
    WORKFLOW_SAVE_WEBSOCKET_TYPE,
    WORKFLOW_SET_ENABLED_WEBSOCKET_TYPE,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.websocket_api import (
    async_register_websocket_commands,
)
from custom_components.ai_orchestrator.workflow_manager import WorkflowManager
from custom_components.ai_orchestrator.workflow_preview_api import (
    MAX_PREVIEW_JSON_CHARS,
)
from custom_components.ai_orchestrator.workflow_store import STORAGE_KEY

WORKFLOW_ID = "12345678-1234-4123-8123-123456789abc"
MARKER = "private-household-marker"

DRAFT = {
    "schema_version": 1,
    "workflow_id": WORKFLOW_ID,
    "name": MARKER,
    "enabled": True,
    "triggers": [{"kind": "manual"}],
    "conditions": [],
    "steps": [{"step_id": "compose", "kind": "ai_compose", "prompt": MARKER}],
}

COMMANDS = [
    {"type": WORKFLOW_LIST_WEBSOCKET_TYPE},
    {"type": WORKFLOW_SAVE_WEBSOCKET_TYPE, "workflow_json": json.dumps(DRAFT)},
    {"type": WORKFLOW_DELETE_WEBSOCKET_TYPE, "workflow_id": WORKFLOW_ID},
    {
        "type": WORKFLOW_SET_ENABLED_WEBSOCKET_TYPE,
        "workflow_id": WORKFLOW_ID,
        "enabled": False,
    },
    {"type": WORKFLOW_RUN_MANUAL_WEBSOCKET_TYPE, "workflow_id": WORKFLOW_ID},
]


async def setup(hass):
    async_register_websocket_commands(hass)
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic-foundation")
    runtime.workflow_manager = WorkflowManager(hass)
    await runtime.workflow_manager.async_start()


async def call(client, message):
    await client.send_json_auto_id(message)
    return await client.receive_json()


async def test_save_list_run_delete_round_trip_without_side_effects(
    hass, hass_ws_client, hass_storage
):
    await setup(hass)
    client = await hass_ws_client(hass)
    with (
        patch.object(
            type(hass.services), "async_call", new_callable=AsyncMock
        ) as action,
        patch(
            "custom_components.ai_orchestrator.providers.lm_studio."
            "LMStudioProvider.generate",
            new_callable=AsyncMock,
        ) as generate,
    ):
        empty = await call(client, COMMANDS[0])
        assert empty["result"] == {
            "schema_version": 1,
            "store": "ready",
            "workflows": [],
        }

        saved = await call(client, COMMANDS[1])
        assert saved["success"] is True
        document = saved["result"]["workflow"]
        assert document["workflow_id"] == WORKFLOW_ID
        assert document["enabled"] is True
        assert hass_storage[STORAGE_KEY]["data"] == {"workflows": [document]}
        assert saved["result"]["workflows"][0]["status"]["active"] is True
        assert saved["result"]["workflows"][0]["status"]["error"] is None

        ran = await call(client, COMMANDS[4])
        assert ran["success"] is True
        assert ran["result"]["mode"] == "observation_only"
        assert ran["result"]["eligible"] is True
        assert ran["result"]["provider_calls"] == 0
        assert ran["result"]["actions_executed"] == 0
        assert MARKER not in json.dumps(ran["result"])

        listed = await call(client, COMMANDS[0])
        status = listed["result"]["workflows"][0]["status"]
        assert status["observations"] == 1
        assert status["latest"]["eligible"] is True
        assert MARKER not in json.dumps(status)

        disabled = await call(client, COMMANDS[3])
        assert disabled["result"]["workflow"]["enabled"] is False
        assert disabled["result"]["workflows"][0]["status"]["active"] is False
        inactive = await call(client, COMMANDS[4])
        assert inactive["success"] is False
        assert inactive["error"]["code"] == "workflow_not_active"

        deleted = await call(client, COMMANDS[2])
        assert deleted["result"] == {
            "schema_version": 1,
            "store": "ready",
            "workflows": [],
        }
        assert hass_storage[STORAGE_KEY]["data"] == {"workflows": []}
        missing = await call(client, COMMANDS[2])
        assert missing["error"]["code"] == "workflow_not_found"
    action.assert_not_called()
    generate.assert_not_called()


@pytest.mark.parametrize(
    "payload",
    [
        '{"sensitive-marker":',
        '{"schema_version":1,"schema_version":2}',
        '{"value":NaN}',
        " " * (MAX_PREVIEW_JSON_CHARS + 1),
    ],
    ids=["syntax", "duplicate", "nan", "size"],
)
async def test_malformed_json_returns_static_error(
    hass, hass_ws_client, hass_storage, payload
):
    await setup(hass)
    client = await hass_ws_client(hass)
    response = await call(
        client, {"type": WORKFLOW_SAVE_WEBSOCKET_TYPE, "workflow_json": payload}
    )
    assert response["success"] is False
    assert response["error"] == {
        "code": "invalid_workflow",
        "message": "Check the workflow JSON.",
    }
    assert STORAGE_KEY not in hass_storage


async def test_deeply_nested_json_is_rejected_by_the_schema(
    hass, hass_ws_client, hass_storage
):
    await setup(hass)
    client = await hass_ws_client(hass)
    payload = "[" * 2000 + "]" * 2000
    response = await call(
        client, {"type": WORKFLOW_SAVE_WEBSOCKET_TYPE, "workflow_json": payload}
    )
    assert response["success"] is False
    assert response["error"]["code"] == "invalid_workflow"
    assert response["error"]["message"] in {
        "Check the workflow JSON.",
        "workflow must be an object",
    }
    assert STORAGE_KEY not in hass_storage


async def test_schema_failure_names_a_field_but_never_caller_content(
    hass, hass_ws_client, hass_storage
):
    await setup(hass)
    client = await hass_ws_client(hass)
    bad = {**DRAFT, "steps": [{"step_id": "x", "kind": MARKER}]}
    response = await call(
        client, {"type": WORKFLOW_SAVE_WEBSOCKET_TYPE, "workflow_json": json.dumps(bad)}
    )
    assert response["success"] is False
    assert response["error"]["code"] == "invalid_workflow"
    assert response["error"]["message"] == "step.kind is not supported"
    assert MARKER not in json.dumps(response)
    assert STORAGE_KEY not in hass_storage


async def test_set_enabled_validation_and_not_found(hass, hass_ws_client):
    await setup(hass)
    client = await hass_ws_client(hass)
    inert = {**DRAFT, "enabled": False, "steps": []}
    await call(
        client,
        {"type": WORKFLOW_SAVE_WEBSOCKET_TYPE, "workflow_json": json.dumps(inert)},
    )
    response = await call(client, {**COMMANDS[3], "enabled": True})
    assert response["error"]["code"] == "invalid_workflow"
    assert response["error"]["message"] == "an enabled workflow requires a step"
    other = "00000000-0000-4000-8000-000000000000"
    response = await call(client, {**COMMANDS[3], "workflow_id": other})
    assert response["error"]["code"] == "workflow_not_found"


async def test_unreadable_store_is_reported_and_refuses_writes(
    hass, hass_ws_client, hass_storage
):
    hass_storage[STORAGE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": STORAGE_KEY,
        "data": {"workflows": [{"schema_version": 1}]},
    }
    await setup(hass)
    client = await hass_ws_client(hass)
    listed = await call(client, COMMANDS[0])
    assert listed["result"] == {
        "schema_version": 1,
        "store": "unreadable",
        "workflows": [],
    }
    for command in COMMANDS[1:4]:
        response = await call(client, command)
        assert response["success"] is False
        assert response["error"]["code"] == "workflow_store_unavailable"
    assert hass_storage[STORAGE_KEY]["data"] == {"workflows": [{"schema_version": 1}]}


@pytest.mark.parametrize("command", COMMANDS, ids=[c["type"] for c in COMMANDS])
async def test_non_admin_is_rejected(
    hass, hass_ws_client, hass_read_only_access_token, command
):
    await setup(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    response = await call(client, command)
    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED


@pytest.mark.parametrize("command", COMMANDS, ids=[c["type"] for c in COMMANDS])
async def test_commands_require_loaded_foundation(hass, hass_ws_client, command):
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    response = await call(client, command)
    assert response["success"] is False
    assert response["error"]["code"] == "not_loaded"

    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic-foundation")
    response = await call(client, command)
    assert response["error"]["code"] == "not_loaded"  # manager not started


@pytest.mark.parametrize(
    "message",
    [
        {**COMMANDS[0], "extra": True},
        {**COMMANDS[1], "workflow_json": {}},
        {**COMMANDS[2], "workflow_id": "not-a-uuid"},
        {**COMMANDS[3], "enabled": 1},
        {**COMMANDS[4], "workflow_id": WORKFLOW_ID + "x"},
    ],
    ids=["extra", "type", "id", "bool", "length"],
)
async def test_transport_schema_is_closed(hass, hass_ws_client, message):
    await setup(hass)
    client = await hass_ws_client(hass)
    response = await call(client, message)
    assert response["success"] is False
