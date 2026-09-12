"""Workflow storage: validated writes, fail-closed reads, no direct file edits."""

import asyncio
from copy import deepcopy
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.exceptions import HomeAssistantError, UnsupportedStorageVersionError
from homeassistant.helpers.storage import Store
from homeassistant.util.file import WriteError

from custom_components.ai_orchestrator.workflow_schema import WorkflowValidationError
from custom_components.ai_orchestrator.workflow_store import (
    MAX_WORKFLOWS,
    STORAGE_KEY,
    WorkflowNotFoundError,
    WorkflowStore,
    WorkflowStoreError,
)

WORKFLOW_ID = "12345678-1234-4123-8123-123456789abc"


@pytest.fixture
def draft():
    return {
        "schema_version": 1,
        "workflow_id": WORKFLOW_ID,
        "name": "private household name",
        "enabled": True,
        "triggers": [
            {"kind": "state", "entity_ids": ["sensor.synthetic"], "to_state": "on"}
        ],
        "conditions": [],
        "steps": [{"step_id": "compose", "kind": "ai_compose", "prompt": "private"}],
    }


def seed(hass_storage, data):
    hass_storage[STORAGE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": STORAGE_KEY,
        "data": data,
    }


async def test_upsert_persists_and_reloads_from_storage(hass, hass_storage, draft):
    store = WorkflowStore(hass)
    assert not store.loaded
    assert store.list() == []
    await store.async_load()
    assert store.loaded
    assert store.list() == []

    document = await store.async_upsert(draft)
    assert document["workflow_id"] == WORKFLOW_ID
    assert document["description"] == ""
    assert hass_storage[STORAGE_KEY]["data"] == {"workflows": [document]}

    reloaded = WorkflowStore(hass)
    await reloaded.async_load()
    assert reloaded.list() == [document]
    assert reloaded.get(WORKFLOW_ID) == document
    assert reloaded.get("00000000-0000-4000-8000-000000000000") is None


async def test_returned_documents_are_detached(hass, draft):
    store = WorkflowStore(hass)
    await store.async_load()
    await store.async_upsert(draft)
    store.list()[0]["name"] = "mutated"
    store.get(WORKFLOW_ID)["enabled"] = False
    assert store.get(WORKFLOW_ID)["name"] == "private household name"
    assert store.get(WORKFLOW_ID)["enabled"] is True


async def test_invalid_document_is_rejected_and_nothing_is_written(
    hass, hass_storage, draft
):
    store = WorkflowStore(hass)
    await store.async_load()
    with pytest.raises(WorkflowValidationError):
        await store.async_upsert({**draft, "steps": [{"kind": "shell"}]})
    with pytest.raises(WorkflowValidationError):
        await store.async_upsert("not an object")
    assert STORAGE_KEY not in hass_storage
    assert store.list() == []


async def test_writes_require_a_loaded_store(hass, draft):
    store = WorkflowStore(hass)
    with pytest.raises(WorkflowStoreError):
        await store.async_upsert(draft)
    with pytest.raises(WorkflowStoreError):
        await store.async_delete(WORKFLOW_ID)
    with pytest.raises(WorkflowStoreError):
        await store.async_set_enabled(WORKFLOW_ID, False)


async def test_workflow_limit_is_enforced(hass, draft):
    store = WorkflowStore(hass)
    await store.async_load()
    for index in range(MAX_WORKFLOWS):
        await store.async_upsert(
            {**draft, "workflow_id": f"12345678-1234-4123-8123-{index:012d}"}
        )
    assert len(store.list()) == MAX_WORKFLOWS
    with pytest.raises(WorkflowStoreError, match="workflow limit reached"):
        await store.async_upsert(draft)
    # Replacing an existing document is still allowed at the limit.
    existing_id = f"12345678-1234-4123-8123-{0:012d}"
    updated = await store.async_upsert(
        {**draft, "workflow_id": existing_id, "name": "renamed"}
    )
    assert updated["name"] == "renamed"
    assert len(store.list()) == MAX_WORKFLOWS


async def test_set_enabled_revalidates_and_fails_closed(hass, hass_storage, draft):
    store = WorkflowStore(hass)
    await store.async_load()
    inert = {**draft, "enabled": False, "triggers": []}
    await store.async_upsert(inert)
    with pytest.raises(WorkflowValidationError, match="requires a trigger"):
        await store.async_set_enabled(WORKFLOW_ID, True)
    assert store.get(WORKFLOW_ID)["enabled"] is False
    assert hass_storage[STORAGE_KEY]["data"]["workflows"][0]["enabled"] is False
    with pytest.raises(WorkflowNotFoundError):
        await store.async_set_enabled("00000000-0000-4000-8000-000000000000", True)

    await store.async_upsert(draft)
    disabled = await store.async_set_enabled(WORKFLOW_ID, False)
    assert disabled["enabled"] is False
    assert hass_storage[STORAGE_KEY]["data"]["workflows"][0]["enabled"] is False


async def test_delete_reports_existence_and_persists(hass, hass_storage, draft):
    store = WorkflowStore(hass)
    await store.async_load()
    assert await store.async_delete(WORKFLOW_ID) is False
    await store.async_upsert(draft)
    assert await store.async_delete(WORKFLOW_ID) is True
    assert store.list() == []
    assert hass_storage[STORAGE_KEY]["data"] == {"workflows": []}


@pytest.mark.parametrize(
    "data",
    [
        {"other": []},
        {"workflows": {}},
        {"workflows": [], "extra": 1},
        {"workflows": [{"schema_version": 1}]},
        {"workflows": [{"schema_version": 2, "workflow_id": WORKFLOW_ID}]},
        "duplicate",
        "too_many",
    ],
    ids=["shape", "type", "extra", "invalid", "newer", "duplicate", "count"],
)
async def test_unreadable_storage_fails_closed_without_rewriting(
    hass, hass_storage, draft, data
):
    if data == "duplicate":
        data = {"workflows": [draft, draft]}
    elif data == "too_many":
        data = {
            "workflows": [
                {**draft, "workflow_id": f"12345678-1234-4123-8123-{i:012d}"}
                for i in range(MAX_WORKFLOWS + 1)
            ]
        }
    seed(hass_storage, data)
    before = deepcopy(hass_storage)
    store = WorkflowStore(hass)
    with pytest.raises(WorkflowStoreError, match="unreadable"):
        await store.async_load()
    assert not store.loaded
    assert store.list() == []
    assert hass_storage == before


@pytest.mark.parametrize("error", [WriteError("disk"), OSError("disk")])
async def test_swallowed_disk_write_failure_is_detected_by_read_back(
    hass, hass_storage, draft, error
):
    """HA's Store logs a failed write and returns normally; the store must notice."""
    store = WorkflowStore(hass)
    await store.async_load()
    await store.async_upsert(draft)
    before = deepcopy(hass_storage)
    with (
        patch(
            "homeassistant.helpers.storage.Store._async_write_data",
            new=AsyncMock(side_effect=error),
        ),
        pytest.raises(WorkflowStoreError, match="write failed"),
    ):
        await store.async_upsert({**draft, "name": "renamed"})
    assert store.get(WORKFLOW_ID)["name"] == "private household name"
    assert hass_storage == before
    with (
        patch(
            "homeassistant.helpers.storage.Store._async_write_data",
            new=AsyncMock(side_effect=error),
        ),
        pytest.raises(WorkflowStoreError, match="write failed"),
    ):
        await store.async_delete(WORKFLOW_ID)
    assert store.get(WORKFLOW_ID) is not None
    assert hass_storage == before

    # A first write into an empty store that never lands must not report success.
    fresh = WorkflowStore(hass)
    hass_storage.pop(STORAGE_KEY)
    await fresh.async_load()
    with (
        patch(
            "homeassistant.helpers.storage.Store._async_write_data",
            new=AsyncMock(side_effect=error),
        ),
        pytest.raises(WorkflowStoreError, match="write failed"),
    ):
        await fresh.async_upsert(draft)
    assert fresh.list() == []
    assert STORAGE_KEY not in hass_storage


async def test_read_failure_and_unsupported_version_fail_closed(hass, hass_storage):
    for error in (
        HomeAssistantError("read"),
        UnsupportedStorageVersionError(STORAGE_KEY, 2, 1),
    ):
        store = WorkflowStore(hass)
        with (
            patch(
                "homeassistant.helpers.storage.Store._async_load",
                new=AsyncMock(side_effect=error),
            ),
            pytest.raises(WorkflowStoreError, match="unreadable"),
        ):
            await store.async_load()
        assert not store.loaded
    assert STORAGE_KEY not in hass_storage


async def test_overlapping_mutations_are_serialized(hass, hass_storage, draft):
    """Interleaved mutations must all persist; none may overwrite another."""
    store = WorkflowStore(hass)
    await store.async_load()
    original = Store._async_write_data

    async def yielding_write(self, data):
        await asyncio.sleep(0)
        await original(self, data)

    other_id = "12345678-1234-4123-8123-000000000001"
    with patch(
        "homeassistant.helpers.storage.Store._async_write_data",
        new=yielding_write,
    ):
        await asyncio.gather(
            store.async_upsert(draft),
            store.async_upsert({**draft, "workflow_id": other_id}),
            store.async_set_enabled(WORKFLOW_ID, False),
        )
    ids = [item["workflow_id"] for item in store.list()]
    assert ids == [WORKFLOW_ID, other_id]
    assert store.get(WORKFLOW_ID)["enabled"] is False
    stored = hass_storage[STORAGE_KEY]["data"]["workflows"]
    assert [item["workflow_id"] for item in stored] == ids
    assert stored[0]["enabled"] is False
