"""Read-only Home Assistant registry catalogue."""

from typing import Literal, TypedDict

from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

CATALOG_SCHEMA_VERSION = 1

type Availability = Literal["available", "unavailable", "not_loaded"]


class CatalogArea(TypedDict):
    """Public area metadata used by the administration panel."""

    area_id: str
    name: str


class CatalogDevice(TypedDict):
    """Bounded device metadata used by the administration panel."""

    device_id: str
    name: str | None
    area_id: str | None
    manufacturer: str | None
    model: str | None
    disabled: bool


class CatalogEntity(TypedDict):
    """Bounded entity metadata used by the administration panel."""

    registry_id: str
    entity_id: str
    domain: str
    platform: str
    name: str | None
    device_id: str | None
    area_id: str | None
    area_source: Literal["entity", "device"] | None
    disabled: bool
    availability: Availability


class CatalogSnapshot(TypedDict):
    """Versioned registry snapshot returned to the administration panel."""

    schema_version: int
    areas: list[CatalogArea]
    devices: list[CatalogDevice]
    entities: list[CatalogEntity]


@callback
def build_catalog_snapshot(hass: HomeAssistant) -> CatalogSnapshot:
    """Build a current, read-only snapshot without entity state values or attributes."""
    area_registry = ar.async_get(hass)
    device_registry = dr.async_get(hass)
    entity_registry = er.async_get(hass)

    areas: list[CatalogArea] = [
        {"area_id": area.id, "name": area.name}
        for area in area_registry.async_list_areas()
    ]
    areas.sort(key=lambda area: (area["name"].casefold(), area["area_id"]))

    devices: list[CatalogDevice] = [
        {
            "device_id": device.id,
            "name": device.name_by_user or device.name,
            "area_id": device.area_id,
            "manufacturer": device.manufacturer,
            "model": device.model,
            "disabled": device.disabled,
        }
        for device in device_registry.devices.values()
    ]
    devices.sort(
        key=lambda device: (
            (device["name"] or "").casefold(),
            device["device_id"],
        )
    )

    entities: list[CatalogEntity] = []
    for entity in entity_registry.entities.values():
        device = (
            device_registry.async_get(entity.device_id) if entity.device_id else None
        )
        if entity.area_id is not None:
            area_id = entity.area_id
            area_source: Literal["entity", "device"] | None = "entity"
        elif device is not None and device.area_id is not None:
            area_id = device.area_id
            area_source = "device"
        else:
            area_id = None
            area_source = None

        state = hass.states.get(entity.entity_id)
        availability: Availability
        if state is None:
            availability = "not_loaded"
        elif state.state == STATE_UNAVAILABLE:
            availability = "unavailable"
        else:
            availability = "available"

        entities.append(
            {
                "registry_id": entity.id,
                "entity_id": entity.entity_id,
                "domain": entity.domain,
                "platform": entity.platform,
                "name": entity.name or entity.original_name,
                "device_id": entity.device_id,
                "area_id": area_id,
                "area_source": area_source,
                "disabled": entity.disabled,
                "availability": availability,
            }
        )
    entities.sort(key=lambda entity: entity["entity_id"])

    return {
        "schema_version": CATALOG_SCHEMA_VERSION,
        "areas": areas,
        "devices": devices,
        "entities": entities,
    }
