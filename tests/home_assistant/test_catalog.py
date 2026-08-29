"""Tests for the read-only Home Assistant registry catalogue."""

import json

from homeassistant.components.websocket_api import ERR_UNAUTHORIZED
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from custom_components.ai_orchestrator.catalog import build_catalog_snapshot
from custom_components.ai_orchestrator.const import CATALOG_LIST_WEBSOCKET_TYPE
from custom_components.ai_orchestrator.websocket_api import (
    async_register_websocket_commands,
)


def _create_registry_graph(hass: HomeAssistant) -> tuple[str, str, str, str]:
    """Create one area, device, and entity using the pinned Core registries."""
    config_entry = MockConfigEntry(domain="test", unique_id="catalog-test-entry")
    config_entry.add_to_hass(hass)

    area = ar.async_get(hass).async_get_or_create("Kitchen")
    device_registry = dr.async_get(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("test", "window-device")},
        manufacturer="Synthetic manufacturer",
        model="Synthetic model",
        name="Kitchen window device",
    )
    device_registry.async_update_device(device.id, area_id=area.id)

    entity = er.async_get(hass).async_get_or_create(
        "binary_sensor",
        "test",
        "window-entity",
        config_entry=config_entry,
        device_id=device.id,
        has_entity_name=True,
        original_name="Window",
        suggested_object_id="kitchen_window",
    )
    hass.states.async_set(entity.entity_id, "on", {"private_attribute": "not-returned"})
    return area.id, device.id, entity.id, entity.entity_id


def test_catalog_returns_exact_bounded_registry_metadata(hass: HomeAssistant) -> None:
    """The snapshot omits state values, attributes, identifiers, and config entries."""
    area_id, device_id, registry_id, entity_id = _create_registry_graph(hass)

    snapshot = build_catalog_snapshot(hass)

    assert snapshot == {
        "schema_version": 1,
        "areas": [{"area_id": area_id, "name": "Kitchen"}],
        "devices": [
            {
                "device_id": device_id,
                "name": "Kitchen window device",
                "area_id": area_id,
                "manufacturer": "Synthetic manufacturer",
                "model": "Synthetic model",
                "disabled": False,
            }
        ],
        "entities": [
            {
                "registry_id": registry_id,
                "entity_id": entity_id,
                "domain": "binary_sensor",
                "platform": "test",
                "name": "Window",
                "device_id": device_id,
                "area_id": area_id,
                "area_source": "device",
                "disabled": False,
                "availability": "available",
            }
        ],
    }
    serialized = json.dumps(snapshot)
    assert "private_attribute" not in serialized
    assert "not-returned" not in serialized
    assert "window-device" not in serialized
    assert "catalog-test-entry" not in serialized


def test_catalog_tracks_rename_remove_area_and_availability(
    hass: HomeAssistant,
) -> None:
    """Resolve current registries while stable registry IDs survive rename."""
    area_id, device_id, registry_id, old_entity_id = _create_registry_graph(hass)
    entity_registry = er.async_get(hass)
    device_registry = dr.async_get(hass)

    renamed = entity_registry.async_update_entity(
        old_entity_id,
        new_entity_id="binary_sensor.patio_window",
        name="Patio Window",
    )
    hass.states.async_remove(old_entity_id)
    hass.states.async_set(renamed.entity_id, STATE_UNAVAILABLE)

    renamed_snapshot = build_catalog_snapshot(hass)
    assert renamed_snapshot["entities"][0]["registry_id"] == registry_id
    assert renamed_snapshot["entities"][0]["entity_id"] == renamed.entity_id
    assert renamed_snapshot["entities"][0]["name"] == "Patio Window"
    assert renamed_snapshot["entities"][0]["availability"] == "unavailable"
    assert old_entity_id not in json.dumps(renamed_snapshot)

    entity_registry.async_update_entity(renamed.entity_id, area_id=area_id)
    device_registry.async_update_device(device_id, area_id=None)
    entity_area_snapshot = build_catalog_snapshot(hass)
    assert entity_area_snapshot["entities"][0]["area_id"] == area_id
    assert entity_area_snapshot["entities"][0]["area_source"] == "entity"

    ar.async_get(hass).async_delete(area_id)
    missing_area_snapshot = build_catalog_snapshot(hass)
    assert missing_area_snapshot["areas"] == []
    assert missing_area_snapshot["devices"][0]["area_id"] is None
    assert missing_area_snapshot["entities"][0]["area_id"] is None
    assert missing_area_snapshot["entities"][0]["area_source"] is None

    entity_registry.async_remove(renamed.entity_id)
    assert build_catalog_snapshot(hass)["entities"] == []


def test_catalog_reports_disabled_and_not_loaded_without_state_content(
    hass: HomeAssistant,
) -> None:
    """Disabled and unloaded are metadata, not fabricated current states."""
    _, _, _, entity_id = _create_registry_graph(hass)
    hass.states.async_remove(entity_id)
    entity_registry = er.async_get(hass)
    entity_registry.async_update_entity(
        entity_id, disabled_by=er.RegistryEntryDisabler.USER
    )

    entity = build_catalog_snapshot(hass)["entities"][0]

    assert entity["disabled"] is True
    assert entity["availability"] == "not_loaded"


async def test_catalog_websocket_is_admin_only_and_rejects_input(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    """The catalogue is read-only, admin-only, and has no caller-controlled query."""
    _create_registry_graph(hass)
    async_register_websocket_commands(hass)

    admin_client = await hass_ws_client(hass)
    await admin_client.send_json_auto_id({"type": CATALOG_LIST_WEBSOCKET_TYPE})
    response = await admin_client.receive_json()
    assert response["success"] is True
    assert response["result"]["schema_version"] == 1
    assert len(response["result"]["entities"]) == 1

    await admin_client.send_json_auto_id(
        {"type": CATALOG_LIST_WEBSOCKET_TYPE, "entity_id": "light.not_allowed"}
    )
    response = await admin_client.receive_json()
    assert response["success"] is False

    non_admin_client = await hass_ws_client(hass, hass_read_only_access_token)
    await non_admin_client.send_json_auto_id({"type": CATALOG_LIST_WEBSOCKET_TYPE})
    response = await non_admin_client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED
