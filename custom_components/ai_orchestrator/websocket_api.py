"""Authenticated WebSocket API for AI Orchestrator."""

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import (
    CATALOG_SCHEMA_VERSION,
    CATALOG_WEBSOCKET_TYPE,
    DOMAIN,
    PROVIDER_LIST_WEBSOCKET_TYPE,
    PROVIDER_TEST_WEBSOCKET_TYPE,
    STATUS_PHASE,
    STATUS_SCHEMA_VERSION,
    STATUS_WEBSOCKET_TYPE,
    WORKFLOW_PROBE_WEBSOCKET_TYPE,
)
from .provider_entry import (
    CONF_CONNECTION_ID,
    LoadedProviderConnection,
)
from .providers.contract import (
    ProviderError,
    safe_provider_error_code,
)
from .runtime import async_get_runtime, is_foundation_loaded
from .workflow_probe import WorkflowProbeInvariantError, async_run_workflow_probe

WORKFLOW_PROBE_INVARIANT_FAILED = "workflow_probe_invariant_failed"
WORKFLOW_PROBE_NOT_LOADED = "workflow_probe_not_loaded"
PROVIDER_NOT_FOUND = "provider_not_found"
PROVIDER_TEST_IN_PROGRESS = "provider_test_in_progress"
PROVIDER_RESPONSE_SCHEMA_VERSION = 1

PROVIDER_HEALTH_HEALTHY = "healthy"
PROVIDER_HEALTH_UNAVAILABLE = "unavailable"
PROVIDER_HEALTH_AUTHENTICATION_REQUIRED = "authentication_required"


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(vol.Schema({vol.Required("type"): CATALOG_WEBSOCKET_TYPE}))
)
@callback
def websocket_catalog(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return read-only registry identity metadata for the administrator panel."""
    areas = ar.async_get(hass)
    devices = dr.async_get(hass)
    entities = er.async_get(hass)
    connection.send_result(
        msg["id"],
        {
            "schema_version": CATALOG_SCHEMA_VERSION,
            "areas": [
                {"area_id": area.id, "name": area.name}
                for area in sorted(areas.async_entries(), key=lambda item: item.id)
            ],
            "devices": [
                {
                    "device_id": device.id,
                    "name": device.name_by_user or device.name or device.id,
                    "area_id": device.area_id,
                }
                for device in sorted(devices.devices.values(), key=lambda item: item.id)
            ],
            "entities": [
                {
                    "entity_id": entity.entity_id,
                    "name": entity.name or entity.original_name or entity.entity_id,
                    "area_id": entity.area_id,
                    "device_id": entity.device_id,
                    "disabled": entity.disabled_by is not None,
                }
                for entity in sorted(
                    entities.entities.values(), key=lambda item: item.entity_id
                )
            ],
        },
    )


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
    runtime = async_get_runtime(hass)
    connection.send_result(
        msg["id"],
        {
            "schema_version": STATUS_SCHEMA_VERSION,
            "phase": STATUS_PHASE,
            "configured": is_foundation_loaded(hass),
            "features": {
                "providers": bool(runtime.loaded_provider_entry_ids),
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


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(vol.Schema({vol.Required("type"): PROVIDER_LIST_WEBSOCKET_TYPE}))
)
@callback
def websocket_provider_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all configured provider connections for an administrator."""
    runtime = async_get_runtime(hass)
    providers: list[dict[str, object]] = []
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.entry_id not in runtime.loaded_provider_entry_ids:
            continue
        loaded: LoadedProviderConnection | None = getattr(entry, "runtime_data", None)
        if not isinstance(loaded, LoadedProviderConnection):
            continue
        adapter = runtime.provider_entry_adapters.get(loaded.provider_type)
        providers.append(
            {
                "connection_id": loaded.connection_id,
                "provider_type": loaded.provider_type,
                "display_name": (
                    adapter.display_name if adapter else loaded.provider_type
                ),
                "title": entry.title,
                "health": PROVIDER_HEALTH_HEALTHY,
            }
        )
    connection.send_result(
        msg["id"],
        {
            "schema_version": PROVIDER_RESPONSE_SCHEMA_VERSION,
            "providers": providers,
        },
    )


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): PROVIDER_TEST_WEBSOCKET_TYPE,
                vol.Required(CONF_CONNECTION_ID): str,
            }
        )
    )
)
async def websocket_provider_test(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Run a connection test against one loaded provider for an administrator."""
    runtime = async_get_runtime(hass)
    connection_id = msg[CONF_CONNECTION_ID]
    loaded: LoadedProviderConnection | None = None
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.entry_id not in runtime.loaded_provider_entry_ids:
            continue
        candidate: LoadedProviderConnection | None = getattr(
            entry, "runtime_data", None
        )
        if (
            isinstance(candidate, LoadedProviderConnection)
            and candidate.connection_id == connection_id
        ):
            loaded = candidate
            break
    if loaded is None:
        connection.send_error(
            msg["id"], PROVIDER_NOT_FOUND, "Provider connection not found."
        )
        return
    in_progress = runtime.provider_test_in_progress_connection_ids
    if connection_id in in_progress:
        connection.send_error(
            msg["id"],
            PROVIDER_TEST_IN_PROGRESS,
            "A connection test is already running for this provider.",
        )
        return

    in_progress.add(connection_id)
    try:
        try:
            await loaded.provider.validate_connection()
            connection.send_result(
                msg["id"],
                {
                    "schema_version": PROVIDER_RESPONSE_SCHEMA_VERSION,
                    "connection_id": connection_id,
                    "health": PROVIDER_HEALTH_HEALTHY,
                    "error_code": None,
                },
            )
        except ProviderError as err:
            code = safe_provider_error_code(err)
            connection.send_result(
                msg["id"],
                {
                    "schema_version": PROVIDER_RESPONSE_SCHEMA_VERSION,
                    "connection_id": connection_id,
                    "health": (
                        PROVIDER_HEALTH_AUTHENTICATION_REQUIRED
                        if code is not None and code.value == "authentication"
                        else PROVIDER_HEALTH_UNAVAILABLE
                    ),
                    "error_code": code.value if code else "unknown",
                },
            )
        except Exception:  # noqa: BLE001 -- adapter details stay backend-only.
            connection.send_result(
                msg["id"],
                {
                    "schema_version": PROVIDER_RESPONSE_SCHEMA_VERSION,
                    "connection_id": connection_id,
                    "health": PROVIDER_HEALTH_UNAVAILABLE,
                    "error_code": "unknown",
                },
            )
    finally:
        in_progress.discard(connection_id)


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register integration-wide WebSocket commands once during setup."""
    websocket_api.async_register_command(hass, websocket_status)
    websocket_api.async_register_command(hass, websocket_run_workflow_probe)
    websocket_api.async_register_command(hass, websocket_catalog)
    websocket_api.async_register_command(hass, websocket_provider_list)
    websocket_api.async_register_command(hass, websocket_provider_test)
