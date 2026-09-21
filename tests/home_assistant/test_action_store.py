"""Explicit durable grant validation and fail-closed persistence tests."""

import asyncio
import json
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.helpers.storage import Store

from custom_components.ai_orchestrator.action_store import STORAGE_KEY, ActionStore
from custom_components.ai_orchestrator.agent_store import (
    AgentPolicyError,
    AgentRevisionError,
    AgentStoreError,
)
from tests.home_assistant.test_conversation_entity import CONNECTION_ID

SCOPES = [{"tool_id": "light_turn_on_v1", "registry_ids": ["synthetic-id"]}]
REAL_WRITE = Store._async_write_data
REAL_LOAD = Store._async_load


async def test_legacy_migration_drops_switch_authority(hass, hass_storage):
    from homeassistant.helpers.storage import Store, UnsupportedStorageVersionError

    hass_storage[STORAGE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": STORAGE_KEY,
        "data": {
            "profiles": [
                {
                    "connection_id": CONNECTION_ID,
                    "revision": 7,
                    "action_scopes": SCOPES
                    + [
                        {"tool_id": "switch_turn_on_v1", "registry_ids": ["old-switch"]}
                    ],
                }
            ]
        },
    }
    store = ActionStore(hass)
    await store.async_load()
    assert store.get(CONNECTION_ID) == {
        "connection_id": CONNECTION_ID,
        "revision": 8,
        "action_scopes": SCOPES,
        "switch_reviews": [],
    }
    assert hass_storage[STORAGE_KEY]["version"] == 2
    # Old release refuses a future major; no unsafe synthetic downgrade.
    with pytest.raises(UnsupportedStorageVersionError):
        await Store(hass, 1, STORAGE_KEY).async_load()


@pytest.mark.parametrize("version,minor", [(0, 1), (1, 2), (2, 2), (3, 1)])
async def test_unknown_versions_preserved(hass, hass_storage, version, minor):
    from copy import deepcopy

    raw = {
        "version": version,
        "minor_version": minor,
        "key": STORAGE_KEY,
        "data": {"profiles": []},
    }
    hass_storage[STORAGE_KEY] = deepcopy(raw)
    store = ActionStore(hass)
    with pytest.raises((AgentStoreError, NotImplementedError)):
        await store.async_load()
    assert not store.loaded
    assert hass_storage[STORAGE_KEY] == raw


@pytest.mark.parametrize(
    "content",
    [
        b"{bad-json",
        b'{"version":3,"minor_version":1,"key":"ai_orchestrator.actions","data":{"profiles":[]}}',
        b'{"version":2,"version":2}',
    ],
)
async def test_disk_corruption_never_renamed(hass, tmp_path, content):
    path = tmp_path / "policy"
    path.write_bytes(content)
    store = ActionStore(hass)
    with patch.object(type(store._store), "path", property(lambda self: str(path))):
        with pytest.raises(AgentStoreError):
            await store.async_load()
    assert path.read_bytes() == content
    assert list(tmp_path.iterdir()) == [path]


async def test_cancelled_write_is_drained_before_reload(hass):
    from homeassistant.helpers.storage import Store

    store = ActionStore(hass)
    await store.async_load()
    started, release = asyncio.Event(), asyncio.Event()
    original = Store.async_save

    async def delayed(storage, payload):
        started.set()
        await release.wait()
        await original(storage, payload)

    with patch.object(Store, "async_save", delayed):
        save = asyncio.create_task(store.async_save(CONNECTION_ID, SCOPES, 0))
        await started.wait()
        save.cancel()
        with pytest.raises(asyncio.CancelledError):
            await save
        assert not store.loaded
        reload = asyncio.create_task(store.async_load())
        await asyncio.sleep(0)
        assert not reload.done()
        release.set()
        await reload
    assert store.get(CONNECTION_ID)["action_scopes"] == SCOPES


async def test_defaults_roundtrip_and_stale_revision(hass):
    store = ActionStore(hass)
    with pytest.raises(AgentStoreError):
        store.get(CONNECTION_ID)
    await store.async_load()
    assert store.get(CONNECTION_ID)["action_scopes"] == []
    result = await store.async_save(CONNECTION_ID, SCOPES, 0)
    result["action_scopes"].clear()
    assert store.get(CONNECTION_ID)["action_scopes"] == SCOPES
    other = ActionStore(hass)
    await other.async_load()
    assert other.get(CONNECTION_ID) == store.get(CONNECTION_ID)
    with pytest.raises(AgentRevisionError):
        await store.async_save(CONNECTION_ID, [], 0)
    assert (await store.async_save(CONNECTION_ID, [], 1))["revision"] == 2


@pytest.mark.parametrize(
    "scopes",
    [
        None,
        {},
        [SCOPES[0]] * 2,
        [{"tool_id": "arbitrary", "registry_ids": ["x"]}],
        [{"tool_id": "light_turn_on_v1", "registry_ids": []}],
        [{"tool_id": "light_turn_on_v1", "registry_ids": ["x", "x"]}],
        [{"tool_id": "light_turn_on_v1", "registry_ids": ["x"], "extra": True}],
        [
            {
                "tool_id": "light_turn_on_v1",
                "registry_ids": [str(i) for i in range(64)],
            },
            {"tool_id": "light_turn_off_v1", "registry_ids": ["extra"]},
        ],
    ],
)
async def test_invalid_scope_denied(hass, scopes):
    store = ActionStore(hass)
    await store.async_load()
    with pytest.raises(AgentPolicyError):
        await store.async_save(CONNECTION_ID, scopes, 0)


async def test_failed_readback_disables_previous_grants(hass):
    store = ActionStore(hass)
    await store.async_load()
    await store.async_save(CONNECTION_ID, SCOPES, 0)
    with patch.object(store._store, "async_load", new=AsyncMock(return_value=None)):
        with pytest.raises(AgentStoreError):
            await store.async_save(CONNECTION_ID, [], 1)
    assert not store.loaded


@pytest.mark.parametrize(
    "data",
    [
        {"profiles": "bad"},
        {"profiles": [{}]},
        {
            "profiles": [
                {"connection_id": CONNECTION_ID, "revision": 1, "action_scopes": SCOPES}
            ]
            * 2
        },
    ],
)
async def test_corrupt_records_fail_closed_without_rewrite(hass, hass_storage, data):
    hass_storage[STORAGE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": STORAGE_KEY,
        "data": data,
    }
    store = ActionStore(hass)
    with pytest.raises(AgentStoreError):
        await store.async_load()
    assert not store.loaded
    assert hass_storage[STORAGE_KEY]["data"] == data


@pytest.mark.parametrize("error", [OSError("private-canary"), asyncio.CancelledError()])
async def test_failed_or_cancelled_write_disables_old_grants(hass, error):
    store = ActionStore(hass)
    await store.async_load()
    await store.async_save(CONNECTION_ID, SCOPES, 0)
    with patch.object(store._store, "async_save", new=AsyncMock(side_effect=error)):
        with pytest.raises((AgentStoreError, asyncio.CancelledError)):
            await store.async_save(CONNECTION_ID, [], 1)
    assert not store.loaded
    with pytest.raises(AgentStoreError):
        store.get(CONNECTION_ID)


@pytest.mark.parametrize("revision", [-1, True, "1", None])
async def test_invalid_revisions(hass, revision):
    store = ActionStore(hass)
    await store.async_load()
    with pytest.raises(AgentPolicyError):
        await store.async_save(CONNECTION_ID, [], revision)


async def test_profile_limit(hass):
    from uuid import uuid4

    store = ActionStore(hass)
    await store.async_load()
    for _ in range(32):
        await store.async_save(str(uuid4()), [], 0)
    with pytest.raises(AgentPolicyError):
        await store.async_save(str(uuid4()), [], 0)


async def test_real_disk_migration_and_reload(hass, tmp_path):
    from pathlib import Path

    hass.config.config_dir = str(tmp_path)
    store = ActionStore(hass)
    path = Path(store._store.path)
    path.parent.mkdir()
    await asyncio.to_thread(
        path.write_text,
        json.dumps(
            {
                "version": 1,
                "minor_version": 1,
                "key": STORAGE_KEY,
                "data": {
                    "profiles": [
                        {
                            "connection_id": CONNECTION_ID,
                            "revision": 1,
                            "action_scopes": SCOPES,
                        }
                    ]
                },
            }
        ),
    )
    with (
        patch.object(Store, "_async_write_data", REAL_WRITE),
        patch.object(Store, "_async_load", REAL_LOAD),
    ):
        await store.async_load()
        assert json.loads(await asyncio.to_thread(path.read_text))["version"] == 2
        await store.async_save(CONNECTION_ID, [], 2)
        other = ActionStore(hass)
        await other.async_load()
    assert other.get(CONNECTION_ID)["revision"] == 3


@pytest.mark.parametrize(
    "shape",
    [
        "parent_link",
        "file_link",
        "directory",
        "oversize",
        "missing",
        "bad_profiles",
        "duplicate_profiles",
    ],
)
def test_policy_disk_preflight_bounds_and_shapes(tmp_path, shape):
    from custom_components.ai_orchestrator.action_store import _preflight

    directory = tmp_path / "storage"
    directory.mkdir()
    path = directory / "actions"
    profile = {
        "connection_id": CONNECTION_ID,
        "revision": 1,
        "action_scopes": SCOPES,
        "switch_reviews": [],
    }
    if shape == "parent_link":
        link = tmp_path / "alias"
        link.symlink_to(directory, target_is_directory=True)
        path = link / "actions"
    elif shape == "file_link":
        real = tmp_path / "real"
        real.write_text("{}")
        path.symlink_to(real)
    elif shape == "directory":
        path.mkdir()
    elif shape == "oversize":
        path.write_bytes(b" " * (2 * 1024 * 1024 + 1))
    elif shape == "missing":
        _preflight(str(path))
        return
    else:
        data = {"profiles": "bad" if shape == "bad_profiles" else [profile, profile]}
        path.write_text(
            json.dumps(
                {"version": 2, "minor_version": 1, "key": STORAGE_KEY, "data": data}
            )
        )
    with pytest.raises(AgentStoreError):
        _preflight(str(path))


async def test_load_readback_conflict_and_invalid_v2_collection(hass):
    store = ActionStore(hass)
    with patch.object(store._store, "async_load", side_effect=[{"profiles": []}, None]):
        with pytest.raises(AgentStoreError):
            await store.async_load()
    for payload in (
        {"profiles": "bad"},
        {
            "profiles": [
                {
                    "connection_id": CONNECTION_ID,
                    "revision": 1,
                    "action_scopes": [],
                    "switch_reviews": [],
                }
            ]
            * 2
        },
    ):
        with patch.object(store._store, "async_load", return_value=payload):
            with pytest.raises(AgentStoreError):
                await store.async_load()


async def test_review_target_cannot_be_substituted(hass):
    from tests.quality.test_switch_review import valid_review

    store = ActionStore(hass)
    await store.async_load()
    with pytest.raises(AgentPolicyError):
        await store.async_save(
            CONNECTION_ID, [], 0, review_update=("different", valid_review())
        )


@pytest.mark.parametrize("change", ["inode", "mtime"])
def test_preflight_detects_read_races(tmp_path, change):
    from types import SimpleNamespace

    from custom_components.ai_orchestrator.action_store import _preflight

    path = tmp_path / "policy"
    path.write_text("{}")
    actual = path.stat()
    changed = SimpleNamespace(
        st_dev=actual.st_dev,
        st_ino=actual.st_ino + (change == "inode"),
        st_size=actual.st_size,
        st_mtime_ns=actual.st_mtime_ns + 1,
    )
    values = [changed] if change == "inode" else [actual, changed]
    with patch(
        "custom_components.ai_orchestrator.action_store.os.fstat", side_effect=values
    ):
        with pytest.raises(AgentStoreError):
            _preflight(str(path))


async def test_storage_serializes_direct_writes_and_survives_cancelled_drain(hass):
    store = ActionStore(hass)
    await store.async_load()
    payload = {"profiles": []}
    await store._store.async_save(payload)
    await store._store.async_save(payload)
    release = asyncio.Event()
    owned = asyncio.create_task(release.wait())
    store._store._writer = owned
    loading = asyncio.create_task(store.async_load())
    await asyncio.sleep(0)
    loading.cancel()
    with pytest.raises(asyncio.CancelledError):
        await loading
    assert store._store._writer is owned and not owned.cancelled()
    release.set()
    await owned
    await store.async_load()
    assert store.loaded
