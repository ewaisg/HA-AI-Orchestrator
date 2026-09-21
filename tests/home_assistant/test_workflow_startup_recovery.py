"""Startup retries require the original receipt and current loaded dependencies."""

from copy import deepcopy
from unittest.mock import Mock, patch

import pytest
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState
from homeassistant.helpers import entity_registry as er

from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.workflow_manager import WorkflowManager
from custom_components.ai_orchestrator.workflow_store import STORAGE_KEY
from tests.home_assistant.test_workflow_execution import (
    WORKFLOW_ID,
    register_notify_entity,
    register_notify_service,
    register_provider,
    start_manager,
    status,
    workflow,
)


async def staged(hass, *, legacy=False):
    """Persist an enabled reviewed workflow before its next startup."""
    provider, entry = register_provider(hass)
    if legacy:
        register_notify_service(hass)
    else:
        er.async_get(hass).async_get_or_create(
            "notify", "synthetic", "stable-phone", suggested_object_id="synthetic"
        )
        register_notify_entity(hass)
    manager = await start_manager(hass, workflow())
    manager.async_stop()
    hass.state = CoreState.starting
    return provider, entry


@pytest.fixture
def timers():
    """Capture only this manager's bounded timers without advancing global time."""
    queued = []

    def schedule(hass, delay, action):
        assert delay == 5
        cancel = Mock()
        queued.append((action, cancel))
        return cancel

    with patch(
        "custom_components.ai_orchestrator.workflow_manager.async_call_later",
        side_effect=schedule,
    ):
        yield queued


async def started(hass):
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
    await hass.async_block_till_done()


async def tick(hass, timers):
    callback, _ = timers.pop(0)
    callback(None)
    await hass.async_block_till_done()


async def test_delayed_entity_recovers_original_receipt_once_after_started(
    hass, hass_storage, timers
):
    provider, _ = await staged(hass)
    receipt = deepcopy(hass_storage[STORAGE_KEY]["data"]["dry_run_receipts"])
    hass.states.async_remove("notify.synthetic")
    manager = WorkflowManager(hass)
    await manager.async_start()
    assert status(manager)["error"] == "dry_run_required"
    assert not timers and status(manager)["registrations"] == 0
    await started(hass)
    assert len(timers) == 1
    register_notify_entity(hass)
    await tick(hass, timers)
    assert status(manager)["active"] and status(manager)["registrations"] == 1
    assert not timers and manager._startup_cancel is None
    await manager.async_start()
    assert status(manager)["registrations"] == 1
    provider.generate.assert_not_called()
    assert hass_storage[STORAGE_KEY]["data"]["dry_run_receipts"] == receipt
    manager.async_stop()


async def test_provider_must_be_loaded_before_startup_activation(
    hass, hass_storage, timers
):
    _, entry = await staged(hass)
    runtime = async_get_runtime(hass)
    runtime.loaded_provider_entry_ids.clear()
    manager = WorkflowManager(hass)
    await manager.async_start()
    assert not status(manager)["active"]
    await started(hass)
    await tick(hass, timers)
    assert not status(manager)["active"]
    runtime.loaded_provider_entry_ids.add(entry.entry_id)
    await tick(hass, timers)
    assert status(manager)["active"]
    manager.async_stop()


@pytest.mark.parametrize("change", ["entity", "provider", "legacy_restart"])
async def test_recovery_never_approves_changed_identity_or_configuration(
    hass, hass_storage, timers, change
):
    _, entry = await staged(hass, legacy=change == "legacy_restart")
    receipt = deepcopy(hass_storage[STORAGE_KEY]["data"]["dry_run_receipts"])
    if change == "entity":
        registry = er.async_get(hass)
        registry.async_remove("notify.synthetic")
        registry.async_get_or_create(
            "notify", "synthetic", "replacement-phone", suggested_object_id="synthetic"
        )
    elif change == "provider":
        hass.config_entries.async_update_entry(
            entry, data={**entry.data, "provider_config": {"changed": "config"}}
        )
    with patch(
        "custom_components.ai_orchestrator.workflow_manager._PROCESS_ID", "new-process"
    ):
        manager = WorkflowManager(hass)
        await manager.async_start()
        await started(hass)
        await tick(hass, timers)
        assert not status(manager)["active"]
        assert hass_storage[STORAGE_KEY]["data"]["dry_run_receipts"] == receipt
        manager.async_stop()


@pytest.mark.parametrize("mutation", ["disable", "delete"])
async def test_disabled_or_deleted_workflow_is_never_reactivated(
    hass, hass_storage, timers, mutation
):
    await staged(hass)
    hass.states.async_remove("notify.synthetic")
    manager = WorkflowManager(hass)
    await manager.async_start()
    await started(hass)
    if mutation == "disable":
        await manager.async_set_enabled(WORKFLOW_ID, False)
    else:
        await manager.async_delete(WORKFLOW_ID)
    register_notify_entity(hass)
    await tick(hass, timers)
    assert not manager._observers and not timers
    manager.async_stop()


async def test_retry_is_bounded_and_stop_cancels_owned_callback(
    hass, hass_storage, timers
):
    await staged(hass)
    hass.states.async_remove("notify.synthetic")
    hass.state = CoreState.running
    manager = WorkflowManager(hass)
    await manager.async_start()
    assert len(timers) == 1
    for _ in range(60):
        await tick(hass, timers)
    assert not timers and manager._startup_cancel is None
    register_notify_entity(hass)
    assert not status(manager)["active"]
    manager.async_stop()

    hass.states.async_remove("notify.synthetic")
    await manager.async_start()
    old_callback, cancel = timers.pop(0)
    manager.async_stop()
    cancel.assert_called_once()
    register_notify_entity(hass)
    old_callback(None)
    assert not manager._observers and not timers


async def test_stop_before_started_revokes_event_listener(hass, hass_storage, timers):
    await staged(hass)
    hass.states.async_remove("notify.synthetic")
    manager = WorkflowManager(hass)
    await manager.async_start()
    manager.async_stop()
    register_notify_entity(hass)
    await started(hass)
    assert not timers and not manager._observers


async def test_mutation_lock_and_previous_start_callback_cannot_reactivate(
    hass, hass_storage, timers
):
    await staged(hass)
    hass.state = CoreState.running
    hass.states.async_remove("notify.synthetic")
    manager = WorkflowManager(hass)
    await manager.async_start()
    old_callback, _ = timers.pop(0)
    manager.async_stop()
    await manager.async_start()
    assert len(timers) == 1
    current_cancel = manager._startup_cancel
    old_callback(None)
    assert manager._startup_cancel is current_cancel and len(timers) == 1
    register_notify_entity(hass)
    async with manager._lock:
        await tick(hass, timers)
        assert not status(manager)["active"]
    await tick(hass, timers)
    assert status(manager)["active"]
    manager.async_stop()
