"""Administrator history boundaries through the registered WebSocket transport."""

from copy import deepcopy
from unittest.mock import AsyncMock, patch

import pytest

from custom_components.ai_orchestrator.audit_store import AuditStoreError
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.websocket_api import (
    async_register_websocket_commands,
)
from tests.home_assistant.test_action_manager import setup_actions


async def prepare(hass, user):
    manager, _, service, _ = await setup_actions(hass, user)
    runtime = async_get_runtime(hass)
    runtime.audit_store = manager.audit
    async_register_websocket_commands(hass)
    return runtime, manager.audit, service


async def call(client, **values):
    await client.send_json_auto_id({"type": "ai_orchestrator/audit/list", **values})
    return await client.receive_json()


async def test_pages_are_bounded_detached_and_have_no_action_authority(
    hass, hass_admin_user, hass_ws_client
):
    _, store, service = await prepare(hass, hass_admin_user)
    expected = [await store.async_begin("light_turn_on_v1") for _ in range(3)]
    client = await hass_ws_client(hass)
    first = await call(client, limit=2)
    assert first["result"] == {
        "schema_version": 1,
        "retention_days": 90,
        "records": expected[:2],
        "next_cursor": 2,
    }
    first["result"]["records"][0]["phase"] = "PRIVATE_CONTENT"
    second = await call(client, after_sequence=2, limit=2)
    assert second["result"]["records"] == expected[2:]
    assert second["result"]["next_cursor"] is None
    assert store.list() == expected
    empty = await call(client, after_sequence=3)
    assert empty["result"]["records"] == []
    service.assert_not_called()


@pytest.mark.parametrize(
    "values",
    [
        {"limit": 0},
        {"limit": 101},
        {"limit": True},
        {"after_sequence": -1},
        {"after_sequence": True},
        {"household_id": "PRIVATE_CONTENT"},
    ],
)
async def test_invalid_page_never_reaches_store(
    hass, hass_admin_user, hass_ws_client, values
):
    _, store, _ = await prepare(hass, hass_admin_user)
    client = await hass_ws_client(hass)
    with patch.object(store, "async_prune", new_callable=AsyncMock) as prune:
        result = await call(client, **values)
    assert result["success"] is False
    prune.assert_not_called()


async def test_nonadmin_cannot_read_or_prune(
    hass, hass_admin_user, hass_ws_client, hass_read_only_access_token
):
    _, store, _ = await prepare(hass, hass_admin_user)
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    with patch.object(store, "async_prune", new_callable=AsyncMock) as prune:
        result = await call(client)
    assert result["success"] is False
    prune.assert_not_called()


@pytest.mark.parametrize(
    "failure",
    [
        "unloaded",
        "absent",
        "unreadable",
        "prune",
        "replaced",
        "revoked",
        "missing_user",
        "inactive_user",
    ],
)
async def test_storage_and_authorization_failures_return_static_error(
    hass, hass_admin_user, hass_ws_client, failure
):
    runtime, store, _ = await prepare(hass, hass_admin_user)
    await store.async_begin("light_turn_on_v1")
    client = await hass_ws_client(hass)
    if failure == "unloaded":
        runtime.loaded_foundation_entry_ids.clear()
    elif failure == "absent":
        runtime.audit_store = None
    elif failure == "unreadable":
        store._payload = None

    async def prune():
        if failure == "prune":
            raise AuditStoreError("PRIVATE_CONTENT")
        if failure == "replaced":
            runtime.audit_store = None
        if failure == "revoked":
            runtime.loaded_foundation_entry_ids.clear()

    user = hass_admin_user
    if failure == "missing_user":
        user = None
    elif failure == "inactive_user":
        user = deepcopy(hass_admin_user)
        user.is_active = False
    with (
        patch.object(store, "async_prune", side_effect=prune),
        patch.object(
            hass.auth, "async_get_user", new_callable=AsyncMock, return_value=user
        ),
    ):
        result = await call(client)
    assert result["success"] is False
    assert result["error"] == {
        "code": "audit_unavailable",
        "message": "Execution history is unavailable.",
    }
