"""Administrator-only bounded content-free execution history."""

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .audit_schema import MAX_SEQUENCE, RETENTION_DAYS, AuditValidationError
from .audit_store import AuditStoreError
from .runtime import async_get_runtime, is_foundation_loaded


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/audit/list",
                vol.Optional("after_sequence", default=0): vol.All(
                    int, vol.Range(min=0, max=MAX_SEQUENCE)
                ),
                vol.Optional("limit", default=100): vol.All(
                    int, vol.Range(min=1, max=100)
                ),
            }
        )
    )
)
async def websocket_audit_list(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Read metadata only; no provider calls or action authority."""
    runtime = async_get_runtime(hass)
    store = runtime.audit_store
    try:
        if not is_foundation_loaded(hass) or store is None or not store.loaded:
            raise AuditStoreError("Audit unavailable")
        if type(msg["after_sequence"]) is not int or type(msg["limit"]) is not int:
            raise AuditValidationError("Invalid audit page")
        await store.async_prune()
        user = await hass.auth.async_get_user(connection.user.id)
        if (
            user is None
            or not user.is_active
            or not user.is_admin
            or not connection.user.is_admin
            or runtime.audit_store is not store
            or not is_foundation_loaded(hass)
        ):
            raise AuditStoreError("Audit unavailable")
        records = store.list(after_sequence=msg["after_sequence"], limit=msg["limit"])
        cursor = records[-1]["sequence"] if records else None
        more = cursor is not None and bool(store.list(after_sequence=cursor, limit=1))
    except AuditStoreError, AuditValidationError:
        connection.send_error(
            msg["id"], "audit_unavailable", "Execution history is unavailable."
        )
        return
    connection.send_result(
        msg["id"],
        {
            "schema_version": 1,
            "retention_days": RETENTION_DAYS,
            "records": records,
            "next_cursor": cursor if more else None,
        },
    )
