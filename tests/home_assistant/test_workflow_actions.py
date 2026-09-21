"""Unattended light workflows require independent exact durable authorization."""

import asyncio
from copy import deepcopy
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from homeassistant.helpers import device_registry as dr, entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator.agent_store import AgentPolicyError
from custom_components.ai_orchestrator.audit_store import AuditStore
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.workflow_actions import WorkflowActions
from custom_components.ai_orchestrator.workflow_manager import WorkflowManager, WorkflowDryRunRequired

ASSERTIONS = {"ordinary_lighting": True, "allow_unattended": True}


def memory_store(store):
    persisted = None
    async def read():
        return deepcopy(persisted)
    async def save(value):
        nonlocal persisted
        persisted = deepcopy(value)
    store._disk = AsyncMock(side_effect=read)
    store._store.async_save = AsyncMock(side_effect=save)


async def setup_light_workflow(hass):
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic")
    audit = AuditStore(hass)
    memory_store(audit)
    await audit.async_load()
    runtime.audit_store = audit
    manager = WorkflowManager(hass)
    runtime.workflow_manager = manager
    actions = WorkflowActions(hass, manager, audit)
    runtime.workflow_actions = actions
    manager.set_action_service(actions)
    memory_store(actions.store)
    await actions.async_start()
    await manager.async_start()
    config = MockConfigEntry(domain="test", unique_id="synthetic-hardware", data={})
    config.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(config_entry_id=config.entry_id, identifiers={("test", "single-light")})
    entry = er.async_get(hass).async_get_or_create("light", "test", "synthetic-light", config_entry=config, device_id=device.id)
    hass.states.async_set(entry.entity_id, "off")
    hass.states.async_set("binary_sensor.synthetic_trigger", "off")
    service = AsyncMock()
    hass.services.async_register("light", "turn_on", service)
    hass.services.async_register("light", "turn_off", service)
    document = await manager.async_save({"schema_version": 1, "workflow_id": str(uuid4()), "name": "Synthetic light automation", "enabled": False, "run_mode": "execute", "provider_connection_id": None, "triggers": [{"kind": "state", "entity_ids": ["binary_sensor.synthetic_trigger"], "to_state": "on"}], "conditions": [], "steps": [{"step_id": "light", "kind": "light_control", "target_registry_id": entry.id, "operation": "turn_on"}]})
    return actions, manager, document, entry, service, config


async def authorize(actions, document, user_id):
    preview = await actions.async_preview(document["workflow_id"], user_id)
    assert preview["workflow"] == document
    return await actions.async_authorize(document["workflow_id"], preview["document_version"], preview["revision"], preview["authorization_token"], ASSERTIONS, user_id)


async def publish(actions, manager, document, user_id):
    await authorize(actions, document, user_id)
    binding = await actions.async_validate(document, user_id)
    assert await manager.async_record_dry_run(document, None, binding)
    return await manager.async_set_enabled(document["workflow_id"], True)


async def trigger(hass):
    hass.states.async_set("binary_sensor.synthetic_trigger", "off")
    await hass.async_block_till_done()
    hass.states.async_set("binary_sensor.synthetic_trigger", "on")
    await hass.async_block_till_done()


async def test_three_publication_gates_and_real_trigger_exactly_once(hass, hass_admin_user):
    actions, manager, document, entry, service, _ = await setup_light_workflow(hass)
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(document["workflow_id"], True)
    with pytest.raises(AgentPolicyError):
        await actions.async_validate(document, hass_admin_user.id)
    await authorize(actions, document, hass_admin_user.id)
    with pytest.raises(WorkflowDryRunRequired):
        await manager.async_set_enabled(document["workflow_id"], True)
    service.assert_not_called()
    binding = await actions.async_validate(document, hass_admin_user.id)
    await manager.async_record_dry_run(document, None, binding)
    await manager.async_set_enabled(document["workflow_id"], True)
    await trigger(hass)
    service.assert_awaited_once()
    call = service.call_args.args[0]
    assert call.data == {"entity_id": entry.entity_id}
    assert call.context.user_id == hass_admin_user.id
    record = manager.status()["workflows"][0]["status"]["last_execution"]
    assert record["completed"] and record["provider_calls"] == 0 and record["actions_executed"] == 1
    rows = actions.audit.list()
    assert rows[0]["phase"] == "committed"
    assert document["workflow_id"] not in str(rows) and hass_admin_user.id not in str(rows)
    manager.async_stop()
    actions.stop()


@pytest.mark.parametrize("change", ["document", "identity", "revoke", "state_during_audit", "permissions_during_audit", "service_during_audit"])
async def test_changed_authority_or_target_never_dispatches(hass, hass_admin_user, change):
    actions, manager, document, entry, service, config = await setup_light_workflow(hass)
    await publish(actions, manager, document, hass_admin_user.id)
    if change == "document":
        await manager.async_save({**document, "name": "changed"})
        assert actions.store.get(document["workflow_id"]) is None
    elif change == "identity":
        hass.config_entries.async_update_entry(config, data={"identity": "changed"})
    elif change == "revoke":
        await actions.async_revoke(document["workflow_id"], actions.store.snapshot()["revision"], hass_admin_user.id)
    original = actions.audit.async_transition
    async def transition(*args, **kwargs):
        result = await original(*args, **kwargs)
        if kwargs["phase"] == "started":
            if change == "state_during_audit":
                hass.states.async_set(entry.entity_id, "on")
            elif change == "permissions_during_audit":
                actions._user = AsyncMock(side_effect=AgentPolicyError("denied"))
            elif change == "service_during_audit":
                hass.services.async_register("light", "turn_on", AsyncMock())
        return result
    with patch.object(actions.audit, "async_transition", side_effect=transition):
        await trigger(hass)
    service.assert_not_called()
    manager.async_stop()
    actions.stop()


async def test_unknown_service_failure_is_never_replayed_on_restart(hass, hass_admin_user):
    actions, manager, document, _, service, _ = await setup_light_workflow(hass)
    await publish(actions, manager, document, hass_admin_user.id)
    service.side_effect = RuntimeError("PRIVATE_DEVICE_ERROR")
    await trigger(hass)
    service.assert_awaited_once()
    assert actions.audit.list()[0]["phase"] == "unknown"
    manager.async_stop()
    actions.stop()
    await manager.async_wait_stopped()
    await actions.async_wait_stopped()
    await actions.audit.async_load()
    await actions.async_start()
    await manager.async_start()
    await hass.async_block_till_done()
    service.assert_awaited_once()
    assert "PRIVATE_DEVICE_ERROR" not in str(manager.status())
    manager.async_stop()
    actions.stop()


async def test_expired_or_changed_preview_cannot_authorize(hass, hass_admin_user):
    actions, manager, document, _, _, _ = await setup_light_workflow(hass)
    preview = await actions.async_preview(document["workflow_id"], hass_admin_user.id)
    await manager.async_save({**document, "name": "new purpose"})
    with pytest.raises(AgentPolicyError):
        await actions.async_authorize(document["workflow_id"], preview["document_version"], preview["revision"], preview["authorization_token"], ASSERTIONS, hass_admin_user.id)
    assert actions.store.get(document["workflow_id"]) is None
