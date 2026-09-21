"""Publication requires persisted validation of the exact executable draft."""

import asyncio
from copy import deepcopy
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.helpers import entity_registry as er

from custom_components.ai_orchestrator import async_unload_entry
from custom_components.ai_orchestrator.providers.contract import TextGenerationResult
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.workflow_manager import (
    WorkflowDryRunRequired,
    WorkflowManager,
)
from custom_components.ai_orchestrator.workflow_store import STORAGE_KEY, WorkflowStore
from tests.home_assistant.test_workflow_dry_run_api import (
    CONNECTION_ID,
    WORKFLOW,
    WORKFLOW_ID,
    call,
    dry_run,
    setup,
)


async def staged(hass):
    provider, entry = await setup(hass)
    manager = async_get_runtime(hass).workflow_manager
    document = {
        **WORKFLOW,
        "run_mode": "execute",
        "provider_connection_id": CONNECTION_ID,
    }
    await manager.async_save(document)
    hass.services.async_register("notify", "synthetic", AsyncMock())
    return provider, entry, manager


async def test_new_execute_publication_requires_receipt(hass, hass_storage):
    _, _, manager = await staged(hass)
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_save({**manager.get(WORKFLOW_ID), "enabled": True})
    assert not manager.get(WORKFLOW_ID)["enabled"]
    assert not manager.status()["workflows"][0]["status"]["active"]


async def test_successful_dry_run_persists_and_survives_restart(
    hass, hass_storage, hass_ws_client
):
    _, _, manager = await staged(hass)
    client = await hass_ws_client(hass)
    response = await call(client, dry_run())
    assert response["result"]["actions_executed"] == 0
    assert STORAGE_KEY in hass_storage
    assert WORKFLOW_ID in hass_storage[STORAGE_KEY]["data"]["dry_run_receipts"]
    await manager.async_set_enabled(WORKFLOW_ID, True)
    manager.async_stop()
    replacement = WorkflowManager(hass)
    await replacement.async_start()
    assert replacement.status()["workflows"][0]["status"]["active"]
    replacement.async_stop()


@pytest.mark.parametrize("change", ["prompt", "provider", "target", "name"])
async def test_executable_edit_invalidates_receipt(
    hass, hass_storage, hass_ws_client, change
):
    _, _, manager = await staged(hass)
    client = await hass_ws_client(hass)
    assert (await call(client, dry_run()))["success"]
    document = deepcopy(manager.get(WORKFLOW_ID))
    if change == "prompt":
        document["steps"][0]["prompt"] = "Changed prompt"
    elif change == "provider":
        document["provider_connection_id"] = "12345678-1234-4234-9234-123456789abd"
    elif change == "target":
        document["steps"][1]["notify_service"] = "notify.other"
    else:
        document["name"] = "Changed title"
    await manager.async_save(document)
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)
    assert not hass_storage[STORAGE_KEY]["data"].get("dry_run_receipts")


@pytest.mark.parametrize(
    "problem", ["missing_target", "failed", "wrong_provider", "ineligible"]
)
async def test_invalid_dry_run_cannot_publish(
    hass, hass_storage, hass_ws_client, problem
):
    provider, _, manager = await staged(hass)
    request = dry_run()
    if problem == "missing_target":
        hass.services.async_remove("notify", "synthetic")
    elif problem == "failed":
        provider.generate.return_value = TextGenerationResult(text=" ")
    elif problem == "wrong_provider":
        await manager.async_save(
            {
                **manager.get(WORKFLOW_ID),
                "provider_connection_id": "12345678-1234-4234-9234-123456789abd",
            }
        )
    else:
        request["snapshot_json"] = (
            '{"states":{},"time":"20:00","event":{"kind":"manual"}}'
        )
    client = await hass_ws_client(hass)
    await call(client, request)
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)


async def test_changed_while_dry_run_waits_cannot_publish(
    hass, hass_storage, hass_ws_client
):
    provider, _, manager = await staged(hass)
    started, release = asyncio.Event(), asyncio.Event()

    async def slow(request):
        started.set()
        await release.wait()
        return TextGenerationResult(text="Synthetic notification")

    provider.generate.side_effect = slow
    client = await hass_ws_client(hass)
    pending = asyncio.create_task(call(client, dry_run()))
    await started.wait()
    await manager.async_save({**manager.get(WORKFLOW_ID), "name": "Changed"})
    release.set()
    assert (await pending)["success"]
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)


async def test_legacy_enabled_execute_stays_inactive(hass, hass_storage):
    _, _, manager = await staged(hass)
    legacy = {**manager.get(WORKFLOW_ID), "enabled": True}
    manager.async_stop()
    hass_storage[STORAGE_KEY]["data"] = {"workflows": [legacy]}
    replacement = WorkflowManager(hass)
    await replacement.async_start()
    status = replacement.status()["workflows"][0]["status"]
    assert status["active"] is False
    assert status["error"] == "dry_run_required"
    replacement.async_stop()


async def test_store_rejects_stale_receipt_and_deletes_receipts(hass, hass_storage):
    _, _, manager = await staged(hass)
    store = manager._store
    original = manager.get(WORKFLOW_ID)
    await store.async_upsert({**original, "name": "Changed"})
    assert not await store.async_record_dry_run(
        original, manager.publication_bindings(original)
    )
    current = store.get(WORKFLOW_ID)
    assert await store.async_record_dry_run(
        current, manager.publication_bindings(current)
    )
    await store.async_delete(WORKFLOW_ID)
    restored = WorkflowStore(hass)
    await restored.async_load()
    assert not restored.has_dry_run(current, manager.publication_bindings(current))


async def test_failed_receipt_write_does_not_authorize(
    hass, hass_storage, hass_ws_client
):
    _, _, manager = await staged(hass)
    client = await hass_ws_client(hass)
    with patch.object(manager._store._store, "async_save", new=AsyncMock()):
        result = await call(client, dry_run())
    assert not result["success"]
    assert result["error"]["code"] == "workflow_store_unavailable"
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)
    assert not hass_storage[STORAGE_KEY]["data"].get("dry_run_receipts")


async def test_receipt_and_other_workflow_write_are_serialized(hass, hass_storage):
    _, _, manager = await staged(hass)
    original = manager.get(WORKFLOW_ID)
    other = {**original, "workflow_id": "12345678-1234-4123-8123-123456789abd"}
    await asyncio.gather(
        manager._store.async_record_dry_run(
            original, manager.publication_bindings(original)
        ),
        manager._store.async_upsert(other),
    )
    restored = WorkflowStore(hass)
    await restored.async_load()
    assert restored.has_dry_run(original, manager.publication_bindings(original))
    assert restored.get(other["workflow_id"]) == other


async def test_staged_observe_can_be_promoted_after_dry_run(
    hass, hass_storage, hass_ws_client
):
    _, _, manager = await staged(hass)
    await manager.async_save({**manager.get(WORKFLOW_ID), "run_mode": "observe"})
    client = await hass_ws_client(hass)
    assert (await call(client, dry_run()))["success"]
    await manager.async_save(
        {**manager.get(WORKFLOW_ID), "run_mode": "execute", "enabled": True}
    )
    assert manager.status()["workflows"][0]["status"]["active"]
    manager.async_stop()


@pytest.mark.parametrize("receipt", ["0" * 64, "not-a-digest", 3])
async def test_invalid_persisted_receipt_never_activates(hass, hass_storage, receipt):
    _, _, manager = await staged(hass)
    document = {**manager.get(WORKFLOW_ID), "enabled": True}
    manager.async_stop()
    hass_storage[STORAGE_KEY]["data"] = {
        "workflows": [document],
        "dry_run_receipts": {WORKFLOW_ID: receipt},
    }
    replacement = WorkflowManager(hass)
    await replacement.async_start()
    report = replacement.status()
    assert report["store"] == "unreadable" or all(
        not item["status"]["active"] for item in report["workflows"]
    )


@pytest.mark.parametrize("change", ["provider", "service", "process"])
async def test_actual_route_or_registration_change_requires_new_dry_run(
    hass, hass_storage, hass_ws_client, change
):
    _, entry, manager = await staged(hass)
    client = await hass_ws_client(hass)
    assert (await call(client, dry_run()))["success"]
    if change == "provider":
        hass.config_entries.async_update_entry(
            entry,
            data={**entry.data, "provider_config": {"synthetic": "different-route"}},
        )
    elif change == "service":
        hass.services.async_remove("notify", "synthetic")
        hass.services.async_register("notify", "synthetic", AsyncMock())
    else:
        with patch(
            "custom_components.ai_orchestrator.workflow_manager._PROCESS_ID",
            "new-process",
        ):
            with pytest.raises(WorkflowDryRunRequired):
                await manager.async_set_enabled(WORKFLOW_ID, True)
        return
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)


async def test_registry_identity_survives_process_but_recreation_requires_dry_run(
    hass, hass_storage, hass_ws_client
):
    _, _, manager = await staged(hass)
    registry = er.async_get(hass)
    target = registry.async_get_or_create(
        "notify", "synthetic", "original", suggested_object_id="synthetic"
    )
    assert target.entity_id == "notify.synthetic"
    hass.states.async_set(target.entity_id, "unknown")
    client = await hass_ws_client(hass)
    assert (await call(client, dry_run()))["success"]
    with patch(
        "custom_components.ai_orchestrator.workflow_manager._PROCESS_ID", "new-process"
    ):
        await manager.async_set_enabled(WORKFLOW_ID, True)
    await manager.async_set_enabled(WORKFLOW_ID, False)
    registry.async_remove(target.entity_id)
    hass.states.async_remove(target.entity_id)
    replacement = registry.async_get_or_create(
        "notify", "synthetic", "replacement", suggested_object_id="synthetic"
    )
    assert replacement.entity_id == target.entity_id
    assert replacement.id != target.id
    hass.states.async_set(replacement.entity_id, "unknown")
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)


async def test_provider_change_while_waiting_receipt_lock_is_rejected(
    hass, hass_storage, hass_ws_client
):
    _, entry, manager = await staged(hass)
    client = await hass_ws_client(hass)
    await manager._lock.acquire()
    pending = asyncio.create_task(call(client, dry_run()))
    # The transport/provider path must finish and wait for the held manager lock.
    for _ in range(20):
        await asyncio.sleep(0)
        if manager._lock._waiters:
            break
    assert manager._lock._waiters
    hass.config_entries.async_update_entry(
        entry, data={**entry.data, "provider_config": {"synthetic": "changed-route"}}
    )
    manager._lock.release()
    assert (await pending)["success"]
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)


@pytest.mark.parametrize("mutation", ["save", "disable"])
async def test_cancelled_write_deactivates_old_listener(
    hass, hass_storage, hass_ws_client, mutation
):
    _, _, manager = await staged(hass)
    client = await hass_ws_client(hass)
    assert (await call(client, dry_run()))["success"]
    await manager.async_set_enabled(WORKFLOW_ID, True)
    persisted = asyncio.Event()
    method = "async_upsert" if mutation == "save" else "async_set_enabled"
    original = getattr(manager._store, method)

    async def ambiguous(*args):
        await original(*args)
        persisted.set()
        await asyncio.Event().wait()

    with patch.object(manager._store, method, ambiguous):
        if mutation == "save":
            task = asyncio.create_task(
                manager.async_save({**manager.get(WORKFLOW_ID), "enabled": False})
            )
        else:
            task = asyncio.create_task(manager.async_set_enabled(WORKFLOW_ID, False))
        await persisted.wait()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    assert not manager.status()["workflows"][0]["status"]["active"]


async def test_reconfigure_waiting_for_platform_unload_cannot_dry_run_old_provider(
    hass, hass_storage, hass_ws_client
):
    provider, entry, manager = await staged(hass)
    runtime = async_get_runtime(hass)
    runtime.conversation_entry_ids.add(entry.entry_id)
    started, release = asyncio.Event(), asyncio.Event()

    async def blocked_unload(*args):
        started.set()
        await release.wait()
        return True

    hass.config_entries.async_update_entry(
        entry, data={**entry.data, "provider_config": {"synthetic": "replacement"}}
    )
    with patch.object(hass.config_entries, "async_unload_platforms", blocked_unload):
        unload = asyncio.create_task(async_unload_entry(hass, entry))
        await started.wait()
        try:
            assert entry.entry_id in runtime.loaded_provider_entry_ids
            client = await hass_ws_client(hass)
            result = await call(client, dry_run())
            assert not result["success"]
            assert result["error"]["code"] == "dry_run_provider_unavailable"
            provider.generate.assert_not_awaited()
        finally:
            release.set()
            assert await unload
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(WORKFLOW_ID, True)
