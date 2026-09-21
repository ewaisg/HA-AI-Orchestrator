"""Administrator-only explicit observation policy configuration."""

from typing import Any

import voluptuous as vol
from homeassistant.auth.permissions.const import POLICY_READ
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .agent_policy import require_local_connection, resolve_observation
from .agent_store import (
    AgentPolicyError,
    AgentRevisionError,
    AgentStore,
    AgentStoreError,
)
from .chat import _local_connections
from .runtime import async_get_runtime, is_foundation_loaded


def _store(hass: HomeAssistant) -> AgentStore:
    store = getattr(async_get_runtime(hass), "agent_store", None)
    if not is_foundation_loaded(hass) or store is None or not store.loaded:
        raise AgentStoreError("Policy storage is unavailable")
    return store


@websocket_api.require_admin
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/agents/list",
            }
        )
    )
)
@callback
def websocket_agent_list(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """List only metadata for currently loaded local provider profiles."""
    try:
        store = _store(hass)
        profiles = [
            store.get(loaded.connection_id) for _, loaded in _local_connections(hass)
        ]
    except AgentStoreError:
        connection.send_error(msg["id"], "not_loaded", "Policy storage is unavailable.")
        return
    connection.send_result(msg["id"], {"schema_version": 1, "profiles": profiles})


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/agents/save",
                vol.Required("connection_id"): vol.All(str, vol.Length(max=36)),
                vol.Required("expected_revision"): vol.All(int, vol.Range(min=0)),
                vol.Required("observe_registry_ids"): vol.All(
                    [vol.All(str, vol.Length(min=1, max=64))], vol.Length(max=64)
                ),
            }
        )
    )
)
async def websocket_agent_save(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Save an explicit state-only local scope; actions cannot be granted."""
    try:
        store = _store(hass)
        require_local_connection(hass, msg["connection_id"])
        for registry_id in msg["observe_registry_ids"]:
            entity_id = resolve_observation(hass, registry_id)
            if not connection.user.permissions.check_entity(entity_id, POLICY_READ):
                raise AgentPolicyError("Observation is not authorized")
        profile = await store.async_save(
            msg["connection_id"], msg["observe_registry_ids"], msg["expected_revision"]
        )
    except AgentRevisionError:
        connection.send_error(msg["id"], "revision_conflict", "Reload the policy.")
        return
    except AgentPolicyError:
        connection.send_error(
            msg["id"], "invalid_policy", "Check the observation scope."
        )
        return
    except AgentStoreError:
        connection.send_error(msg["id"], "not_loaded", "Policy storage is unavailable.")
        return
    connection.send_result(msg["id"], {"schema_version": 1, "profile": profile})
