"""Admin-only discovery of notification targets from real Home Assistant registries."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import NOTIFY_TARGETS_WEBSOCKET_TYPE
from .runtime import is_foundation_loaded
from .workflow_notify import async_list_notify_targets

NOTIFY_TARGETS_SCHEMA_VERSION = 1


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(vol.Schema({vol.Required("type"): NOTIFY_TARGETS_WEBSOCKET_TYPE}))
)
@callback
def websocket_notify_targets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List notify entities and legacy notify services a step may reference."""
    if not is_foundation_loaded(hass):
        connection.send_error(msg["id"], "not_loaded", "The foundation is not loaded.")
        return
    connection.send_result(
        msg["id"],
        {
            "schema_version": NOTIFY_TARGETS_SCHEMA_VERSION,
            "targets": async_list_notify_targets(hass),
        },
    )
