"""Workflow activation lifecycle over stored documents on the named Core."""

import asyncio
from copy import deepcopy
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator import (
    async_setup_entry,
    async_unload_entry,
)
from custom_components.ai_orchestrator.const import DOMAIN, FOUNDATION_ENTRY_UNIQUE_ID
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.workflow_manager import (
    ERROR_ACTIVATION_FAILED,
    ERROR_CLEANUP_FAILED,
    STORE_NOT_LOADED,
    STORE_READY,
    STORE_UNREADABLE,
    WorkflowManager,
    WorkflowManagerError,
)
from custom_components.ai_orchestrator.workflow_store import STORAGE_KEY

WORKFLOW_A = "12345678-1234-4123-8123-aaaaaaaaaaaa"
WORKFLOW_B = "12345678-1234-4123-8123-bbbbbbbbbbbb"


def document(workflow_id, *, enabled=True, entity="sensor.synthetic"):
    return {
        "schema_version": 1,
        "workflow_id": workflow_id,
        "name": "private household name",
        "description": "",
        "enabled": enabled,
        "triggers": [{"kind": "state", "entity_ids": [entity], "to_state": "on"}],
        "conditions": [],
        "steps": [{"step_id": "compose", "kind": "ai_compose", "prompt": "private"}],
    }


def seed(hass_storage, *documents):
    hass_storage[STORAGE_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": STORAGE_KEY,
        "data": {"workflows": list(documents)},
    }


def status_of(manager, workflow_id):
    for item in manager.status()["workflows"]:
        if item["workflow"]["workflow_id"] == workflow_id:
            return item["status"]
    raise AssertionError("workflow missing from status")


async def flip(hass, entity="sensor.synthetic"):
    hass.states.async_set(entity, "off")
    await hass.async_block_till_done()
    hass.states.async_set(entity, "on")
    await hass.async_block_till_done()


async def test_start_activates_only_enabled_documents(hass, hass_storage):
    seed(hass_storage, document(WORKFLOW_A), document(WORKFLOW_B, enabled=False))
    manager = WorkflowManager(hass)
    assert manager.status() == {"store": STORE_NOT_LOADED, "workflows": []}
    await manager.async_start()
    await manager.async_start()
    assert manager.started
    status = manager.status()
    assert status["store"] == STORE_READY
    assert [item["workflow"]["workflow_id"] for item in status["workflows"]] == [
        WORKFLOW_A,
        WORKFLOW_B,
    ]
    assert status_of(manager, WORKFLOW_A)["active"] is True
    assert status_of(manager, WORKFLOW_A)["registrations"] == 1
    assert status_of(manager, WORKFLOW_B) == {
        "active": False,
        "observations": 0,
        "ignored_events": 0,
        "registrations": 0,
        "latest": None,
        "error": None,
    }

    await flip(hass)
    assert status_of(manager, WORKFLOW_A)["observations"] == 1
    assert status_of(manager, WORKFLOW_A)["latest"]["eligible"] is True
    assert status_of(manager, WORKFLOW_A)["latest"]["mode"] == "observation_only"
    assert status_of(manager, WORKFLOW_B)["observations"] == 0

    manual = manager.run_manual(WORKFLOW_A)
    assert manual["triggered"] is False  # a state trigger ignores manual events
    assert manual["provider_calls"] == manual["actions_executed"] == 0
    with pytest.raises(WorkflowManagerError):
        manager.run_manual(WORKFLOW_B)

    assert manager.async_stop() is True
    assert not manager.started
    # A deactivated workflow drops its observer: no stale evidence survives it.
    assert status_of(manager, WORKFLOW_A)["active"] is False
    assert status_of(manager, WORKFLOW_A)["registrations"] == 0
    await flip(hass)
    assert status_of(manager, WORKFLOW_A)["observations"] == 0


async def test_save_replaces_the_observer_and_enabled_flag_applies_live(
    hass, hass_storage
):
    seed(hass_storage, document(WORKFLOW_A))
    manager = WorkflowManager(hass)
    await manager.async_start()

    saved = await manager.async_save(document(WORKFLOW_A, entity="sensor.other"))
    assert saved["triggers"][0]["entity_ids"] == ["sensor.other"]
    assert hass_storage[STORAGE_KEY]["data"]["workflows"] == [saved]
    await flip(hass, "sensor.synthetic")
    assert status_of(manager, WORKFLOW_A)["observations"] == 0
    await flip(hass, "sensor.other")
    assert status_of(manager, WORKFLOW_A)["observations"] == 1

    disabled = await manager.async_set_enabled(WORKFLOW_A, False)
    assert disabled["enabled"] is False
    assert status_of(manager, WORKFLOW_A)["active"] is False
    await flip(hass, "sensor.other")
    assert status_of(manager, WORKFLOW_A)["observations"] == 0

    enabled = await manager.async_set_enabled(WORKFLOW_A, True)
    assert enabled["enabled"] is True
    assert status_of(manager, WORKFLOW_A)["active"] is True
    await flip(hass, "sensor.other")
    # The entity already existed, so on->off and off->on are both observed.
    assert status_of(manager, WORKFLOW_A)["observations"] == 2
    assert status_of(manager, WORKFLOW_A)["latest"]["triggered"] is True

    assert await manager.async_delete(WORKFLOW_A) is True
    assert await manager.async_delete(WORKFLOW_A) is False
    assert manager.status()["workflows"] == []
    assert hass_storage[STORAGE_KEY]["data"] == {"workflows": []}
    await flip(hass, "sensor.other")
    with pytest.raises(WorkflowManagerError):
        manager.run_manual(WORKFLOW_A)
    assert manager.async_stop() is True


async def test_unreadable_store_keeps_everything_inactive_and_read_only(
    hass, hass_storage
):
    seed(hass_storage, {"schema_version": 1})
    before = deepcopy(hass_storage)
    manager = WorkflowManager(hass)
    await manager.async_start()
    assert manager.started
    assert manager.status() == {"store": STORE_UNREADABLE, "workflows": []}
    with pytest.raises(WorkflowManagerError):
        await manager.async_save(document(WORKFLOW_A))
    with pytest.raises(WorkflowManagerError):
        await manager.async_delete(WORKFLOW_A)
    with pytest.raises(WorkflowManagerError):
        await manager.async_set_enabled(WORKFLOW_A, False)
    with pytest.raises(WorkflowManagerError):
        manager.run_manual(WORKFLOW_A)
    assert hass_storage == before
    assert manager.async_stop() is True


async def test_activation_failure_is_recorded_and_recoverable(hass, hass_storage):
    seed(hass_storage, document(WORKFLOW_A))
    manager = WorkflowManager(hass)
    with patch(
        "custom_components.ai_orchestrator.workflow_observer."
        "async_track_state_change_event",
        side_effect=RuntimeError("private helper failure"),
    ):
        await manager.async_start()
    status = status_of(manager, WORKFLOW_A)
    assert status["active"] is False
    assert status["error"] == ERROR_ACTIVATION_FAILED
    with pytest.raises(WorkflowManagerError):
        manager.run_manual(WORKFLOW_A)

    await manager.async_save(document(WORKFLOW_A))
    status = status_of(manager, WORKFLOW_A)
    assert status["active"] is True
    assert status["error"] is None
    assert manager.async_stop() is True


async def test_cleanup_failure_is_retained_and_retried(hass, hass_storage):
    seed(hass_storage, document(WORKFLOW_A))
    unsubscribe = Mock(side_effect=RuntimeError("private unsubscribe failure"))
    manager = WorkflowManager(hass)
    with patch(
        "custom_components.ai_orchestrator.workflow_observer."
        "async_track_state_change_event",
        return_value=unsubscribe,
    ):
        await manager.async_start()
    assert status_of(manager, WORKFLOW_A)["active"] is True

    assert manager.async_stop() is False
    assert status_of(manager, WORKFLOW_A)["error"] == ERROR_CLEANUP_FAILED
    assert status_of(manager, WORKFLOW_A)["active"] is False
    assert unsubscribe.call_count == 2  # deactivate, then one retry

    # Re-activation of that workflow is refused until cleanup succeeds.
    await manager.async_start()
    assert status_of(manager, WORKFLOW_A)["error"] == ERROR_CLEANUP_FAILED
    assert status_of(manager, WORKFLOW_A)["active"] is False
    assert unsubscribe.call_count == 3

    unsubscribe.side_effect = None
    saved = await manager.async_save(document(WORKFLOW_A))
    assert saved["enabled"] is True
    assert status_of(manager, WORKFLOW_A)["error"] is None
    assert status_of(manager, WORKFLOW_A)["active"] is True
    assert manager.async_stop() is True


async def test_read_failure_during_setup_keeps_the_foundation_loaded(
    hass: HomeAssistant, hass_storage
) -> None:
    entry = MockConfigEntry(
        domain=DOMAIN, data={}, unique_id=FOUNDATION_ENTRY_UNIQUE_ID
    )
    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch("custom_components.ai_orchestrator.async_unregister_panel", new=Mock()),
        patch(
            "homeassistant.helpers.storage.Store._async_load",
            new=AsyncMock(side_effect=HomeAssistantError("private read failure")),
        ),
    ):
        assert await async_setup_entry(hass, entry)
        runtime = async_get_runtime(hass)
        assert entry.entry_id in runtime.loaded_foundation_entry_ids
        assert runtime.workflow_manager is not None
        assert runtime.workflow_manager.status() == {
            "store": STORE_UNREADABLE,
            "workflows": [],
        }
        assert await async_unload_entry(hass, entry)


async def test_mutation_finishing_after_stop_does_not_activate(hass, hass_storage):
    seed(hass_storage, document(WORKFLOW_A, enabled=False))
    manager = WorkflowManager(hass)
    await manager.async_start()
    original = Store._async_write_data
    release = asyncio.Event()

    async def blocked_write(self, data):
        await release.wait()
        await original(self, data)

    with patch(
        "homeassistant.helpers.storage.Store._async_write_data", new=blocked_write
    ):
        save = asyncio.ensure_future(manager.async_set_enabled(WORKFLOW_A, True))
        await asyncio.sleep(0)
        assert manager.async_stop() is True
        release.set()
        saved = await save
    assert saved["enabled"] is True
    assert hass_storage[STORAGE_KEY]["data"]["workflows"][0]["enabled"] is True
    assert status_of(manager, WORKFLOW_A)["active"] is False
    assert status_of(manager, WORKFLOW_A)["registrations"] == 0
    await flip(hass)
    assert status_of(manager, WORKFLOW_A)["observations"] == 0

    # The next start reads the persisted enabled flag and activates normally.
    await manager.async_start()
    assert status_of(manager, WORKFLOW_A)["active"] is True
    assert manager.async_stop() is True


async def test_overlapping_saves_keep_observers_consistent_with_the_store(
    hass, hass_storage
):
    manager = WorkflowManager(hass)
    await manager.async_start()
    original = Store._async_write_data

    async def yielding_write(self, data):
        await asyncio.sleep(0)
        await original(self, data)

    with patch(
        "homeassistant.helpers.storage.Store._async_write_data", new=yielding_write
    ):
        await asyncio.gather(
            manager.async_save(document(WORKFLOW_A)),
            manager.async_save(document(WORKFLOW_B, entity="sensor.other")),
        )
    status = manager.status()
    assert [item["workflow"]["workflow_id"] for item in status["workflows"]] == [
        WORKFLOW_A,
        WORKFLOW_B,
    ]
    assert all(item["status"]["active"] for item in status["workflows"])
    await flip(hass, "sensor.synthetic")
    await flip(hass, "sensor.other")
    assert status_of(manager, WORKFLOW_A)["observations"] == 1
    assert status_of(manager, WORKFLOW_B)["observations"] == 1
    assert manager.async_stop() is True


async def test_delete_in_flight_across_stop_and_start_leaves_no_orphan(
    hass, hass_storage
):
    seed(hass_storage, document(WORKFLOW_A))
    manager = WorkflowManager(hass)
    await manager.async_start()
    original = Store._async_write_data
    release = asyncio.Event()

    async def blocked_write(self, data):
        await release.wait()
        await original(self, data)

    with patch(
        "homeassistant.helpers.storage.Store._async_write_data", new=blocked_write
    ):
        delete = asyncio.ensure_future(manager.async_delete(WORKFLOW_A))
        await asyncio.sleep(0)
        assert manager.async_stop() is True
        restart = asyncio.ensure_future(manager.async_start())
        await asyncio.sleep(0)
        assert not manager.started  # start waits for the in-flight delete
        release.set()
        assert await delete is True
        await restart
    assert manager.started
    assert manager.status() == {"store": STORE_READY, "workflows": []}
    assert manager._observers == {}  # noqa: SLF001 -- orphan check needs internals
    await flip(hass)
    assert manager._observers == {}  # noqa: SLF001
    assert manager.async_stop() is True


async def test_interleaved_save_and_delete_of_the_same_workflow(hass, hass_storage):
    manager = WorkflowManager(hass)
    await manager.async_start()
    original = Store._async_write_data

    async def yielding_write(self, data):
        await asyncio.sleep(0)
        await original(self, data)

    with patch(
        "homeassistant.helpers.storage.Store._async_write_data", new=yielding_write
    ):
        saved, deleted = await asyncio.gather(
            manager.async_save(document(WORKFLOW_A)),
            manager.async_delete(WORKFLOW_A),
        )
    assert saved["workflow_id"] == WORKFLOW_A
    assert deleted is True
    assert manager.status()["workflows"] == []
    assert hass_storage[STORAGE_KEY]["data"] == {"workflows": []}
    assert manager._observers == {}  # noqa: SLF001 -- no active listener may remain
    assert manager.async_stop() is True


async def test_foundation_entry_owns_manager_across_unload_and_restart(
    hass: HomeAssistant, hass_storage
) -> None:
    seed(hass_storage, document(WORKFLOW_A))
    hass.states.async_set("sensor.synthetic", "off")
    await hass.async_block_till_done()
    entry = MockConfigEntry(
        domain=DOMAIN, data={}, unique_id=FOUNDATION_ENTRY_UNIQUE_ID
    )
    patches = (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch("custom_components.ai_orchestrator.async_unregister_panel", new=Mock()),
    )

    with patches[0], patches[1]:
        assert await async_setup_entry(hass, entry)
        runtime = async_get_runtime(hass)
        first = runtime.workflow_manager
        assert first is not None and first.started
        await flip(hass)
        assert status_of(first, WORKFLOW_A)["observations"] == 1

        assert await async_unload_entry(hass, entry)
        assert runtime.workflow_manager is None
        assert not first.started
        assert status_of(first, WORKFLOW_A)["active"] is False
        await flip(hass)
        assert status_of(first, WORKFLOW_A)["observations"] == 0

        # Simulated restart: a fresh setup reads the same persisted store.
        assert await async_setup_entry(hass, entry)
        second = runtime.workflow_manager
        assert second is not None and second is not first and second.started
        assert status_of(second, WORKFLOW_A)["observations"] == 0
        assert status_of(second, WORKFLOW_A)["active"] is True
        await flip(hass)
        assert status_of(second, WORKFLOW_A)["observations"] == 2  # on->off, off->on
        assert status_of(second, WORKFLOW_A)["latest"]["triggered"] is True
        assert status_of(first, WORKFLOW_A)["observations"] == 0
        assert await async_unload_entry(hass, entry)


async def test_leftover_manager_with_failed_cleanup_is_reused_on_next_setup(
    hass: HomeAssistant, hass_storage
) -> None:
    seed(hass_storage, document(WORKFLOW_A))
    unsubscribe = Mock(side_effect=RuntimeError("private unsubscribe failure"))
    entry = MockConfigEntry(
        domain=DOMAIN, data={}, unique_id=FOUNDATION_ENTRY_UNIQUE_ID
    )
    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch("custom_components.ai_orchestrator.async_unregister_panel", new=Mock()),
        patch(
            "custom_components.ai_orchestrator.workflow_observer."
            "async_track_state_change_event",
            return_value=unsubscribe,
        ),
    ):
        assert await async_setup_entry(hass, entry)
        runtime = async_get_runtime(hass)
        leftover = runtime.workflow_manager
        assert await async_unload_entry(hass, entry)
        assert runtime.workflow_manager is leftover
        assert status_of(leftover, WORKFLOW_A)["error"] == ERROR_CLEANUP_FAILED

        unsubscribe.side_effect = None
        assert await async_setup_entry(hass, entry)
        assert runtime.workflow_manager is leftover
        assert status_of(leftover, WORKFLOW_A)["error"] is None
        assert status_of(leftover, WORKFLOW_A)["active"] is True
        assert await async_unload_entry(hass, entry)
        assert runtime.workflow_manager is None
