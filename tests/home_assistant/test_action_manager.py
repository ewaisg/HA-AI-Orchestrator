"""Real HA registry/auth/service tests for bounded human-confirmed actions."""

import asyncio
from copy import deepcopy
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import pytest
from homeassistant.core import Context
from homeassistant.helpers import entity_registry as er

from custom_components.ai_orchestrator.action_manager import ActionManager
from custom_components.ai_orchestrator.action_store import ActionStore
from custom_components.ai_orchestrator.agent_store import AgentPolicyError
from custom_components.ai_orchestrator.audit_store import AuditStore
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.test_chat import CONNECTION_ID, setup_chat


async def setup_actions(hass, user):
    _, provider_entry = setup_chat(hass)
    from dataclasses import replace

    from custom_components.ai_orchestrator.provider_entry import (
        provider_configuration_fingerprint,
    )

    provider_entry.runtime_data = replace(
        provider_entry.runtime_data,
        configuration_fingerprint=provider_configuration_fingerprint(
            provider_entry.data
        ),
    )
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic-foundation")
    store = ActionStore(hass)
    await store.async_load()
    runtime.action_store = store
    audit = AuditStore(hass)
    persisted = None

    async def read_audit():
        return deepcopy(persisted)

    async def save_audit(payload):
        nonlocal persisted
        persisted = deepcopy(payload)

    # Manager tests exercise journaling/await order; dedicated audit_store tests
    # independently exercise real HA atomic disk writes and recovery.
    audit._disk = AsyncMock(side_effect=read_audit)
    audit._store.async_save = AsyncMock(side_effect=save_audit)
    await audit.async_load()
    runtime.audit_store = audit
    manager = ActionManager(hass, store, audit)
    runtime.action_manager = manager
    entity = er.async_get(hass).async_get_or_create(
        "light", "test", "synthetic-light", suggested_object_id="synthetic_action"
    )
    hass.states.async_set(entity.entity_id, "off")
    service = AsyncMock()
    hass.services.async_register("light", "turn_on", service)
    await manager.async_save(
        CONNECTION_ID,
        [
            {"tool_id": "light_turn_on_v1", "registry_ids": [entity.id]},
        ],
        0,
        user.id,
    )
    return manager, entity, service, provider_entry


async def propose(manager, entity, actor_id, **changes):
    arguments = {
        "connection_id": CONNECTION_ID,
        "expected_revision": 1,
        "request_id": str(uuid4()),
        "tool_id": "light_turn_on_v1",
        "registry_id": entity.id,
        "arguments": {},
        "user_id": actor_id,
    }
    arguments.update(changes)
    return await manager.async_propose(**arguments)


async def confirm(manager, proposal, user_id):
    return await manager.async_confirm(
        CONNECTION_ID, proposal["request_id"], proposal["token"], user_id
    )


async def test_propose_then_confirm_exact_target_and_user_context(
    hass, hass_admin_user
):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entity, hass_admin_user.id)
    service.assert_not_called()
    assert proposal["entity_id"] == entity.entity_id
    result = await confirm(manager, proposal, hass_admin_user.id)
    assert result["status"] == "completed"
    assert result["actions_executed"] == 1
    service.assert_awaited_once()
    call = service.call_args.args[0]
    assert call.data == {"entity_id": entity.entity_id}
    assert isinstance(call.context, Context)
    assert call.context.user_id == hass_admin_user.id
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)
    service.assert_awaited_once()


@pytest.mark.parametrize(
    "change",
    [
        "state",
        "attributes",
        "restore",
        "rename",
        "remove",
        "disabled",
        "revoke",
        "provider",
        "stop",
    ],
)
async def test_changed_preconditions_deny_and_never_dispatch(
    hass, hass_admin_user, change
):
    manager, entity, service, provider_entry = await setup_actions(
        hass, hass_admin_user
    )
    proposal = await propose(manager, entity, hass_admin_user.id)
    if change == "state":
        hass.states.async_set(entity.entity_id, "on")
    elif change == "attributes":
        hass.states.async_set(entity.entity_id, "off", {"brightness": 40})
    elif change == "restore":
        hass.states.async_set(entity.entity_id, "on")
        hass.states.async_set(entity.entity_id, "off")
    elif change == "rename":
        er.async_get(hass).async_update_entity(
            entity.entity_id, new_entity_id="light.renamed"
        )
    elif change == "remove":
        er.async_get(hass).async_remove(entity.entity_id)
    elif change == "disabled":
        er.async_get(hass).async_update_entity(
            entity.entity_id, disabled_by=er.RegistryEntryDisabler.USER
        )
    elif change == "revoke":
        await manager.async_save(CONNECTION_ID, [], 1, hass_admin_user.id)
    elif change == "provider":
        hass.config_entries.async_update_entry(
            provider_entry, data={**provider_entry.data, "changed": True}
        )
    else:
        manager.stop()
    with pytest.raises(ValueError):
        await confirm(manager, proposal, hass_admin_user.id)
    service.assert_not_called()


async def test_permission_rechecked_after_await(hass, hass_admin_user):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entity, hass_admin_user.id)
    denied_user = Mock(id=hass_admin_user.id, is_active=True, is_admin=True)
    denied_user.permissions.check_entity.return_value = False
    with patch.object(hass.auth, "async_get_user", return_value=denied_user):
        with pytest.raises(AgentPolicyError):
            await confirm(manager, proposal, hass_admin_user.id)
    service.assert_not_called()


@pytest.mark.parametrize(
    "changes",
    [
        {"tool_id": "homeassistant_restart_v1"},
        {"arguments": {"entity_id": "light.other"}},
        {"arguments": {"brightness": 255}},
        {"expected_revision": 0},
        {"registry_id": "ungranted"},
        {"user_id": "unknown"},
    ],
)
async def test_proposal_fail_closed(hass, hass_admin_user, changes):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    with pytest.raises(ValueError):
        await propose(manager, entity, hass_admin_user.id, **changes)
    service.assert_not_called()


async def test_duplicate_request_rejected(hass, hass_admin_user):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    request_id = str(uuid4())
    await propose(manager, entity, hass_admin_user.id, request_id=request_id)
    with pytest.raises(AgentPolicyError):
        await propose(manager, entity, hass_admin_user.id, request_id=request_id)
    service.assert_not_called()


async def test_two_confirmations_only_one_dispatch(hass, hass_admin_user):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entity, hass_admin_user.id)
    results = await asyncio.gather(
        confirm(manager, proposal, hass_admin_user.id),
        confirm(manager, proposal, hass_admin_user.id),
        return_exceptions=True,
    )
    assert sum(isinstance(result, dict) for result in results) == 1
    service.assert_awaited_once()


async def test_dispatch_error_unknown_never_retried(hass, hass_admin_user):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    service.side_effect = RuntimeError("private-canary")
    proposal = await propose(manager, entity, hass_admin_user.id)
    result = await confirm(manager, proposal, hass_admin_user.id)
    assert result["status"] == "unknown"
    assert "private-canary" not in str(result)
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)
    service.assert_awaited_once()


async def test_catalog_and_unsupported_media(hass, hass_admin_user):
    manager, entity, _, _ = await setup_actions(hass, hass_admin_user)
    catalog = await manager.async_catalog(CONNECTION_ID, hass_admin_user.id)
    on = next(
        tool for tool in catalog["tools"] if tool["tool_id"] == "light_turn_on_v1"
    )
    assert on["targets"][0]["registry_id"] == entity.id
    assert len(catalog["tools"]) == 7
    # No service or supported entity invented for the media domain.
    assert all(
        not tool["targets"]
        for tool in catalog["tools"]
        if tool["tool_id"].startswith("media")
    )


async def test_cancel_provider_and_foreign_identity_burns(hass, hass_admin_user):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entity, hass_admin_user.id)
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, "other-user")
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)
    proposal = await propose(manager, entity, hass_admin_user.id)
    manager.cancel_provider(CONNECTION_ID)
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)
    service.assert_not_called()


@pytest.mark.parametrize("volume", [0, 0.5, 1, True, -1, 1.1, "0.5", float("nan")])
async def test_media_volume_arguments(hass, hass_admin_user, volume):
    manager, _, _, _ = await setup_actions(hass, hass_admin_user)
    from homeassistant.components.media_player.const import MediaPlayerEntityFeature

    entity = er.async_get(hass).async_get_or_create(
        "media_player", "test", "synthetic-media"
    )
    hass.states.async_set(
        entity.entity_id,
        "paused",
        {"supported_features": int(MediaPlayerEntityFeature.VOLUME_SET)},
    )
    service = AsyncMock()
    hass.services.async_register("media_player", "volume_set", service)
    await manager.async_save(
        CONNECTION_ID,
        [{"tool_id": "media_volume_v1", "registry_ids": [entity.id]}],
        1,
        hass_admin_user.id,
    )
    valid = type(volume) in (int, float) and 0 <= volume <= 1
    if valid:
        proposal = await propose(
            manager,
            entity,
            hass_admin_user.id,
            tool_id="media_volume_v1",
            expected_revision=2,
            arguments={"volume_level": volume},
        )
        await confirm(manager, proposal, hass_admin_user.id)
        assert service.call_args.args[0].data == {
            "entity_id": entity.entity_id,
            "volume_level": float(volume),
        }
    else:
        with pytest.raises(ValueError):
            await propose(
                manager,
                entity,
                hass_admin_user.id,
                tool_id="media_volume_v1",
                expected_revision=2,
                arguments={"volume_level": volume},
            )
        service.assert_not_called()


async def test_switch_grants_and_injected_scope_are_denied(hass, hass_admin_user):
    manager, _, _, _ = await setup_actions(hass, hass_admin_user)
    entry = er.async_get(hass).async_get_or_create("switch", "test", "synthetic-switch")
    hass.states.async_set(entry.entity_id, "off")
    service = AsyncMock()
    hass.services.async_register("switch", "turn_on", service)
    scopes = [{"tool_id": "switch_turn_on_v1", "registry_ids": [entry.id]}]
    with pytest.raises(AgentPolicyError):
        await manager.async_save(CONNECTION_ID, scopes, 1, hass_admin_user.id)
    # Even storage injection cannot grant a runtime-prohibited operation.
    with pytest.raises(AgentPolicyError):
        await manager.store.async_save(CONNECTION_ID, scopes, 1)
    manager.store._profiles[CONNECTION_ID]["action_scopes"] = scopes
    manager.store._profiles[CONNECTION_ID]["revision"] = 2
    with pytest.raises(AgentPolicyError):
        await propose(
            manager,
            entry,
            hass_admin_user.id,
            expected_revision=2,
            tool_id="switch_turn_on_v1",
        )
    catalog = await manager.async_catalog(CONNECTION_ID, hass_admin_user.id)
    assert all(
        not tool["targets"]
        for tool in catalog["tools"]
        if tool["tool_id"].startswith("switch")
    )
    service.assert_not_called()


@pytest.mark.parametrize(
    "members",
    [["media_player.other"], ["media_player.self", "media_player.other"], "bad"],
)
async def test_media_group_rejected(hass, hass_admin_user, members):
    manager, _, _, _ = await setup_actions(hass, hass_admin_user)
    from homeassistant.components.media_player.const import MediaPlayerEntityFeature

    entry = er.async_get(hass).async_get_or_create(
        "media_player", "test", "synthetic-group"
    )
    hass.states.async_set(
        entry.entity_id,
        "playing",
        {
            "supported_features": int(MediaPlayerEntityFeature.PAUSE),
            "group_members": members,
        },
    )
    service = AsyncMock()
    hass.services.async_register("media_player", "media_pause", service)
    with pytest.raises(AgentPolicyError):
        await manager.async_save(
            CONNECTION_ID,
            [{"tool_id": "media_pause_v1", "registry_ids": [entry.id]}],
            1,
            hass_admin_user.id,
        )
    service.assert_not_called()


async def test_replaced_service_registration_invalidates_approval(
    hass, hass_admin_user
):
    manager, entry, original, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entry, hass_admin_user.id)
    replacement = AsyncMock()
    hass.services.async_register("light", "turn_on", replacement)
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)
    original.assert_not_called()
    replacement.assert_not_called()


async def test_stop_start_old_token_denied_new_request_works(hass, hass_admin_user):
    manager, entry, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entry, hass_admin_user.id)
    manager.stop()
    await manager.async_start()
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)
    with pytest.raises(AgentPolicyError):
        await propose(
            manager, entry, hass_admin_user.id, request_id=proposal["request_id"]
        )
    fresh = await propose(manager, entry, hass_admin_user.id)
    assert (await confirm(manager, fresh, hass_admin_user.id))["status"] == "completed"
    service.assert_awaited_once()


async def test_cancelled_dispatch_never_reports_success_or_retries(
    hass, hass_admin_user
):
    manager, entry, _, _ = await setup_actions(hass, hass_admin_user)
    began = asyncio.Event()
    released = asyncio.Event()

    async def suppress_cancel(call):
        began.set()
        try:
            await released.wait()
        except asyncio.CancelledError:
            pass

    hass.services.async_register("light", "turn_on", suppress_cancel)
    proposal = await propose(manager, entry, hass_admin_user.id)
    task = asyncio.create_task(confirm(manager, proposal, hass_admin_user.id))
    await began.wait()
    manager.stop()
    try:
        result = await task
        assert result["status"] == "unknown"
    except asyncio.CancelledError:
        pass
    await manager.async_start()
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)


async def test_suppressed_timeout_is_unknown(hass, hass_admin_user, monkeypatch):
    manager, entry, _, _ = await setup_actions(hass, hass_admin_user)
    from custom_components.ai_orchestrator import action_manager

    monkeypatch.setattr(action_manager, "ACTION_TIMEOUT_SECONDS", 0.001)

    async def suppress_cancel(call):
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass

    hass.services.async_register("light", "turn_on", suppress_cancel)
    proposal = await propose(manager, entry, hass_admin_user.id)
    assert (await confirm(manager, proposal, hass_admin_user.id))["status"] == "unknown"


@pytest.mark.parametrize(
    "state,attributes",
    [
        ("odd", {}),
        ("off", {"unsafe": object()}),
        ("unavailable", {}),
    ],
)
async def test_invalid_states_never_proposed(hass, hass_admin_user, state, attributes):
    manager, entry, service, _ = await setup_actions(hass, hass_admin_user)
    hass.states.async_set(entry.entity_id, state, attributes)
    with pytest.raises(ValueError):
        await propose(manager, entry, hass_admin_user.id)
    service.assert_not_called()


async def test_invalid_args_token_and_stopped_manager(hass, hass_admin_user):
    manager, entry, service, _ = await setup_actions(hass, hass_admin_user)
    with pytest.raises(ValueError):
        await propose(manager, entry, hass_admin_user.id, arguments=[])
    with pytest.raises(ValueError):
        await manager.async_confirm(
            CONNECTION_ID, str(uuid4()), None, hass_admin_user.id
        )
    manager.stop()
    with pytest.raises(ValueError):
        await propose(manager, entry, hass_admin_user.id)
    service.assert_not_called()


async def test_media_features_required(hass, hass_admin_user):
    manager, _, _, _ = await setup_actions(hass, hass_admin_user)
    entry = er.async_get(hass).async_get_or_create(
        "media_player", "test", "unsupported"
    )
    hass.states.async_set(entry.entity_id, "paused")
    hass.services.async_register("media_player", "media_play", AsyncMock())
    with pytest.raises(AgentPolicyError):
        await manager.async_save(
            CONNECTION_ID,
            [{"tool_id": "media_play_v1", "registry_ids": [entry.id]}],
            1,
            hass_admin_user.id,
        )


async def test_catalog_bounded(hass, hass_admin_user):
    manager, _, _, _ = await setup_actions(hass, hass_admin_user)
    registry = er.async_get(hass)
    for i in range(500):
        entry = registry.async_get_or_create("light", "test", f"bounded-{i}")
        hass.states.async_set(entry.entity_id, "off", {"friendly_name": "Synthetic"})
    catalog = await manager.async_catalog(CONNECTION_ID, hass_admin_user.id)
    assert len(catalog["tools"][0]["targets"]) == 500


async def test_provider_cancel_dispatch_and_start_awaits_termination(
    hass, hass_admin_user
):
    manager, entry, _, _ = await setup_actions(hass, hass_admin_user)
    began = asyncio.Event()

    async def wait_forever(call):
        began.set()
        await asyncio.Event().wait()

    hass.services.async_register("light", "turn_on", wait_forever)
    proposal = await propose(manager, entry, hass_admin_user.id)
    task = asyncio.create_task(confirm(manager, proposal, hass_admin_user.id))
    await began.wait()
    manager.cancel_provider(CONNECTION_ID)
    await manager.async_start()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert not manager._tasks


async def test_start_refuses_incomplete_shutdown(hass, hass_admin_user):
    manager, _, _, _ = await setup_actions(hass, hass_admin_user)
    task = asyncio.create_task(asyncio.Event().wait())
    manager._tasks[task] = CONNECTION_ID
    manager._stopped = True
    with patch(
        "custom_components.ai_orchestrator.action_manager.asyncio.wait",
        new=AsyncMock(return_value=(set(), {task})),
    ):
        with pytest.raises(AgentPolicyError):
            await manager.async_start()
    assert manager._stopped
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    manager._tasks.clear()


async def test_lifecycle_skips_own_task_and_other_provider(hass, hass_admin_user):
    manager, _, _, _ = await setup_actions(hass, hass_admin_user)
    current = asyncio.current_task()
    manager._tasks[current] = "different-provider"
    manager.cancel_provider(CONNECTION_ID)
    manager.stop()
    assert not current.cancelling()
    manager._tasks.clear()


async def test_audit_requested_authorized_started_precede_one_dispatch(
    hass, hass_admin_user
):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entity, hass_admin_user.id)
    assert manager.audit.list()[0]["phase"] == "requested"

    async def inspect_journal(call):
        assert manager.audit.list()[0]["phase"] == "started"
        assert manager.audit.list()[0]["actions_attempted"] == 1
        assert manager.audit.list()[0]["service_returns"] == 0

    service.side_effect = inspect_journal
    result = await confirm(manager, proposal, hass_admin_user.id)
    assert result["status"] == "completed"
    phases = [
        call.args[0]["records"][0]["phase"]
        for call in manager.audit._store.async_save.call_args_list
    ]
    assert phases == ["requested", "authorized", "started", "committed"]
    persisted = str(manager.audit.list())
    for private in (
        entity.entity_id,
        entity.id,
        hass_admin_user.id,
        CONNECTION_ID,
        proposal["token"],
        proposal["request_id"],
    ):
        assert private not in persisted
    assert manager.audit.list()[0]["service_returns"] == 1


@pytest.mark.parametrize("phase", ["authorized", "started"])
@pytest.mark.parametrize(
    "change", ["state", "scope", "service", "permissions", "expiry"]
)
async def test_fresh_checks_after_every_journal_await(
    hass, hass_admin_user, phase, change
):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entity, hass_admin_user.id)
    original = manager.audit.async_transition
    replacement = AsyncMock()
    changed = False
    original_user = hass.auth.async_get_user

    async def current_user(user_id):
        user = await original_user(user_id)
        if changed and change == "permissions":
            denied = Mock(id=user.id, is_active=True, is_admin=True)
            denied.permissions.check_entity.return_value = False
            return denied
        return user

    async def persist_then_change(audit_id, **kwargs):
        nonlocal changed
        result = await original(audit_id, **kwargs)
        if kwargs["phase"] == phase:
            changed = True
            if change == "state":
                hass.states.async_set(entity.entity_id, "on")
            elif change == "scope":
                await manager.store.async_save(CONNECTION_ID, [], 1)
            elif change == "service":
                hass.services.async_register("light", "turn_on", replacement)
            elif change == "expiry":
                current = manager._confirmations._clock()
                manager._confirmations._clock = lambda: current + 1000
        return result

    with (
        patch.object(
            manager.audit, "async_transition", side_effect=persist_then_change
        ),
        patch.object(hass.auth, "async_get_user", side_effect=current_user),
    ):
        with pytest.raises(AgentPolicyError):
            await confirm(manager, proposal, hass_admin_user.id)
    service.assert_not_called()
    replacement.assert_not_called()
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)


@pytest.mark.parametrize(
    "failed_phase", ["requested", "authorized", "started", "committed"]
)
async def test_unconfirmed_journal_write_never_retries(
    hass, hass_admin_user, failed_phase
):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    original = manager.audit._store.async_save

    async def uncertain_write(payload):
        if payload["records"][0]["phase"] == failed_phase:
            return  # HA Store can return normally after a failed disk write.
        await original(payload)

    with patch.object(manager.audit._store, "async_save", side_effect=uncertain_write):
        if failed_phase == "requested":
            with pytest.raises(AgentPolicyError):
                await propose(manager, entity, hass_admin_user.id)
            service.assert_not_called()
            return
        proposal = await propose(manager, entity, hass_admin_user.id)
        if failed_phase == "committed":
            result = await confirm(manager, proposal, hass_admin_user.id)
            assert result["status"] == "unknown"
            service.assert_awaited_once()
        else:
            with pytest.raises(AgentPolicyError):
                await confirm(manager, proposal, hass_admin_user.id)
            service.assert_not_called()
    assert not manager.audit.loaded
    await manager.audit.async_load()
    assert manager.audit.list()[0]["phase"] == "unknown"
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)


@pytest.mark.parametrize("operation", ["propose", "confirm"])
async def test_stop_cancels_predispatch_journal_tasks(hass, hass_admin_user, operation):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = None
    if operation == "confirm":
        proposal = await propose(manager, entity, hass_admin_user.id)
    began = asyncio.Event()
    released = asyncio.Event()
    original = manager.audit._store.async_save

    async def blocked_save(payload):
        began.set()
        await released.wait()
        await original(payload)

    with patch.object(manager.audit._store, "async_save", side_effect=blocked_save):
        task = asyncio.create_task(
            propose(manager, entity, hass_admin_user.id)
            if operation == "propose"
            else confirm(manager, proposal, hass_admin_user.id)
        )
        await began.wait()
        assert task in manager._tasks
        manager.stop()
        await asyncio.sleep(0)
        assert not task.done()
        released.set()
        with pytest.raises(asyncio.CancelledError):
            await task
    service.assert_not_called()
    assert not manager._tasks
    await manager.audit.async_load()
    assert manager.audit.list()[0]["phase"] == "unknown"
    assert manager.audit.list()[0]["service_returns"] == 0


async def test_concurrent_proposal_same_request_only_one_record(hass, hass_admin_user):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    request_id = str(uuid4())
    results = await asyncio.gather(
        *(
            propose(manager, entity, hass_admin_user.id, request_id=request_id)
            for _ in range(2)
        ),
        return_exceptions=True,
    )
    assert sum(isinstance(result, dict) for result in results) == 1
    assert len(manager.audit.list()) == 1
    service.assert_not_called()


async def test_proposal_revocation_during_requested_write_is_recorded(
    hass, hass_admin_user
):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    original = manager.audit.async_begin

    async def revoke_after_begin(operation):
        row = await original(operation)
        await manager.store.async_save(CONNECTION_ID, [], 1)
        return row

    with patch.object(manager.audit, "async_begin", side_effect=revoke_after_begin):
        with pytest.raises(AgentPolicyError):
            await propose(manager, entity, hass_admin_user.id)
    assert manager.audit.list()[0]["phase"] == "failed"
    service.assert_not_called()


@pytest.mark.parametrize("operation", ["propose", "confirm"])
async def test_suppressed_predispatch_cancellation_still_prevents_action(
    hass, hass_admin_user, operation
):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = (
        await propose(manager, entity, hass_admin_user.id)
        if operation == "confirm"
        else None
    )
    original = manager._user
    calls = 0
    entered = asyncio.Event()

    async def suppress_second_cancel(user_id):
        nonlocal calls
        calls += 1
        user = await original(user_id)
        if calls == 2:
            entered.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                pass
        return user

    with patch.object(manager, "_user", side_effect=suppress_second_cancel):
        task = asyncio.create_task(
            propose(manager, entity, hass_admin_user.id)
            if operation == "propose"
            else confirm(manager, proposal, hass_admin_user.id)
        )
        await entered.wait()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    service.assert_not_called()


async def test_owned_operation_bound_denies_more_work(hass, hass_admin_user):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    manager._tasks[asyncio.current_task()] = CONNECTION_ID
    with pytest.raises(AgentPolicyError):
        await propose(manager, entity, hass_admin_user.id)
    manager._tasks.clear()
    service.assert_not_called()


async def test_expire_proposal_records_and_tokens(hass, hass_admin_user, freezer):
    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    proposal = await propose(manager, entity, hass_admin_user.id)
    row = manager.audit.list()[0]
    from datetime import datetime, timedelta

    freezer.move_to(datetime.fromisoformat(row["created_at"]) + timedelta(seconds=300))
    await manager.async_expire_proposals()
    assert manager.audit.list()[0]["phase"] == "failed"
    assert manager.audit.list()[0]["error_code"] == "cancelled"
    assert manager.audit.list()[0]["actions_attempted"] == 0
    assert not manager._pending
    assert not manager._confirmations._pending
    with pytest.raises(AgentPolicyError):
        await confirm(manager, proposal, hass_admin_user.id)
    service.assert_not_called()


async def test_expire_provider_cleared_orphans(hass, hass_admin_user, freezer):
    manager, entity, _, _ = await setup_actions(hass, hass_admin_user)
    await propose(manager, entity, hass_admin_user.id)
    from datetime import datetime, timedelta

    created = datetime.fromisoformat(manager.audit.list()[0]["created_at"])
    manager.cancel_provider(CONNECTION_ID)
    freezer.move_to(created + timedelta(seconds=300))
    await manager.async_expire_proposals()
    assert manager.audit.list()[0]["phase"] == "failed"


async def test_expiry_clock_reversal_waits_for_monotonic_bound(
    hass, hass_admin_user, freezer
):
    from dataclasses import replace
    from datetime import datetime, timedelta

    manager, entity, _, _ = await setup_actions(hass, hass_admin_user)
    await propose(manager, entity, hass_admin_user.id)
    created = datetime.fromisoformat(manager.audit.list()[0]["created_at"])
    freezer.move_to(created - timedelta(hours=1))
    await manager.async_expire_proposals()
    assert manager.audit.list()[0]["phase"] == "requested"
    key = next(iter(manager._pending))
    # Monotonic expiry can still close an old token after a wall-clock reversal,
    # but journal timestamp transitions must not move backwards.
    manager._pending[key] = replace(manager._pending[key], expires=0)
    await manager.async_expire_proposals()
    assert manager.audit.list()[0]["phase"] == "requested"
    freezer.move_to(created + timedelta(seconds=1))
    await manager.async_expire_proposals()
    assert manager.audit.list()[0]["phase"] == "failed"


async def test_expiry_cas_does_not_touch_authorized_or_started(
    hass, hass_admin_user, freezer
):
    from datetime import datetime, timedelta

    manager, entity, _, _ = await setup_actions(hass, hass_admin_user)
    await propose(manager, entity, hass_admin_user.id)
    row = manager.audit.list()[0]
    freezer.move_to(datetime.fromisoformat(row["created_at"]) + timedelta(seconds=300))
    original = manager.audit.async_transition

    async def authorization_wins(audit_id, **kwargs):
        if kwargs["phase"] == "failed":
            await original(audit_id, expected_phase="requested", phase="authorized")
        return await original(audit_id, **kwargs)

    with patch.object(
        manager.audit, "async_transition", side_effect=authorization_wins
    ):
        await manager.async_expire_proposals()
    assert manager.audit.list()[0]["phase"] == "authorized"
    assert manager._pending
    await original(
        row["audit_id"],
        expected_phase="authorized",
        phase="started",
        actions_attempted=1,
    )
    await manager.async_expire_proposals()
    assert manager.audit.list()[0]["phase"] == "started"


async def test_expiry_stopped_busy_and_audit_identity(hass, hass_admin_user):
    manager, _, _, _ = await setup_actions(hass, hass_admin_user)
    manager._tasks[asyncio.current_task()] = "existing"
    await manager.async_expire_proposals()
    manager._tasks.clear()
    runtime = async_get_runtime(hass)
    runtime.audit_store = None
    with pytest.raises(AgentPolicyError):
        await manager.async_expire_proposals()
    with pytest.raises(AgentPolicyError):
        await manager.async_catalog(CONNECTION_ID, hass_admin_user.id)


async def test_expiry_scans_at_most_4096_rows(hass, hass_admin_user):
    from tests.quality.test_audit_schema import ROW

    manager, _, _, _ = await setup_actions(hass, hass_admin_user)

    def page(*, after_sequence, limit):
        return [
            {**ROW, "sequence": i, "phase": "started"}
            for i in range(after_sequence + 1, after_sequence + limit + 1)
        ]

    with patch.object(manager.audit, "list", side_effect=page) as listing:
        await manager.async_expire_proposals()
    assert listing.call_count == 41
    assert listing.call_args.kwargs == {"after_sequence": 4000, "limit": 96}


async def test_stop_cancels_expiry_maintenance(hass, hass_admin_user, freezer):
    from datetime import datetime, timedelta

    manager, entity, service, _ = await setup_actions(hass, hass_admin_user)
    await propose(manager, entity, hass_admin_user.id)
    created = datetime.fromisoformat(manager.audit.list()[0]["created_at"])
    freezer.move_to(created + timedelta(seconds=300))
    entered = asyncio.Event()

    async def block_transition(*args, **kwargs):
        entered.set()
        await asyncio.Event().wait()

    with patch.object(manager.audit, "async_transition", side_effect=block_transition):
        task = asyncio.create_task(manager.async_expire_proposals())
        await entered.wait()
        assert task in manager._tasks
        manager.stop()
        with pytest.raises(asyncio.CancelledError):
            await task
    assert not manager._tasks
    service.assert_not_called()
