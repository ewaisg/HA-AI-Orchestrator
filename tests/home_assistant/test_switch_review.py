"""Physical-review, scope and confirmation remain three independent gates."""

import asyncio
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator.agent_store import AgentPolicyError
from custom_components.ai_orchestrator.switch_review import ATTESTATIONS
from tests.home_assistant.test_action_manager import (
    CONNECTION_ID,
    confirm,
    propose,
    setup_actions,
)

ASSERTIONS = dict.fromkeys(ATTESTATIONS, True)


async def setup_switch(hass, user, *, platform="test"):
    manager, light, _, _ = await setup_actions(hass, user)
    config = MockConfigEntry(
        domain="test", unique_id="physical-adapter", data={"host": "synthetic"}
    )
    config.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=config.entry_id,
        identifiers={("test", "physical-outlet")},
        name="Synthetic outlet",
    )
    entity = er.async_get(hass).async_get_or_create(
        "switch", platform, "synthetic-switch", config_entry=config, device_id=device.id
    )
    hass.states.async_set(entity.entity_id, "off")
    service = AsyncMock()
    hass.services.async_register("switch", "turn_on", service)
    hass.services.async_register("switch", "turn_off", service)
    return manager, entity, service, config, device, light


async def review(manager, entry, user_id):
    revision = manager.store.get(CONNECTION_ID)["revision"]
    preview = await manager.async_review_preview(
        CONNECTION_ID, revision, entry.id, user_id
    )
    return await manager.async_review_save(
        CONNECTION_ID,
        revision,
        entry.id,
        preview["review_token"],
        "ordinary_noncritical",
        ASSERTIONS,
        user_id,
    )


async def grant(manager, entry, user_id):
    profile = manager.store.get(CONNECTION_ID)
    await manager.async_save(
        CONNECTION_ID,
        profile["action_scopes"]
        + [
            {"tool_id": "switch_turn_on_v1", "registry_ids": [entry.id]},
            {"tool_id": "switch_turn_off_v1", "registry_ids": [entry.id]},
        ],
        profile["revision"],
        user_id,
    )


async def test_review_then_grant_then_confirm_and_redacted_audit(hass, hass_admin_user):
    manager, entry, service, _, _, light = await setup_switch(hass, hass_admin_user)
    catalog = await manager.async_catalog(CONNECTION_ID, hass_admin_user.id)
    assert catalog["switch_candidates"][0]["status"] == "unreviewed"
    with pytest.raises(AgentPolicyError):
        await grant(manager, entry, hass_admin_user.id)
    result = await review(manager, entry, hass_admin_user.id)
    assert result["profile"]["action_scopes"] == [
        {"tool_id": "light_turn_on_v1", "registry_ids": [light.id]}
    ]
    assert "identity_digest" not in result["profile"]["switch_reviews"][0]
    with pytest.raises(AgentPolicyError):
        await propose(
            manager,
            entry,
            hass_admin_user.id,
            expected_revision=2,
            tool_id="switch_turn_on_v1",
        )
    await grant(manager, entry, hass_admin_user.id)
    pending = await propose(
        manager,
        entry,
        hass_admin_user.id,
        expected_revision=3,
        tool_id="switch_turn_on_v1",
    )
    assert pending["risk"] == "high"
    service.assert_not_called()
    assert (await confirm(manager, pending, hass_admin_user.id))[
        "status"
    ] == "completed"
    service.assert_awaited_once()
    records = manager.audit.list()
    assert records[0]["risk"] == "high"
    assert entry.id not in str(records) and hass_admin_user.id not in str(records)


@pytest.mark.parametrize(
    "change",
    [
        "rename",
        "device",
        "config",
        "association",
        "attributes",
        "remove",
        "refresh",
        "revoke",
    ],
)
async def test_changed_review_or_identity_prevents_dispatch(
    hass, hass_admin_user, change
):
    manager, entry, service, config, device, _ = await setup_switch(
        hass, hass_admin_user
    )
    await review(manager, entry, hass_admin_user.id)
    await grant(manager, entry, hass_admin_user.id)
    pending = await propose(
        manager,
        entry,
        hass_admin_user.id,
        expected_revision=3,
        tool_id="switch_turn_on_v1",
    )
    if change == "rename":
        er.async_get(hass).async_update_entity(
            entry.entity_id, new_entity_id="switch.changed"
        )
    elif change == "device":
        dr.async_get(hass).async_update_device(
            device.id, name_by_user="Changed physical mapping"
        )
    elif change == "config":
        hass.config_entries.async_update_entry(config, data={"host": "different"})
    elif change == "association":
        er.async_get(hass).async_get_or_create(
            "lock", "test", "lock", config_entry=config, device_id=device.id
        )
    elif change == "attributes":
        hass.states.async_set(entry.entity_id, "off", {"entity_id": ["switch.other"]})
    elif change == "remove":
        er.async_get(hass).async_remove(entry.entity_id)
    elif change == "refresh":
        await review(manager, entry, hass_admin_user.id)
    else:
        await manager.async_review_revoke(
            CONNECTION_ID, 3, entry.id, hass_admin_user.id
        )
    with pytest.raises(AgentPolicyError):
        await confirm(manager, pending, hass_admin_user.id)
    if change in {"refresh", "revoke"}:
        assert all(
            not scope["tool_id"].startswith("switch")
            for scope in manager.store.get(CONNECTION_ID)["action_scopes"]
        )
    service.assert_not_called()


@pytest.mark.parametrize("platform", ["template", "group"])
async def test_fanout_platform_never_reviewable(hass, hass_admin_user, platform):
    manager, entry, service, _, _, _ = await setup_switch(
        hass, hass_admin_user, platform=platform
    )
    with pytest.raises(AgentPolicyError):
        await review(manager, entry, hass_admin_user.id)
    assert not (await manager.async_catalog(CONNECTION_ID, hass_admin_user.id))[
        "switch_candidates"
    ]
    service.assert_not_called()


@pytest.mark.parametrize(
    "change",
    ["expired", "user", "identity", "assertion", "classification", "revision", "stop"],
)
async def test_review_nonce_exact_binding_and_burn(hass, hass_admin_user, change):
    manager, entry, _, config, _, _ = await setup_switch(hass, hass_admin_user)
    preview = await manager.async_review_preview(
        CONNECTION_ID, 1, entry.id, hass_admin_user.id
    )
    args = [
        CONNECTION_ID,
        1,
        entry.id,
        preview["review_token"],
        "ordinary_noncritical",
        ASSERTIONS,
        hass_admin_user.id,
    ]
    if change == "expired":
        manager._reviews = {
            key: (*value[:-1], 0) for key, value in manager._reviews.items()
        }
    elif change == "user":
        args[-1] = "missing-user"
    elif change == "identity":
        hass.config_entries.async_update_entry(config, data={"changed": True})
    elif change == "assertion":
        args[-2] = {**ASSERTIONS, "single_device": 1}
    elif change == "classification":
        args[-3] = "critical"
    elif change == "revision":
        args[1] = 2
    else:
        manager.stop()
    with pytest.raises(AgentPolicyError):
        await manager.async_review_save(*args)
    with pytest.raises(AgentPolicyError):
        await manager.async_review_save(
            CONNECTION_ID,
            1,
            entry.id,
            preview["review_token"],
            "ordinary_noncritical",
            ASSERTIONS,
            hass_admin_user.id,
        )
    assert manager.store.get(CONNECTION_ID)["switch_reviews"] == []


async def test_switch_on_off_does_not_invalidate_physical_review(hass, hass_admin_user):
    manager, entry, _, _, _, _ = await setup_switch(hass, hass_admin_user)
    await review(manager, entry, hass_admin_user.id)
    hass.states.async_set(entry.entity_id, "on")
    assert (await manager.async_catalog(CONNECTION_ID, hass_admin_user.id))[
        "switch_candidates"
    ][0]["status"] == "reviewed"
    await grant(manager, entry, hass_admin_user.id)


async def test_identity_change_during_final_audit_await_denied(hass, hass_admin_user):
    manager, entry, service, config, _, _ = await setup_switch(hass, hass_admin_user)
    await review(manager, entry, hass_admin_user.id)
    await grant(manager, entry, hass_admin_user.id)
    pending = await propose(
        manager,
        entry,
        hass_admin_user.id,
        expected_revision=3,
        tool_id="switch_turn_on_v1",
    )
    original = manager.audit.async_transition

    async def transition(*args, **kwargs):
        result = await original(*args, **kwargs)
        if kwargs["phase"] == "started":
            hass.config_entries.async_update_entry(config, data={"changed": True})
        return result

    with patch.object(manager.audit, "async_transition", side_effect=transition):
        with pytest.raises(AgentPolicyError):
            await confirm(manager, pending, hass_admin_user.id)
    service.assert_not_called()


@pytest.mark.parametrize(
    "device_class", ["smoke", "gas", "carbon_monoxide", "tamper", "door", "window"]
)
async def test_protected_sibling_classes_deny(hass, hass_admin_user, device_class):
    manager, entry, _, config, device, _ = await setup_switch(hass, hass_admin_user)
    sibling = er.async_get(hass).async_get_or_create(
        "binary_sensor", "test", "protected", config_entry=config, device_id=device.id
    )
    hass.states.async_set(sibling.entity_id, "off", {"device_class": device_class})
    with pytest.raises(AgentPolicyError):
        await review(manager, entry, hass_admin_user.id)


async def test_unserializable_identity_refuses_review(hass, hass_admin_user):
    manager, entry, _, config, _, _ = await setup_switch(hass, hass_admin_user)
    hass.config_entries.async_update_entry(config, options={"opaque": object()})
    with pytest.raises(AgentPolicyError):
        await review(manager, entry, hass_admin_user.id)
    hass.config_entries.async_update_entry(config, options={})


async def test_review_nonce_capacity_expiry_and_missing_connection(
    hass, hass_admin_user
):
    manager, entry, _, _, _, _ = await setup_switch(hass, hass_admin_user)
    with pytest.raises(AgentPolicyError):
        manager._resolve("switch_turn_on_v1", entry.id, hass_admin_user)
    for _ in range(64):
        await manager.async_review_preview(
            CONNECTION_ID, 1, entry.id, hass_admin_user.id
        )
    with pytest.raises(AgentPolicyError):
        await manager.async_review_preview(
            CONNECTION_ID, 1, entry.id, hass_admin_user.id
        )
    manager._reviews = {
        key: (*value[:-1], 0) for key, value in manager._reviews.items()
    }
    await manager.async_review_preview(CONNECTION_ID, 1, entry.id, hass_admin_user.id)
    assert len(manager._reviews) == 1
    with pytest.raises(AgentPolicyError):
        await manager.async_review_save(
            CONNECTION_ID,
            1,
            entry.id,
            None,
            "ordinary_noncritical",
            ASSERTIONS,
            hass_admin_user.id,
        )


async def test_stale_review_catalog_requires_new_physical_review(hass, hass_admin_user):
    manager, entry, _, _, device, _ = await setup_switch(hass, hass_admin_user)
    await review(manager, entry, hass_admin_user.id)
    dr.async_get(hass).async_update_device(device.id, name_by_user="Changed load")
    result = await manager.async_catalog(CONNECTION_ID, hass_admin_user.id)
    assert result["switch_candidates"][0]["status"] == "stale"
    assert all(
        not tool["targets"]
        for tool in result["tools"]
        if tool["tool_id"].startswith("switch")
    )


@pytest.mark.parametrize("cancel", [False, True])
async def test_review_expiry_or_cancellation_during_auth_never_persists(
    hass, hass_admin_user, cancel
):
    manager, entry, _, _, _, _ = await setup_switch(hass, hass_admin_user)
    clock = Mock(monotonic=Mock(return_value=100))
    blocked, release = asyncio.Event(), asyncio.Event()

    async def delayed_user(_user_id):
        blocked.set()
        try:
            await release.wait()
        except asyncio.CancelledError:
            pass  # A dependency swallowing cancellation cannot enable a review.
        return hass_admin_user

    with patch("custom_components.ai_orchestrator.action_manager.time", clock):
        preview = await manager.async_review_preview(
            CONNECTION_ID, 1, entry.id, hass_admin_user.id
        )
        with patch.object(manager, "_user", side_effect=delayed_user):
            task = asyncio.create_task(
                manager.async_review_save(
                    CONNECTION_ID,
                    1,
                    entry.id,
                    preview["review_token"],
                    "ordinary_noncritical",
                    ASSERTIONS,
                    hass_admin_user.id,
                )
            )
            await blocked.wait()
            if cancel:
                task.cancel()
            else:
                clock.monotonic.return_value = 401
                release.set()
            with pytest.raises(asyncio.CancelledError if cancel else AgentPolicyError):
                await task
    assert manager.store.get(CONNECTION_ID)["switch_reviews"] == []


async def test_candidate_discovery_is_bounded(hass, hass_admin_user):
    manager, _, _, config, device, _ = await setup_switch(hass, hass_admin_user)
    registry = er.async_get(hass)
    for index in range(500):
        entry = registry.async_get_or_create(
            "switch",
            "test",
            f"synthetic-{index}",
            config_entry=config,
            device_id=device.id,
        )
        hass.states.async_set(entry.entity_id, "off")
    assert (
        len(
            (await manager.async_catalog(CONNECTION_ID, hass_admin_user.id))[
                "switch_candidates"
            ]
        )
        == 500
    )
