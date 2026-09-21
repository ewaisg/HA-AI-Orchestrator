"""Real HA Store writes with readonly disk validation and recovery boundaries."""

# ruff: noqa: ASYNC240 -- synchronous tmp_path corruption fixtures, never runtime I/O.

import asyncio
import json
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.helpers.storage import Store

from custom_components.ai_orchestrator import audit_store
from custom_components.ai_orchestrator.audit_schema import AuditValidationError
from custom_components.ai_orchestrator.audit_store import AuditStore, AuditStoreError

REAL_WRITE = Store._async_write_data


@pytest.fixture
def store(hass, tmp_path):
    # HA's hass fixture otherwise replaces this with an in-memory write mock.
    result = AuditStore(hass)
    result._store.path = str(tmp_path / ".storage" / "ai_orchestrator.audit")
    with patch.object(Store, "_async_write_data", REAL_WRITE):
        yield result


async def test_missing_begin_transition_roundtrip(store, hass):
    with pytest.raises(AuditStoreError):
        store.list()
    await store.async_load()
    assert store.list() == []
    row = await store.async_begin("light_turn_on_v1")
    disk = json.loads(Path(store._store.path).read_text())
    assert set(disk) == {"version", "minor_version", "key", "data"}
    assert disk["version"] == disk["minor_version"] == 1
    assert disk["data"]["records"] == [row]
    await store.async_transition(
        row["audit_id"], expected_phase="requested", phase="authorized"
    )
    await store.async_transition(
        row["audit_id"],
        expected_phase="authorized",
        phase="started",
        actions_attempted=1,
    )
    result = await store.async_transition(
        row["audit_id"], expected_phase="started", phase="committed", service_returns=1
    )
    assert result["counts_final"]
    result["phase"] = "private-canary"
    assert store.list()[0]["phase"] == "committed"
    other = AuditStore(hass)
    other._store.path = store._store.path
    await other.async_load()
    assert other.list() == store.list()


async def test_restart_marks_pending_unknown_no_replay(store, hass):
    await store.async_load()
    parent = await store.async_begin("workflow_run")
    child = await store.async_begin(
        "notify", parent_id=parent["audit_id"], step_index=0
    )
    await store.async_transition(
        child["audit_id"], expected_phase="requested", phase="authorized"
    )
    await store.async_transition(
        child["audit_id"],
        expected_phase="authorized",
        phase="started",
        actions_attempted=1,
    )
    other = AuditStore(hass)
    other._store.path = store._store.path
    await other.async_load()
    assert all(
        row["phase"] == "unknown" and not row["counts_final"] for row in other.list()
    )
    assert other.list()[1]["actions_attempted"] == 1
    assert other.list()[1]["service_returns"] == 0
    with pytest.raises(AuditValidationError):
        await other.async_transition(
            child["audit_id"], expected_phase="unknown", phase="started"
        )


@pytest.mark.parametrize(
    "contents",
    [
        b"broken-json",
        b"{}",
        b'{"version":1,"version":1}',
        b'{"version":2,"minor_version":1,"key":"ai_orchestrator.audit","data":{}}',
        b'{"version":1,"minor_version":1,"key":"ai_orchestrator.audit","data":{}}',
    ],
)
async def test_corrupt_forward_and_extra_data_untouched(store, contents):
    path = Path(store._store.path)
    path.parent.mkdir()
    path.write_bytes(contents)
    with pytest.raises(AuditStoreError):
        await store.async_load()
    assert not store.loaded
    assert path.read_bytes() == contents
    assert list(path.parent.iterdir()) == [path]


@pytest.mark.parametrize("error", [OSError("private-canary"), asyncio.CancelledError()])
async def test_failed_or_cancelled_write_invalidates_loaded(store, error):
    await store.async_load()
    with patch.object(store._store, "async_save", new=AsyncMock(side_effect=error)):
        with pytest.raises((AuditStoreError, asyncio.CancelledError)):
            await store.async_begin("workflow_run")
    assert not store.loaded


async def test_readback_failure_and_external_change(store):
    await store.async_load()
    with patch.object(store._store, "async_save", new=AsyncMock()):
        with pytest.raises(AuditStoreError):
            await store.async_begin("workflow_run")
    await store.async_load()
    await store.async_begin("workflow_run")
    path = Path(store._store.path)
    raw = json.loads(path.read_text())
    raw["data"]["next_sequence"] += 1
    path.write_text(json.dumps(raw))
    with pytest.raises(AuditStoreError):
        await store.async_begin("workflow_run")
    assert json.loads(path.read_text()) == raw


async def test_concurrent_begins_serialized_and_stale_transition(store):
    await store.async_load()
    rows = await asyncio.gather(*(store.async_begin("workflow_run") for _ in range(4)))
    assert [row["sequence"] for row in rows] == [1, 2, 3, 4]
    results = await asyncio.gather(
        *(
            store.async_transition(
                rows[0]["audit_id"], expected_phase="requested", phase="authorized"
            )
            for _ in range(2)
        ),
        return_exceptions=True,
    )
    assert sum(isinstance(result, AuditValidationError) for result in results) == 1
    assert len(store.list(after_sequence=2, limit=1)) == 1


async def test_retention_and_caps_keep_pending(store, monkeypatch):
    await store.async_load()
    row = await store.async_begin("workflow_run")
    await store.async_transition(
        row["audit_id"],
        expected_phase="requested",
        phase="failed",
        error_code="not_authorized",
    )
    old = datetime.now(UTC) - timedelta(days=91)
    payload = deepcopy(store._payload)
    payload["records"][0]["created_at"] = old.isoformat()
    await store._commit(payload)
    await store.async_prune()
    assert store.list() == []
    await store.async_prune()
    monkeypatch.setattr(audit_store, "MAX_RECORDS", 1)
    await store.async_begin("workflow_run")
    with pytest.raises(AuditStoreError, match="capacity"):
        await store.async_begin("workflow_run")
    assert len(store.list()) == 1
    first = store.list()[0]
    await store.async_transition(
        first["audit_id"],
        expected_phase="requested",
        phase="failed",
        error_code="not_authorized",
    )
    row = await store.async_begin("workflow_run")
    assert store.list() == [row]


@pytest.mark.parametrize(
    "kwargs", [{"after_sequence": -1}, {"limit": 101}, {"limit": True}]
)
async def test_invalid_page(store, kwargs):
    await store.async_load()
    with pytest.raises(AuditValidationError):
        store.list(**kwargs)


async def test_invalid_begin_and_update(store, monkeypatch):
    await store.async_load()
    with pytest.raises(AuditValidationError):
        await store.async_begin("private-canary")
    with pytest.raises(AuditValidationError):
        await store.async_begin("notify", parent_id="unminted-identity")
    with pytest.raises(AuditValidationError):
        await store.async_transition(
            "missing", expected_phase="requested", phase="authorized"
        )
    monkeypatch.setattr(audit_store, "MAX_SEQUENCE", 1)
    with pytest.raises(AuditStoreError):
        await store.async_begin("workflow_run")


async def test_symlink_file_and_storage_directory_refused(store, tmp_path):
    path = Path(store._store.path)
    path.parent.mkdir()
    target = tmp_path / "other"
    target.write_text("private-canary")
    path.symlink_to(target)
    with pytest.raises(AuditStoreError):
        await store.async_load()
    assert target.read_text() == "private-canary"
    path.unlink()
    path.parent.rmdir()
    path.parent.symlink_to(tmp_path, target_is_directory=True)
    with pytest.raises(AuditStoreError):
        await store.async_load()


async def test_existing_empty_directory_is_missing_store(store):
    Path(store._store.path).parent.mkdir()
    await store.async_load()
    assert store.list() == []


@pytest.mark.parametrize("changed", ["identity", "metadata"])
async def test_read_races_fail_closed(store, changed):
    from types import SimpleNamespace

    await store.async_load()
    await store.async_begin("workflow_run")
    path = Path(store._store.path)
    before = path.stat()
    different = SimpleNamespace(
        st_dev=before.st_dev,
        st_ino=before.st_ino + 1,
        st_size=before.st_size + 1,
        st_mtime_ns=before.st_mtime_ns + 1,
    )
    results = [different] if changed == "identity" else [before, different]
    with patch.object(audit_store.os, "fstat", side_effect=results):
        with pytest.raises(AuditStoreError):
            await store.async_load()
    assert not store.loaded


async def test_byte_bound_evicts_terminal_but_not_pending(store, monkeypatch):
    await store.async_load()
    first = await store.async_begin("workflow_run")
    await store.async_transition(
        first["audit_id"],
        expected_phase="requested",
        phase="failed",
        error_code="not_authorized",
    )
    maximum = Path(store._store.path).stat().st_size + 30
    monkeypatch.setattr(audit_store, "MAX_FILE_BYTES", maximum)
    second = await store.async_begin("workflow_run")
    assert store.list() == [second]
    assert Path(store._store.path).stat().st_size <= maximum
    with pytest.raises(AuditStoreError, match="capacity"):
        await store.async_begin("workflow_run")


async def test_oversize_load_untouched(store, monkeypatch):
    await store.async_load()
    await store.async_begin("workflow_run")
    path = Path(store._store.path)
    before = path.read_bytes()
    monkeypatch.setattr(audit_store, "MAX_FILE_BYTES", 2)
    with pytest.raises(AuditStoreError):
        await store.async_load()
    assert path.read_bytes() == before


async def test_recovery_persistence_failure_blocks_load(store, hass):
    await store.async_load()
    await store.async_begin("workflow_run")
    other = AuditStore(hass)
    other._store.path = store._store.path
    with patch.object(other._store, "async_save", new=AsyncMock()):
        with pytest.raises(AuditStoreError):
            await other.async_load()
    assert not other.loaded


async def test_exact_retention_boundary_and_pending_are_not_evicted(store, freezer):
    await store.async_load()
    terminal = await store.async_begin("workflow_run")
    await store.async_transition(
        terminal["audit_id"],
        expected_phase="requested",
        phase="failed",
        error_code="not_authorized",
    )
    pending = await store.async_begin("workflow_run")
    created = datetime.fromisoformat(terminal["created_at"])
    freezer.move_to(created + timedelta(days=90) - timedelta(microseconds=1))
    await store.async_prune()
    assert len(store.list()) == 2
    freezer.move_to(created + timedelta(days=90))
    await store.async_prune()
    assert store.list() == [pending]


async def test_recovery_clock_reversal_preserves_timestamp(store, hass, freezer):
    await store.async_load()
    row = await store.async_begin("workflow_run")
    created = datetime.fromisoformat(row["created_at"])
    freezer.move_to(created - timedelta(days=1))
    other = AuditStore(hass)
    other._store.path = store._store.path
    await other.async_load()
    assert other.list()[0]["updated_at"] == row["updated_at"]
    assert other.list()[0]["phase"] == "unknown"


async def test_cancelled_executor_write_is_owned_until_reload_settles(store):
    from threading import Event

    entered = Event()
    release = Event()
    original = store._store._write_data

    def blocked_write(data):
        entered.set()
        assert release.wait(5)
        original(data)

    async def threaded_write(data):
        await asyncio.to_thread(blocked_write, data)

    await store.async_load()
    with patch.object(store._store, "_async_write_data", new=threaded_write):
        pending = asyncio.create_task(store.async_begin("workflow_run"))
        assert await asyncio.to_thread(entered.wait, 3)
        pending.cancel()
        await asyncio.sleep(0)
        pending.cancel()
        with pytest.raises(asyncio.CancelledError):
            await pending
        assert not store.loaded
        reload = asyncio.create_task(store.async_load())
        await asyncio.sleep(0)
        assert not reload.done()
        release.set()
        await reload
    assert store.loaded
    assert store.list()[0]["phase"] == "unknown"
    assert store.list()[0]["error_code"] == "interrupted"


async def test_cancelled_write_that_fails_is_settled_before_recovery(store):
    await store.async_load()
    entered = asyncio.Event()
    released = asyncio.Event()

    async def failure(payload):
        entered.set()
        await released.wait()
        raise OSError("private-canary")

    with patch.object(store._store, "async_save", side_effect=failure):
        task = asyncio.create_task(store.async_begin("workflow_run"))
        await entered.wait()
        task.cancel()
        await asyncio.sleep(0)
        released.set()
        with pytest.raises(asyncio.CancelledError):
            await task
    assert not store.loaded
    await store.async_load()
    assert store.list() == []


async def test_repeated_cancel_preserves_owned_write(store):
    await store.async_load()
    entered = asyncio.Event()
    released = asyncio.Event()
    original = store._store.async_save

    async def blocked(payload):
        entered.set()
        await released.wait()
        await original(payload)

    with patch.object(store._store, "async_save", side_effect=blocked):
        task = asyncio.create_task(store.async_begin("workflow_run"))
        await entered.wait()
        task.cancel()
        # Let the first cancellation enter _settle_write before cancelling again.
        for _ in range(3):
            await asyncio.sleep(0)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert store._write_task is not None and not store._write_task.done()
        released.set()
        await store.async_load()
    assert store.list()[0]["phase"] == "unknown"
