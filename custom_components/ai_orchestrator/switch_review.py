"""Explicit ordinary-switch attestations bound to actual HA registry identity.

Metadata cannot establish physical safety. These checks only exclude known unsafe
shapes; an administrator must separately verify the physical connected load.
"""

import hashlib
import json
import re
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .agent_store import AgentPolicyError, observation_ids

SWITCH_TOOLS = frozenset({"switch_turn_on_v1", "switch_turn_off_v1"})
ATTESTATIONS = frozenset(
    {"physical_target_verified", "single_device", "not_security_or_life_safety"}
)
_CRITICAL_DOMAINS = frozenset(
    {
        "lock",
        "alarm_control_panel",
        "siren",
        "cover",
        "climate",
        "water_heater",
        "valve",
    }
)
_CRITICAL_CLASSES = frozenset(
    {
        "smoke",
        "gas",
        "carbon_monoxide",
        "safety",
        "tamper",
        "door",
        "window",
        "garage_door",
        "opening",
    }
)


def reviews(raw: object) -> list[dict[str, Any]]:
    """Validate closed private review records, never infer classification."""
    if type(raw) is not list or len(raw) > 64:
        raise AgentPolicyError("Invalid switch reviews")
    result = []
    seen = set()
    for item in raw:
        try:
            if (
                type(item) is not dict
                or set(item)
                != {
                    "registry_id",
                    "classification",
                    "review_id",
                    "reviewed_at",
                    "identity_digest",
                }
                or item["classification"] != "ordinary_noncritical"
                or type(item["review_id"]) is not str
                or str(UUID(item["review_id"], version=4)) != item["review_id"]
                or type(item["identity_digest"]) is not str
                or re.fullmatch(r"[0-9a-f]{64}", item["identity_digest"]) is None
                or type(item["reviewed_at"]) is not str
            ):
                raise ValueError
            moment = datetime.fromisoformat(item["reviewed_at"])
            if moment.tzinfo != UTC or moment.isoformat() != item["reviewed_at"]:
                raise ValueError
            identity = observation_ids([item["registry_id"]])[0]
            if identity in seen:
                raise ValueError
        except ValueError, TypeError, KeyError, AttributeError:
            raise AgentPolicyError("Invalid switch reviews") from None
        seen.add(identity)
        result.append(dict(item))
    return result


def attestations(raw: object) -> None:
    """Require each explicit physical-load assertion; strings/truthiness fail."""
    if (
        type(raw) is not dict
        or set(raw) != ATTESTATIONS
        or any(value is not True for value in raw.values())
    ):
        raise AgentPolicyError("Explicit switch review is required")


def identity(hass: Any, entry: Any, state: Any) -> str:
    """Reject known fanout/critical associations and hash nontransient identity."""
    device = dr.async_get(hass).async_get(entry.device_id) if entry.device_id else None
    config = (
        hass.config_entries.async_get_entry(entry.config_entry_id)
        if entry.config_entry_id
        else None
    )
    if (
        entry.domain != "switch"
        or entry.platform in {"group", "template"}
        or entry.disabled
        or entry.entity_category is not None
        or device is None
        or device.disabled
        or config is None
        or device.config_entry_id != entry.config_entry_id
        or not (device.identifiers or device.connections)
        or state is None
        or state.state not in {"on", "off"}
        or "entity_id" in state.attributes
        or state.attributes.get("group_members") not in (None, [], [entry.entity_id])
    ):
        raise AgentPolicyError("Switch target cannot be reviewed")
    siblings = []
    for candidate in er.async_get(hass).entities.values():
        if candidate.device_id != entry.device_id:
            continue
        candidate_state = hass.states.get(candidate.entity_id)
        classes = {candidate.device_class, candidate.original_device_class}
        if candidate_state is not None:
            value = candidate_state.attributes.get("device_class")
            if type(value) is str:
                classes.add(value)
        if candidate.domain in _CRITICAL_DOMAINS or classes & _CRITICAL_CLASSES:
            raise AgentPolicyError("Switch target has a protected association")
        siblings.append(
            (
                candidate.id,
                candidate.entity_id,
                sorted(value for value in classes if value),
            )
        )
    payload = {
        "entity": [
            entry.id,
            entry.entity_id,
            entry.unique_id,
            entry.platform,
            entry.device_id,
            entry.config_entry_id,
            entry.config_subentry_id,
            entry.created_at.isoformat(),
            entry.area_id,
            sorted(entry.labels),
            entry.name,
            entry.original_name,
            state.attributes.get("friendly_name"),
        ],
        "device": [
            device.id,
            sorted(device.identifiers),
            sorted(device.connections),
            device.area_id,
            sorted(device.labels),
            device.name,
            device.name_by_user,
            device.manufacturer,
            device.model,
            device.via_device_id,
        ],
        "config": [
            config.entry_id,
            config.domain,
            config.unique_id,
            config.version,
            config.minor_version,
            dict(config.data),
            dict(config.options),
        ],
        "associations": sorted(siblings),
    }
    try:
        return hashlib.sha256(
            json.dumps(
                payload, sort_keys=True, separators=(",", ":"), allow_nan=False
            ).encode()
        ).hexdigest()
    except TypeError, ValueError:
        raise AgentPolicyError("Switch identity is unsupported") from None
