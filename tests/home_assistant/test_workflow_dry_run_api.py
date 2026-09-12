"""Dry-run WebSocket command over actual HA transport (WFL-003)."""

import asyncio
import json
from dataclasses import dataclass
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.components.websocket_api import ERR_UNAUTHORIZED
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator.const import (
    DOMAIN,
    WORKFLOW_DRY_RUN_WEBSOCKET_TYPE,
    WORKFLOW_SAVE_WEBSOCKET_TYPE,
)
from custom_components.ai_orchestrator.provider_entry import (
    ChatDestination,
    LoadedProviderConnection,
    async_register_provider_entry_adapter,
    build_provider_entry_data,
    provider_entry_unique_id,
)
from custom_components.ai_orchestrator.providers.contract import (
    ConnectionValidationResult,
    TextGenerationResult,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.websocket_api import (
    async_register_websocket_commands,
)
from custom_components.ai_orchestrator.workflow_manager import WorkflowManager
from tests.home_assistant.provider_fakes import (
    SYNTHETIC_CONFIG_FIELD,
    SYNTHETIC_PROVIDER_TYPE,
    SyntheticProviderEntryAdapter,
)

CONNECTION_ID = "12345678-1234-4234-9234-123456789abc"
WORKFLOW_ID = "12345678-1234-4123-8123-123456789abc"
MARKER = "private-household-marker"
WORKFLOW = {
    "schema_version": 1,
    "workflow_id": WORKFLOW_ID,
    "name": "Window reminder",
    "enabled": False,
    "triggers": [
        {
            "kind": "state",
            "entity_ids": ["binary_sensor.synthetic_window"],
            "to_state": "on",
        }
    ],
    "conditions": [
        {"kind": "state", "entity_id": "binary_sensor.synthetic_window", "state": "on"}
    ],
    "steps": [
        {"step_id": "compose", "kind": "ai_compose", "prompt": "Write a reminder."},
        {"step_id": "notify", "kind": "notify", "notify_service": "notify.synthetic"},
    ],
}
SNAPSHOT = {
    "states": {
        "binary_sensor.synthetic_window": "on",
        "sensor.private_unrelated": MARKER,
    },
    "time": "20:00",
    "event": {
        "kind": "state",
        "entity_id": "binary_sensor.synthetic_window",
        "from_state": "off",
        "to_state": "on",
    },
}


@dataclass
class LocalAdapter(SyntheticProviderEntryAdapter):
    chat_destination: ChatDestination | None = ChatDestination.LOCAL


def dry_run(**overrides):
    message = {
        "type": WORKFLOW_DRY_RUN_WEBSOCKET_TYPE,
        "workflow_id": WORKFLOW_ID,
        "connection_id": CONNECTION_ID,
        "snapshot_json": json.dumps(SNAPSHOT),
    }
    message.update(overrides)
    return message


async def call(client, message):
    await client.send_json_auto_id(message)
    return await client.receive_json()


async def setup(hass: HomeAssistant, *, save=True):
    async_register_provider_entry_adapter(hass, LocalAdapter())
    provider = AsyncMock()
    provider.generate.return_value = TextGenerationResult(text="Close the window.")
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
    runtime = async_get_runtime(hass)
    runtime.loaded_provider_entry_ids.add(entry.entry_id)
    runtime.loaded_foundation_entry_ids.add("synthetic-foundation")
    runtime.workflow_manager = WorkflowManager(hass)
    await runtime.workflow_manager.async_start()
    async_register_websocket_commands(hass)
    if save:
        await runtime.workflow_manager.async_save(WORKFLOW)
    return provider, entry


async def test_dry_run_runs_ai_steps_without_any_action(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await setup(hass)
    client = await hass_ws_client(hass)
    with patch.object(
        type(hass.services), "async_call", new_callable=AsyncMock
    ) as action:
        response = await call(client, dry_run())

    assert response["success"] is True
    result = response["result"]
    assert result["mode"] == "dry_run"
    assert result["eligible"] is True
    assert result["destination"] == "local"
    assert result["provider_calls"] == 1
    assert result["actions_executed"] == 0
    assert result["completed"] is True
    assert result["steps"][0]["text"] == "Close the window."
    assert result["steps"][1] == {
        "index": 1,
        "step_id": "notify",
        "kind": "notify",
        "executed": False,
        "status": "planned",
        "message_step_id": "compose",
        "target": "missing",
    }
    action.assert_not_called()
    request = provider.generate.await_args.args[0]
    prompt = request.messages[1].content
    assert "binary_sensor.synthetic_window: on" in prompt
    assert MARKER not in prompt
    assert "sensor.private_unrelated" not in prompt
    assert async_get_runtime(hass).workflow_dry_runs_in_progress == set()


async def test_ineligible_scenario_makes_no_provider_call(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await setup(hass)
    client = await hass_ws_client(hass)
    daytime = {**SNAPSHOT, "states": {"binary_sensor.synthetic_window": "off"}}
    response = await call(client, dry_run(snapshot_json=json.dumps(daytime)))

    assert response["success"] is True
    assert response["result"]["eligible"] is False
    assert response["result"]["steps"] == []
    assert response["result"]["provider_calls"] == 0
    provider.generate.assert_not_called()


async def test_malformed_model_output_is_a_static_failure(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await setup(hass)
    provider.generate.return_value = TextGenerationResult(
        text=MARKER, structured_output={"leak": MARKER}
    )
    client = await hass_ws_client(hass)
    response = await call(client, dry_run())

    assert response["success"] is True
    step = response["result"]["steps"][0]
    assert step["status"] == "failed"
    assert step["error"] == "invalid_output"
    assert MARKER not in json.dumps(response)
    assert response["result"]["completed"] is False


@pytest.mark.parametrize(
    ("overrides", "code"),
    [
        ({"workflow_id": "12345678-1234-4123-8123-000000000000"}, "workflow_not_found"),
        (
            {"connection_id": "12345678-1234-4234-9234-000000000000"},
            "dry_run_provider_unavailable",
        ),
        ({"snapshot_json": "{not json"}, "invalid_snapshot"),
        (
            {"snapshot_json": json.dumps({"states": {}, "time": "20:00"})},
            "invalid_snapshot",
        ),
        ({"snapshot_json": '{"a": 1, "a": 2}'}, "invalid_snapshot"),
    ],
)
async def test_bounded_errors(hass, hass_ws_client, hass_storage, overrides, code):
    provider, _ = await setup(hass)
    client = await hass_ws_client(hass)
    response = await call(client, dry_run(**overrides))

    assert response["success"] is False
    assert response["error"]["code"] == code
    provider.generate.assert_not_called()


async def test_non_admin_is_rejected(
    hass, hass_ws_client, hass_storage, hass_read_only_access_token
):
    provider, _ = await setup(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    response = await call(client, dry_run())

    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED
    provider.generate.assert_not_called()


async def test_requires_loaded_foundation(hass, hass_ws_client):
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    response = await call(client, dry_run())

    assert response["success"] is False
    assert response["error"]["code"] == "not_loaded"


async def test_second_dry_run_for_same_user_is_refused_while_running(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await setup(hass)
    release = asyncio.Event()

    async def slow(request):
        await release.wait()
        return TextGenerationResult(text="Close the window.")

    provider.generate.side_effect = slow
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(dry_run())
    await asyncio.sleep(0)
    busy = await call(client, dry_run())
    assert busy["success"] is False
    assert busy["error"]["code"] == "dry_run_busy"
    release.set()
    first = await client.receive_json()
    assert first["success"] is True
    assert first["result"]["completed"] is True
    assert provider.generate.await_count == 1


async def test_provider_unloaded_during_run_reports_unavailable(
    hass, hass_ws_client, hass_storage
):
    provider, entry = await setup(hass)
    release = asyncio.Event()

    async def slow(request):
        await release.wait()
        return TextGenerationResult(text="Close the window.")

    provider.generate.side_effect = slow
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(dry_run())
    await asyncio.sleep(0)
    async_get_runtime(hass).loaded_provider_entry_ids.discard(entry.entry_id)
    release.set()
    response = await client.receive_json()

    assert response["success"] is False
    assert response["error"]["code"] == "dry_run_provider_unavailable"


async def test_saved_then_dry_run_round_trip(hass, hass_ws_client, hass_storage):
    _, _ = await setup(hass, save=False)
    client = await hass_ws_client(hass)
    saved = await call(
        client,
        {"type": WORKFLOW_SAVE_WEBSOCKET_TYPE, "workflow_json": json.dumps(WORKFLOW)},
    )
    assert saved["success"] is True
    response = await call(client, dry_run())
    assert response["success"] is True
    assert response["result"]["workflow_id"] == WORKFLOW_ID
