"""Authenticated WebSocket API for AI Orchestrator."""

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import (
    STATUS_PHASE,
    STATUS_SCHEMA_VERSION,
    STATUS_WEBSOCKET_TYPE,
)
from .runtime import is_foundation_loaded


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


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register integration-wide WebSocket commands once during setup."""
    websocket_api.async_register_command(hass, websocket_status)
