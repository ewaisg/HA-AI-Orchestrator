"""Admin-only switch review transport with a real registry/store roundtrip."""

from unittest.mock import AsyncMock

import pytest
from homeassistant.components import websocket_api

from custom_components.ai_orchestrator.action_api import (
    websocket_switch_review_preview,
    websocket_switch_review_revoke,
    websocket_switch_review_save,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.test_switch_review import (
    ASSERTIONS,
    CONNECTION_ID,
    setup_switch,
)

COMMANDS = [
    ("preview", websocket_switch_review_preview, {}),
    (
        "save",
        websocket_switch_review_save,
        {
            "review_token": "synthetic",
            "classification": "ordinary_noncritical",
            "attestations": ASSERTIONS,
        },
    ),
    ("revoke", websocket_switch_review_revoke, {}),
]


@pytest.mark.parametrize("name,handler,extra", COMMANDS)
async def test_unloaded_review_is_static_error(
    hass, hass_ws_client, name, handler, extra
):
    websocket_api.async_register_command(hass, handler)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": f"ai_orchestrator/actions/switch_review/{name}",
            "connection_id": CONNECTION_ID,
            "expected_revision": 1,
            "registry_id": "synthetic",
            **extra,
        }
    )
    assert (await client.receive_json())["error"]["code"] == "not_loaded"


@pytest.mark.parametrize("name,handler,extra", COMMANDS)
async def test_nonadmin_cannot_classify(
    hass, hass_ws_client, hass_read_only_access_token, name, handler, extra
):
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic")
    runtime.action_manager = AsyncMock()
    websocket_api.async_register_command(hass, handler)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json(
        {
            "id": 1,
            "type": f"ai_orchestrator/actions/switch_review/{name}",
            "connection_id": CONNECTION_ID,
            "expected_revision": 1,
            "registry_id": "synthetic",
            **extra,
        }
    )
    assert (await client.receive_json())["error"]["code"] == "unauthorized"
    assert not runtime.action_manager.mock_calls


async def test_real_admin_review_roundtrip_no_grants_or_actions(
    hass, hass_ws_client, hass_admin_user
):
    manager, entry, service, _, _, _ = await setup_switch(hass, hass_admin_user)
    from custom_components.ai_orchestrator.websocket_api import (
        async_register_websocket_commands,
    )

    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    common = {
        "connection_id": CONNECTION_ID,
        "expected_revision": 1,
        "registry_id": entry.id,
    }
    await client.send_json(
        {"id": 1, "type": "ai_orchestrator/actions/switch_review/preview", **common}
    )
    preview = (await client.receive_json())["result"]
    assert preview["entity_id"] == entry.entity_id
    await client.send_json(
        {
            "id": 2,
            "type": "ai_orchestrator/actions/switch_review/save",
            **common,
            "review_token": preview["review_token"],
            "classification": "ordinary_noncritical",
            "attestations": ASSERTIONS,
        }
    )
    saved = (await client.receive_json())["result"]
    assert saved["schema_version"] == 2
    assert saved["profile"]["revision"] == 2
    assert len(saved["profile"]["switch_reviews"]) == 1
    assert all(
        not scope["tool_id"].startswith("switch")
        for scope in saved["profile"]["action_scopes"]
    )
    await client.send_json(
        {
            "id": 3,
            "type": "ai_orchestrator/actions/switch_review/revoke",
            **common,
            "expected_revision": 2,
        }
    )
    assert (await client.receive_json())["result"]["profile"]["switch_reviews"] == []
    service.assert_not_called()
    assert not manager.audit.list()


@pytest.mark.parametrize(
    "extra",
    [
        {"classification": "critical"},
        {"attestations": {}},
        {"identity_digest": "forged"},
        {"risk": "low"},
    ],
)
async def test_client_cannot_inject_policy(hass, hass_ws_client, extra):
    websocket_api.async_register_command(hass, websocket_switch_review_save)
    client = await hass_ws_client(hass)
    await client.send_json(
        {
            "id": 1,
            "type": "ai_orchestrator/actions/switch_review/save",
            "connection_id": CONNECTION_ID,
            "expected_revision": 1,
            "registry_id": "synthetic",
            "review_token": "synthetic",
            "classification": "ordinary_noncritical",
            "attestations": ASSERTIONS,
            **extra,
        }
    )
    assert (await client.receive_json())["error"]["code"] == "invalid_format"
