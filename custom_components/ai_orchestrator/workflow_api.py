"""Admin-only WebSocket commands for stored workflows (WFL-002).

Every command requires an administrator and a loaded foundation. Results carry
the administrator's own stored documents plus redacted observer status. No
command executes a step, calls a provider, or performs a Home Assistant action.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import (
    WORKFLOW_DELETE_WEBSOCKET_TYPE,
    WORKFLOW_LIST_WEBSOCKET_TYPE,
    WORKFLOW_RUN_MANUAL_WEBSOCKET_TYPE,
    WORKFLOW_SAVE_WEBSOCKET_TYPE,
    WORKFLOW_SET_ENABLED_WEBSOCKET_TYPE,
)
from .runtime import async_get_runtime, is_foundation_loaded
from .workflow_manager import WorkflowManager, WorkflowManagerError
from .workflow_preview_api import load_bounded_json
from .workflow_schema import WorkflowValidationError
from .workflow_store import WorkflowNotFoundError, WorkflowStoreError

WORKFLOW_RESPONSE_SCHEMA_VERSION = 1

ERR_NOT_LOADED = "not_loaded"
ERR_INVALID_WORKFLOW = "invalid_workflow"
ERR_STORE_UNAVAILABLE = "workflow_store_unavailable"
ERR_NOT_FOUND = "workflow_not_found"
ERR_NOT_ACTIVE = "workflow_not_active"

_WORKFLOW_ID = vol.All(str, vol.Length(min=36, max=36), vol.Match(r"^[0-9a-f-]{36}$"))


@callback
def _manager(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg_id: int
) -> WorkflowManager | None:
    manager = async_get_runtime(hass).workflow_manager
    if not is_foundation_loaded(hass) or manager is None or not manager.started:
        connection.send_error(msg_id, ERR_NOT_LOADED, "The foundation is not loaded.")
        return None
    return manager


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(vol.Schema({vol.Required("type"): WORKFLOW_LIST_WEBSOCKET_TYPE}))
)
@callback
def websocket_workflow_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return stored workflows with redacted live status."""
    manager = _manager(hass, connection, msg["id"])
    if manager is None:
        return
    connection.send_result(
        msg["id"],
        {"schema_version": WORKFLOW_RESPONSE_SCHEMA_VERSION, **manager.status()},
    )


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): WORKFLOW_SAVE_WEBSOCKET_TYPE,
                vol.Required("workflow_json"): str,
            }
        )
    )
)
async def websocket_workflow_save(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Validate, persist, and apply one workflow document."""
    manager = _manager(hass, connection, msg["id"])
    if manager is None:
        return
    try:
        raw = load_bounded_json(msg["workflow_json"])
    except ValueError, RecursionError:
        connection.send_error(
            msg["id"], ERR_INVALID_WORKFLOW, "Check the workflow JSON."
        )
        return
    try:
        document = await manager.async_save(raw)
    except WorkflowValidationError as err:
        # The schema's messages name a field only, never caller content.
        connection.send_error(msg["id"], ERR_INVALID_WORKFLOW, str(err))
        return
    except WorkflowManagerError, WorkflowStoreError:
        connection.send_error(
            msg["id"], ERR_STORE_UNAVAILABLE, "Workflow storage is unavailable."
        )
        return
    connection.send_result(
        msg["id"],
        {
            "schema_version": WORKFLOW_RESPONSE_SCHEMA_VERSION,
            "workflow": document,
            **manager.status(),
        },
    )


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): WORKFLOW_DELETE_WEBSOCKET_TYPE,
                vol.Required("workflow_id"): _WORKFLOW_ID,
            }
        )
    )
)
async def websocket_workflow_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Deactivate and remove one workflow."""
    manager = _manager(hass, connection, msg["id"])
    if manager is None:
        return
    try:
        existed = await manager.async_delete(msg["workflow_id"])
    except WorkflowManagerError, WorkflowStoreError:
        connection.send_error(
            msg["id"], ERR_STORE_UNAVAILABLE, "Workflow storage is unavailable."
        )
        return
    if not existed:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "Workflow not found.")
        return
    connection.send_result(
        msg["id"],
        {"schema_version": WORKFLOW_RESPONSE_SCHEMA_VERSION, **manager.status()},
    )


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): WORKFLOW_SET_ENABLED_WEBSOCKET_TYPE,
                vol.Required("workflow_id"): _WORKFLOW_ID,
                vol.Required("enabled"): bool,
            }
        )
    )
)
async def websocket_workflow_set_enabled(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Enable or disable one stored workflow."""
    manager = _manager(hass, connection, msg["id"])
    if manager is None:
        return
    try:
        document = await manager.async_set_enabled(msg["workflow_id"], msg["enabled"])
    except WorkflowValidationError as err:
        connection.send_error(msg["id"], ERR_INVALID_WORKFLOW, str(err))
        return
    except WorkflowNotFoundError:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "Workflow not found.")
        return
    except WorkflowManagerError, WorkflowStoreError:
        connection.send_error(
            msg["id"], ERR_STORE_UNAVAILABLE, "Workflow storage is unavailable."
        )
        return
    connection.send_result(
        msg["id"],
        {
            "schema_version": WORKFLOW_RESPONSE_SCHEMA_VERSION,
            "workflow": document,
            **manager.status(),
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): WORKFLOW_RUN_MANUAL_WEBSOCKET_TYPE,
                vol.Required("workflow_id"): _WORKFLOW_ID,
            }
        )
    )
)
@callback
def websocket_workflow_run_manual(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Record one manual observation for an active workflow; nothing executes."""
    manager = _manager(hass, connection, msg["id"])
    if manager is None:
        return
    try:
        result = manager.run_manual(msg["workflow_id"])
    except WorkflowManagerError:
        connection.send_error(msg["id"], ERR_NOT_ACTIVE, "The workflow is not active.")
        return
    connection.send_result(
        msg["id"], {"schema_version": WORKFLOW_RESPONSE_SCHEMA_VERSION, **result}
    )
