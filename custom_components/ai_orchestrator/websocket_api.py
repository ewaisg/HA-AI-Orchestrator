"""Authenticated WebSocket API for AI Orchestrator."""

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import (
    STATUS_PHASE,
    STATUS_SCHEMA_VERSION,
    STATUS_WEBSOCKET_TYPE,
    WORKFLOW_PROBE_WEBSOCKET_TYPE,
)
from .runtime import async_get_runtime, is_foundation_loaded
from .workflow_probe import WorkflowProbeInvariantError, async_run_workflow_probe

WORKFLOW_PROBE_INVARIANT_FAILED = "workflow_probe_invariant_failed"
WORKFLOW_PROBE_NOT_LOADED = "workflow_probe_not_loaded"


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(vol.Schema({vol.Required("type"): STATUS_WEBSOCKET_TYPE}))
)
@callback
def websocket_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the bounded foundation status for an administrator."""
    connection.send_result(
        msg["id"],
        {
            "schema_version": STATUS_SCHEMA_VERSION,
            "phase": STATUS_PHASE,
            "configured": is_foundation_loaded(hass),
            "features": {
                "providers": False,
                "workflows": False,
                "conversation": False,
                "ai_task": False,
            },
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(vol.Schema({vol.Required("type"): WORKFLOW_PROBE_WEBSOCKET_TYPE}))
)
@callback
def websocket_run_workflow_probe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Run the bounded internal workflow lifecycle probe for an administrator."""
    runtime = async_get_runtime(hass)
    if runtime.workflow_probe_unsubscribe is None:
        connection.send_error(
            msg["id"],
            WORKFLOW_PROBE_NOT_LOADED,
            "The foundation workflow lifecycle probe is not loaded.",
        )
        return

    try:
        result = async_run_workflow_probe(hass, context=connection.context(msg))
    except WorkflowProbeInvariantError:
        connection.send_error(
            msg["id"],
            WORKFLOW_PROBE_INVARIANT_FAILED,
            "The workflow lifecycle probe did not execute exactly once.",
        )
        return

    connection.send_result(msg["id"], result)


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register integration-wide WebSocket commands once during setup."""
    websocket_api.async_register_command(hass, websocket_status)
    websocket_api.async_register_command(hass, websocket_run_workflow_probe)
