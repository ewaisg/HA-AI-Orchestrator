"""Notification target discovery and resolution against real Home Assistant registries.

A workflow's notify step names a reference in the `notify` namespace
(`notify.<name>`). It is resolved, at discovery and at execution time, against
what Home Assistant actually has: a notify *entity* with that entity id (sent
through `notify.send_message`) or a legacy notify *service* with that name.
Nothing is invented: a reference that matches neither is reported missing and
never called.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Final

from homeassistant.core import HomeAssistant, callback

NOTIFY_DOMAIN: Final = "notify"
SEND_MESSAGE_SERVICE: Final = "send_message"
# Generic notify-domain services that are not deliverable targets by themselves.
_NON_TARGET_SERVICES: Final = frozenset(
    {SEND_MESSAGE_SERVICE, "persistent_notification"}
)
MAX_TARGETS: Final = 500

TARGET_ENTITY: Final = "entity"
TARGET_SERVICE: Final = "service"
TARGET_MISSING: Final = "missing"


@dataclass(frozen=True, slots=True)
class NotifyTarget:
    """One resolved notification destination."""

    reference: str
    kind: str
    name: str

    def as_dict(self) -> dict[str, Any]:
        """Return the exact serializable form."""
        return {"reference": self.reference, "kind": self.kind, "name": self.name}


def _bounded(value: object, max_chars: int = 255) -> str:
    return value if isinstance(value, str) and len(value) <= max_chars else ""


@callback
def async_list_notify_targets(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Return deliverable notify entities and legacy notify services, sorted."""
    targets: dict[str, NotifyTarget] = {}
    for state in hass.states.async_all(NOTIFY_DOMAIN):
        reference = state.entity_id
        if len(reference) > 255:
            continue
        name = _bounded(state.attributes.get("friendly_name")) or reference
        targets[reference] = NotifyTarget(reference, TARGET_ENTITY, name)
    for service in hass.services.async_services_for_domain(NOTIFY_DOMAIN):
        if service in _NON_TARGET_SERVICES:
            continue
        reference = f"{NOTIFY_DOMAIN}.{service}"
        if reference in targets or len(reference) > 255:
            continue
        targets[reference] = NotifyTarget(reference, TARGET_SERVICE, service)
    ordered = sorted(targets.values(), key=lambda target: target.reference)
    return [target.as_dict() for target in ordered[:MAX_TARGETS]]


@callback
def async_resolve_notify_target(hass: HomeAssistant, reference: str) -> str:
    """Return how a step reference would be delivered, or `missing`."""
    if not reference.startswith(f"{NOTIFY_DOMAIN}."):
        return TARGET_MISSING
    if hass.states.get(reference) is not None:
        return TARGET_ENTITY
    service = reference.removeprefix(f"{NOTIFY_DOMAIN}.")
    if service not in _NON_TARGET_SERVICES and hass.services.has_service(
        NOTIFY_DOMAIN, service
    ):
        return TARGET_SERVICE
    return TARGET_MISSING


async def async_send_notification(
    hass: HomeAssistant, reference: str, *, message: str, title: str
) -> str:
    """Deliver one message through the resolved target; return the kind used.

    Raises `LookupError` when the reference resolves to nothing, so a caller
    can record a static failure without ever calling a guessed service.
    """
    kind = async_resolve_notify_target(hass, reference)
    if kind == TARGET_ENTITY:
        await hass.services.async_call(
            NOTIFY_DOMAIN,
            SEND_MESSAGE_SERVICE,
            {"entity_id": reference, "message": message, "title": title},
            blocking=True,
        )
        return kind
    if kind == TARGET_SERVICE:
        await hass.services.async_call(
            NOTIFY_DOMAIN,
            reference.removeprefix(f"{NOTIFY_DOMAIN}."),
            {"message": message, "title": title},
            blocking=True,
        )
        return kind
    raise LookupError("notification target is missing")
