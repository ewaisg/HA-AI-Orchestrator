"""Tests for the bounded AI Orchestrator WebSocket API."""

import json
from unittest.mock import AsyncMock, patch

from homeassistant.components.websocket_api import ERR_UNAUTHORIZED
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from custom_components.ai_orchestrator import async_setup_entry
from custom_components.ai_orchestrator.const import (
    DOMAIN,
    FOUNDATION_ENTRY_UNIQUE_ID,
    STATUS_WEBSOCKET_TYPE,
    WORKFLOW_PROBE_WEBSOCKET_TYPE,
)
from custom_components.ai_orchestrator.websocket_api import (
    WORKFLOW_PROBE_INVARIANT_FAILED,
    WORKFLOW_PROBE_NOT_LOADED,
    async_register_websocket_commands,
)
from custom_components.ai_orchestrator.workflow_probe import (
    WorkflowProbeInvariantError,
    async_setup_workflow_probe,
)


def _expected_status(*, configured: bool) -> dict:
    return {
        "schema_version": 1,
        "phase": "foundation",
        "configured": configured,
        "features": {
            "providers": False,
            "workflows": False,
            "conversation": False,
            "ai_task": False,
        },
    }


async def test_admin_status_has_exact_secret_free_contract(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An administrator receives only the agreed foundation status fields."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == _expected_status(configured=False)

    canary = "synthetic-secret-canary-must-not-leak"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"credential": canary},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == _expected_status(configured=False)
    assert canary not in json.dumps(response)

    with patch(
        "custom_components.ai_orchestrator.async_register_panel",
        new_callable=AsyncMock,
        return_value=False,
    ):
        assert await async_setup_entry(hass, entry)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == _expected_status(configured=True)
    assert canary not in json.dumps(response)


async def test_non_admin_status_is_unauthorized(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    """A non-admin user cannot call the status command."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED


async def test_status_schema_rejects_additional_fields(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The request schema accepts only the message type and protocol id."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {"type": STATUS_WEBSOCKET_TYPE, "unexpected": "value"}
    )
    response = await client.receive_json()

    assert response["success"] is False


async def test_admin_workflow_probe_has_exact_no_side_effect_contract(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An administrator can run only the bounded internal lifecycle probe."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": WORKFLOW_PROBE_WEBSOCKET_TYPE})
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == WORKFLOW_PROBE_NOT_LOADED

    async_setup_workflow_probe(hass)
    await client.send_json_auto_id({"type": WORKFLOW_PROBE_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == {
        "schema_version": 1,
        "workflow_id": "foundation_lifecycle_probe",
        "trigger_type": "integration_event",
        "execution_count": 1,
        "executions_for_trigger": 1,
        "registration_count": 1,
        "provider_contacted": False,
        "home_assistant_action_called": False,
    }


async def test_non_admin_workflow_probe_is_unauthorized(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    """A non-admin cannot run even the harmless lifecycle probe."""
    async_register_websocket_commands(hass)
    async_setup_workflow_probe(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)

    await client.send_json_auto_id({"type": WORKFLOW_PROBE_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED


async def test_workflow_probe_schema_rejects_additional_fields(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The probe command accepts no caller-controlled event data."""
    async_register_websocket_commands(hass)
    async_setup_workflow_probe(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {"type": WORKFLOW_PROBE_WEBSOCKET_TYPE, "event_data": "not-allowed"}
    )
    response = await client.receive_json()

    assert response["success"] is False


async def test_workflow_probe_invariant_failure_is_a_bounded_protocol_error(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """Direct WebSocket clients cannot receive success for duplicate execution."""
    async_register_websocket_commands(hass)
    async_setup_workflow_probe(hass)
    client = await hass_ws_client(hass)

    with patch(
        "custom_components.ai_orchestrator.websocket_api.async_run_workflow_probe",
        side_effect=WorkflowProbeInvariantError,
    ):
        await client.send_json_auto_id({"type": WORKFLOW_PROBE_WEBSOCKET_TYPE})
        response = await client.receive_json()

    assert response["success"] is False
    assert response["error"] == {
        "code": WORKFLOW_PROBE_INVARIANT_FAILED,
        "message": "The workflow lifecycle probe did not execute exactly once.",
    }
