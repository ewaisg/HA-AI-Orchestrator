"""Deny-by-default, state-only observation using existing HA authorization."""

import math

from homeassistant.auth.permissions.const import POLICY_READ
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .agent_store import AgentPolicyError, AgentStore
from .chat import _local_connections
from .runtime import async_get_runtime, is_foundation_loaded

OBSERVATION_DOMAINS = frozenset({"sensor", "binary_sensor", "light", "switch", "fan"})
# Conservative initial product limits, not Home Assistant risk classifications.
EXCLUDED_DEVICE_CLASSES = frozenset(
    {
        "smoke",
        "carbon_monoxide",
        "gas",
        "safety",
        "tamper",
        "problem",
        "presence",
        "occupancy",
        "motion",
        "timestamp",
        "date",
        "enum",
    }
)


@callback
def require_local_connection(hass: HomeAssistant, connection_id: str) -> None:
    """Reject stale, unloaded, and non-local providers."""
    if not any(
        loaded.connection_id == connection_id for _, loaded in _local_connections(hass)
    ):
        raise AgentPolicyError("Local provider is unavailable")


@callback
def resolve_observation(hass: HomeAssistant, registry_id: str) -> str:
    """Resolve only an existing enabled stable registry entry in allowed domains."""
    entry = er.async_get(hass).async_get(registry_id)
    if (
        entry is None
        or entry.id != registry_id
        or entry.disabled
        or entry.domain not in OBSERVATION_DOMAINS
    ):
        raise AgentPolicyError("Observation target is unavailable")
    device = dr.async_get(hass).async_get(entry.device_id) if entry.device_id else None
    if device is not None and device.disabled:
        raise AgentPolicyError("Observation target is unavailable")
    state = hass.states.get(entry.entity_id)
    if (
        entry.device_class in EXCLUDED_DEVICE_CLASSES
        or entry.original_device_class in EXCLUDED_DEVICE_CLASSES
        or (
            state is not None
            and state.attributes.get("device_class") in EXCLUDED_DEVICE_CLASSES
        )
    ):
        raise AgentPolicyError("Observation target is unavailable")
    return entry.entity_id


async def async_read_scoped_state(
    hass: HomeAssistant,
    store: AgentStore,
    connection_id: str,
    expected_revision: int,
    registry_id: str,
    user_id: str | None,
) -> dict[str, str]:
    """Recheck current policy and HA user permissions before returning state only."""
    if not user_id:
        raise AgentPolicyError("Observation is not authorized")
    user = await hass.auth.async_get_user(user_id)
    # All checks after the await ensure a concurrent revoke or unload wins.
    if (
        not is_foundation_loaded(hass)
        or async_get_runtime(hass).agent_store is not store
    ):
        raise AgentPolicyError("Observation is not authorized")
    require_local_connection(hass, connection_id)
    profile = store.get(connection_id)
    if (
        type(expected_revision) is not int
        or profile["revision"] != expected_revision
        or registry_id not in profile["observe_registry_ids"]
    ):
        raise AgentPolicyError("Observation is not authorized")
    entity_id = resolve_observation(hass, registry_id)
    if (
        user is None
        or not user.is_active
        or not user.permissions.check_entity(entity_id, POLICY_READ)
    ):
        raise AgentPolicyError("Observation is not authorized")
    state = hass.states.get(entity_id)
    if state is None or state.state in {"unknown", "unavailable"}:
        raise AgentPolicyError("Observation state is unavailable")
    if entity_id.startswith("sensor."):
        try:
            valid = len(state.state) <= 64 and math.isfinite(float(state.state))
        except ValueError:
            valid = False
    else:
        valid = state.state in {"on", "off"}
    if not valid:
        raise AgentPolicyError("Observation state is unavailable")
    return {"entity_id": entity_id, "state": state.state}
