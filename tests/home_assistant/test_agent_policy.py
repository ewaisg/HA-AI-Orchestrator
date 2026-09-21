"""Observation scope persistence and authorization boundaries."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.components import websocket_api
from homeassistant.helpers import entity_registry as er

from custom_components.ai_orchestrator.agent_api import (
    websocket_agent_list,
    websocket_agent_save,
)
from custom_components.ai_orchestrator.agent_policy import (
    async_read_scoped_state,
    resolve_observation,
)
from custom_components.ai_orchestrator.agent_store import (
    STORAGE_KEY,
    AgentPolicyError,
    AgentRevisionError,
    AgentStore,
    AgentStoreError,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.test_conversation_entity import CONNECTION_ID, setup_agent

CONNECTION = "12345678-1234-4123-8123-123456789abc"
SECOND = "12345678-1234-4123-8123-123456789abd"


async def test_defaults_roundtrip_detached_and_revision(hass, hass_storage):
    store = AgentStore(hass)
    with pytest.raises(AgentStoreError):
        store.get(CONNECTION)
    await store.async_load()
    assert store.get(CONNECTION) == {
        "connection_id": CONNECTION,
        "revision": 0,
        "observe_registry_ids": [],
        "action_scopes": [],
    }
    result = await store.async_save(CONNECTION, ["stable-registry-id"], 0)
    result["observe_registry_ids"].clear()
    other = AgentStore(hass)
    await other.async_load()
    assert other.get(CONNECTION)["observe_registry_ids"] == ["stable-registry-id"]
    assert other.list() == store.list()
    assert hass_storage[STORAGE_KEY]["data"] == {"profiles": store.list()}
    assert (await store.async_save(CONNECTION, [], 1))["revision"] == 2
    with pytest.raises(AgentRevisionError):
        await store.async_save(CONNECTION, [], 1)


@pytest.mark.parametrize(
    "ids", [["x", "x"], ["x"] * 65, [None], [""], ["x" * 65], "x", [{}]]
)
async def test_invalid_scope_is_not_saved(hass, ids):
    store = AgentStore(hass)
    await store.async_load()
    with pytest.raises(AgentPolicyError):
        await store.async_save(CONNECTION, ids, 0)
    assert store.list() == []


@pytest.mark.parametrize("revision", [-1, True, "0", None])
async def test_invalid_revision(hass, revision):
    store = AgentStore(hass)
    await store.async_load()
    with pytest.raises(AgentPolicyError):
        await store.async_save(CONNECTION, [], revision)


async def test_concurrent_saves_preserve_both_and_same_revision_conflicts(hass):
    store = AgentStore(hass)
    await store.async_load()
    await asyncio.gather(
        store.async_save(CONNECTION, [], 0), store.async_save(SECOND, [], 0)
    )
    assert len(store.list()) == 2
    outcomes = await asyncio.gather(
        store.async_save(CONNECTION, ["one"], 1),
        store.async_save(CONNECTION, ["two"], 1),
        return_exceptions=True,
    )
    assert sum(isinstance(result, AgentRevisionError) for result in outcomes) == 1
    assert store.get(CONNECTION)["revision"] == 2


async def test_failed_revocation_disables_all_reads_until_reload(hass):
    store = AgentStore(hass)
    await store.async_load()
    await store.async_save(CONNECTION, ["one"], 0)
    with patch.object(store._store, "async_save", AsyncMock()):
        with pytest.raises(AgentStoreError):
            await store.async_save(CONNECTION, [], 1)
    assert not store.loaded
    with pytest.raises(AgentStoreError):
        store.get(CONNECTION)


async def test_os_failure_is_static_and_disables_store(hass):
    store = AgentStore(hass)
    await store.async_load()
    with patch.object(
        store._store, "async_save", side_effect=OSError("private marker")
    ):
        with pytest.raises(AgentStoreError, match="^Policy storage write failed$"):
            await store.async_save(CONNECTION, [], 0)
    assert not store.loaded


@pytest.mark.parametrize(
    "data",
    [
        [],
        {"other": []},
        {"profiles": {}},
        {"profiles": [{}]},
        {"profiles": [None]},
        {
            "profiles": [
                {
                    "connection_id": CONNECTION,
                    "revision": 1,
                    "observe_registry_ids": [],
                    "action_scopes": ["light.turn_on"],
                }
            ]
        },
    ],
)
async def test_corrupt_storage_fails_closed(hass, hass_storage, data):
    hass_storage[STORAGE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": STORAGE_KEY,
        "data": data,
    }
    store = AgentStore(hass)
    with pytest.raises(AgentStoreError):
        await store.async_load()
    assert not store.loaded
    assert hass_storage[STORAGE_KEY]["data"] == data


async def test_profile_limit(hass):
    store = AgentStore(hass)
    await store.async_load()
    with patch("custom_components.ai_orchestrator.agent_store.MAX_PROFILES", 1):
        await store.async_save(CONNECTION, [], 0)
        with pytest.raises(AgentPolicyError):
            await store.async_save(SECOND, [], 0)
        await store.async_save(CONNECTION, [], 1)


@pytest.fixture
async def scoped(hass):
    entry = er.async_get(hass).async_get_or_create("sensor", "test", "scoped")
    hass.states.async_set(entry.entity_id, "42", {"credential": "private marker"})
    store = AgentStore(hass)
    await store.async_load()
    await store.async_save(CONNECTION, [entry.id], 0)
    runtime = async_get_runtime(hass)
    runtime.agent_store = store
    runtime.loaded_foundation_entry_ids.add("synthetic-foundation")
    return store, entry


async def read(hass, scoped, user="user", revision=1):
    store, entry = scoped
    return await async_read_scoped_state(
        hass, store, CONNECTION, revision, entry.id, user
    )


@pytest.fixture
def authorize():
    user = SimpleNamespace(is_active=True, permissions=Mock())
    user.permissions.check_entity.return_value = True
    with (
        patch(
            "custom_components.ai_orchestrator.agent_policy.require_local_connection"
        ),
        patch(
            "homeassistant.auth.AuthManager.async_get_user",
            AsyncMock(return_value=user),
        ),
    ):
        yield user


async def test_reads_only_state_with_existing_user_permission(hass, scoped, authorize):
    result = await read(hass, scoped)
    assert result == {"entity_id": scoped[1].entity_id, "state": "42"}
    authorize.permissions.check_entity.assert_called_once_with(
        scoped[1].entity_id, "read"
    )


async def test_ha_denial_and_missing_user_are_not_overridden(hass, scoped, authorize):
    authorize.permissions.check_entity.return_value = False
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped, user=None)
    authorize.permissions.check_entity.return_value = True
    authorize.is_active = False
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)


async def test_stale_revision_after_scope_revoke(hass, scoped, authorize):
    await scoped[0].async_save(CONNECTION, [], 1)
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)


@pytest.mark.parametrize("phase", ["async_save", "async_load"])
async def test_cancelled_revocation_disables_stale_grants(
    hass, hass_storage, scoped, authorize, phase
):
    store = scoped[0]
    original_save = store._store.async_save

    async def cancelled_after_write(payload):
        await original_save(payload)
        raise asyncio.CancelledError

    replacement = (
        AsyncMock(side_effect=cancelled_after_write)
        if phase == "async_save"
        else AsyncMock(side_effect=asyncio.CancelledError)
    )
    with patch.object(store._store, phase, replacement):
        with pytest.raises(asyncio.CancelledError):
            await store.async_save(CONNECTION, [], 1)
    assert (
        hass_storage[STORAGE_KEY]["data"]["profiles"][0]["observe_registry_ids"] == []
    )
    assert not store.loaded
    with pytest.raises(AgentStoreError):
        await read(hass, scoped)


async def test_cached_policy_denied_after_foundation_unload(hass, scoped, authorize):
    async_get_runtime(hass).loaded_foundation_entry_ids.clear()
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)


async def test_cached_policy_denied_after_store_replacement(hass, scoped, authorize):
    async_get_runtime(hass).agent_store = AgentStore(hass)
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)


async def test_revoke_during_user_lookup_wins(hass, scoped, authorize):
    async def lookup(*_):
        await scoped[0].async_save(CONNECTION, [], 1)
        return authorize

    with patch("homeassistant.auth.AuthManager.async_get_user", lookup):
        with pytest.raises(AgentPolicyError):
            await read(hass, scoped)


async def test_removed_recreated_entity_does_not_inherit_scope(hass, scoped, authorize):
    registry = er.async_get(hass)
    registry.async_remove(scoped[1].entity_id)
    recreated = registry.async_get_or_create(
        "sensor", "test", "recreated", suggested_object_id="test_scoped"
    )
    assert recreated.id != scoped[1].id
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)


async def test_entity_id_string_is_never_accepted_as_stable_id(hass, scoped):
    with pytest.raises(AgentPolicyError):
        resolve_observation(hass, scoped[1].entity_id)


async def test_disabled_and_unavailable_targets(hass, scoped, authorize):
    hass.states.async_set(scoped[1].entity_id, "unavailable")
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)
    er.async_get(hass).async_update_entity(
        scoped[1].entity_id, disabled_by=er.RegistryEntryDisabler.USER
    )
    with pytest.raises(AgentPolicyError):
        resolve_observation(hass, scoped[1].id)


async def test_sensitive_domain_not_resolved(hass):
    entry = er.async_get(hass).async_get_or_create("lock", "test", "sensitive")
    with pytest.raises(AgentPolicyError):
        resolve_observation(hass, entry.id)


@pytest.mark.parametrize(
    "value", ["private credential", "NaN", "inf", "-inf", "1" * 65]
)
async def test_text_and_nonfinite_sensor_state_never_leaks(
    hass, scoped, authorize, value
):
    hass.states.async_set(scoped[1].entity_id, value)
    with pytest.raises(AgentPolicyError, match="^Observation state is unavailable$"):
        await read(hass, scoped)


async def test_sensitive_class_denied_after_runtime_change(hass, scoped, authorize):
    hass.states.async_set(scoped[1].entity_id, "42", {"device_class": "gas"})
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)


async def test_unloaded_provider_denied(hass, scoped):
    with pytest.raises(AgentPolicyError):
        await read(hass, scoped)


async def test_transport_admin_and_exact_schema(
    hass, hass_ws_client, hass_read_only_access_token
):
    websocket_api.async_register_command(hass, websocket_agent_list)
    websocket_api.async_register_command(hass, websocket_agent_save)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id({"type": "ai_orchestrator/agents/list"})
    assert (await client.receive_json())["error"]["code"] == "unauthorized"
    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id(
        {
            "type": "ai_orchestrator/agents/save",
            "connection_id": CONNECTION,
            "expected_revision": 0,
            "observe_registry_ids": [],
            "action_scopes": [],
        }
    )
    assert (await admin.receive_json())["error"]["code"] == "invalid_format"
    await admin.send_json_auto_id({"type": "ai_orchestrator/agents/list"})
    assert (await admin.receive_json())["error"]["code"] == "not_loaded"


async def test_transport_save_list_conflict_and_denied_targets(
    hass, hass_ws_client, enable_custom_integrations
):
    await setup_agent(hass)
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic")
    runtime.agent_store = AgentStore(hass)
    await runtime.agent_store.async_load()
    websocket_api.async_register_command(hass, websocket_agent_list)
    websocket_api.async_register_command(hass, websocket_agent_save)
    entry = er.async_get(hass).async_get_or_create("sensor", "test", "api")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ai_orchestrator/agents/list"})
    first = await client.receive_json()
    assert first["result"]["profiles"] == [runtime.agent_store.get(CONNECTION_ID)]
    message = {
        "type": "ai_orchestrator/agents/save",
        "connection_id": CONNECTION_ID,
        "expected_revision": 0,
        "observe_registry_ids": [entry.id],
    }
    await client.send_json_auto_id(message)
    result = await client.receive_json()
    assert result["success"]
    assert result["result"]["profile"]["revision"] == 1
    assert result["result"]["profile"]["action_scopes"] == []
    await client.send_json_auto_id(message)
    assert (await client.receive_json())["error"]["code"] == "revision_conflict"
    for ids in [[entry.entity_id], ["missing"], [entry.id, entry.id]]:
        await client.send_json_auto_id(
            {**message, "expected_revision": 1, "observe_registry_ids": ids}
        )
        assert (await client.receive_json())["error"]["code"] == "invalid_policy"
    await client.send_json_auto_id({**message, "connection_id": SECOND})
    assert (await client.receive_json())["error"]["code"] == "invalid_policy"
