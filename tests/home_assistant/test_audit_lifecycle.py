"""Retention ownership survives reload without orphaned callbacks or maintenance."""

import asyncio
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.const import EVENT_HOMEASSISTANT_STOP

from custom_components.ai_orchestrator.agent_store import AgentPolicyError
from custom_components.ai_orchestrator.audit_lifecycle import AuditLifecycle
from custom_components.ai_orchestrator.audit_store import AuditStoreError


async def test_hourly_retention_and_old_callback_invalidation(hass):
    store = SimpleNamespace(async_load=AsyncMock(), async_prune=AsyncMock())
    owner = AuditLifecycle(hass, store)
    unsub = Mock()
    with patch(
        "custom_components.ai_orchestrator.audit_lifecycle.async_track_time_interval",
        return_value=unsub,
    ) as timer:
        await owner.async_start()
        old = timer.call_args.args[1]
        assert timer.call_args.args[2] == timedelta(hours=1)
        await old(datetime.now(UTC))
        store.async_prune.assert_awaited_once()
        await owner.async_start()
        await old(datetime.now(UTC))
        assert store.async_prune.await_count == 1
        current = timer.call_args.args[1]
        await current(datetime.now(UTC))
        assert store.async_prune.await_count == 2
        owner.stop()
        await current(datetime.now(UTC))
        assert store.async_prune.await_count == 2
    assert unsub.call_count == 2


async def test_shutdown_cleans_timer_and_prune_failure_does_not_leak(hass):
    store = SimpleNamespace(
        async_load=AsyncMock(),
        async_prune=AsyncMock(side_effect=AuditStoreError("PRIVATE_CONTENT")),
    )
    owner = AuditLifecycle(hass, store)
    unsub = Mock()
    with patch(
        "custom_components.ai_orchestrator.audit_lifecycle.async_track_time_interval",
        return_value=unsub,
    ) as timer:
        await owner.async_start()
        await timer.call_args.args[1](datetime.now(UTC))
        assert owner._tasks == set()
        hass.bus.async_fire(EVENT_HOMEASSISTANT_STOP)
        await hass.async_block_till_done()
    unsub.assert_called_once()
    assert owner._stop_unsubscribe is None


async def test_reload_waits_for_cancelled_maintenance_before_recovery(hass):
    entered = asyncio.Event()
    cancelled = asyncio.Event()
    release = asyncio.Event()

    async def prune():
        entered.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()

    store = SimpleNamespace(
        async_load=AsyncMock(), async_prune=AsyncMock(side_effect=prune)
    )
    owner = AuditLifecycle(hass, store)
    with patch(
        "custom_components.ai_orchestrator.audit_lifecycle.async_track_time_interval",
        return_value=Mock(),
    ) as timer:
        await owner.async_start()
        work = asyncio.create_task(timer.call_args.args[1](datetime.now(UTC)))
        await entered.wait()
        restart = asyncio.create_task(owner.async_start())
        await cancelled.wait()
        assert store.async_load.await_count == 1
        release.set()
        await restart
        await work
        assert store.async_load.await_count == 2
        owner.stop()


async def test_unreadable_store_never_registers_retention(hass):
    store = SimpleNamespace(
        async_load=AsyncMock(side_effect=AuditStoreError("unreadable"))
    )
    owner = AuditLifecycle(hass, store)
    with patch(
        "custom_components.ai_orchestrator.audit_lifecycle.async_track_time_interval"
    ) as timer:
        with pytest.raises(AuditStoreError):
            await owner.async_start()
    timer.assert_not_called()


async def test_expiry_precedes_prune_and_stopped_callback_cannot_continue(hass):
    order = []
    store = SimpleNamespace(
        async_load=AsyncMock(),
        async_prune=AsyncMock(side_effect=lambda: order.append("prune")),
    )

    async def maintain():
        order.append("expire")

    owner = AuditLifecycle(hass, store, maintain)
    with patch(
        "custom_components.ai_orchestrator.audit_lifecycle.async_track_time_interval",
        return_value=Mock(),
    ) as timer:
        await owner.async_start()
        tick = timer.call_args.args[1]
        await tick(datetime.now(UTC))
        assert order == ["expire", "prune"]

        async def stopped():
            owner.stop()

        owner._maintenance = stopped
        await tick(datetime.now(UTC))
        assert order == ["expire", "prune"]
        owner.stop()


async def test_unavailable_action_maintenance_is_static_and_clean(hass):
    store = SimpleNamespace(async_load=AsyncMock(), async_prune=AsyncMock())
    owner = AuditLifecycle(
        hass, store, AsyncMock(side_effect=AgentPolicyError("PRIVATE_CONTENT"))
    )
    with patch(
        "custom_components.ai_orchestrator.audit_lifecycle.async_track_time_interval",
        return_value=Mock(),
    ) as timer:
        await owner.async_start()
        await timer.call_args.args[1](datetime.now(UTC))
        store.async_prune.assert_not_called()
        assert not owner._tasks
        owner.stop()
