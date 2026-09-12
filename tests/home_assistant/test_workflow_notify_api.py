"""Notification target discovery over actual HA transport (WFL-004)."""

from unittest.mock import AsyncMock

from homeassistant.components.websocket_api import ERR_UNAUTHORIZED

from custom_components.ai_orchestrator.const import NOTIFY_TARGETS_WEBSOCKET_TYPE
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.websocket_api import (
    async_register_websocket_commands,
)
from custom_components.ai_orchestrator.workflow_notify import (
    async_resolve_notify_target,
)

MARKER = "private-household-marker"


async def call(client, message):
    await client.send_json_auto_id(message)
    return await client.receive_json()


def setup(hass):
    async_register_websocket_commands(hass)
    async_get_runtime(hass).loaded_foundation_entry_ids.add("synthetic-foundation")
    hass.services.async_register("notify", "send_message", AsyncMock())
    hass.services.async_register("notify", "persistent_notification", AsyncMock())
    hass.services.async_register("notify", "mobile_app_synthetic", AsyncMock())
    hass.services.async_register("light", "turn_on", AsyncMock())
    hass.states.async_set(
        "notify.kitchen_speaker", "unknown", {"friendly_name": "Kitchen speaker"}
    )
    hass.states.async_set("notify.no_name", "unknown")
    hass.states.async_set("light.kitchen", "on", {"friendly_name": MARKER})


async def test_targets_come_only_from_real_notify_registries(hass, hass_ws_client):
    setup(hass)
    client = await hass_ws_client(hass)
    response = await call(client, {"type": NOTIFY_TARGETS_WEBSOCKET_TYPE})

    assert response["success"] is True
    assert response["result"] == {
        "schema_version": 1,
        "targets": [
            {
                "reference": "notify.kitchen_speaker",
                "kind": "entity",
                "name": "Kitchen speaker",
            },
            {
                "reference": "notify.mobile_app_synthetic",
                "kind": "service",
                "name": "mobile_app_synthetic",
            },
            {"reference": "notify.no_name", "kind": "entity", "name": "notify.no_name"},
        ],
    }
    assert MARKER not in str(response)


async def test_resolution_prefers_entity_then_service_then_missing(hass):
    setup(hass)
    assert async_resolve_notify_target(hass, "notify.kitchen_speaker") == "entity"
    assert async_resolve_notify_target(hass, "notify.mobile_app_synthetic") == "service"
    assert async_resolve_notify_target(hass, "notify.send_message") == "missing"
    assert (
        async_resolve_notify_target(hass, "notify.persistent_notification") == "missing"
    )
    assert async_resolve_notify_target(hass, "notify.absent") == "missing"
    assert async_resolve_notify_target(hass, "light.kitchen") == "missing"
    assert async_resolve_notify_target(hass, "") == "missing"


async def test_non_admin_and_unloaded_foundation_are_refused(
    hass, hass_ws_client, hass_read_only_access_token
):
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    response = await call(client, {"type": NOTIFY_TARGETS_WEBSOCKET_TYPE})
    assert response["success"] is False
    assert response["error"]["code"] == "not_loaded"

    setup(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    response = await call(client, {"type": NOTIFY_TARGETS_WEBSOCKET_TYPE})
    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED
