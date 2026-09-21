"""Foundation recovery ordering keeps incomplete audit writes behind a closed gate."""

from unittest.mock import AsyncMock, patch

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator import async_setup_entry, async_unload_entry
from custom_components.ai_orchestrator.agent_store import AgentPolicyError
from custom_components.ai_orchestrator.audit_store import AuditStoreError
from custom_components.ai_orchestrator.const import DOMAIN, FOUNDATION_ENTRY_UNIQUE_ID
from custom_components.ai_orchestrator.runtime import async_get_runtime


def entry():
    return MockConfigEntry(domain=DOMAIN, data={}, unique_id=FOUNDATION_ENTRY_UNIQUE_ID)


async def test_unreadable_audit_keeps_actions_closed_and_foundation_available(hass):
    foundation = entry()
    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=False,
        ),
        patch(
            "custom_components.ai_orchestrator.audit_lifecycle.AuditLifecycle.async_start",
            side_effect=AuditStoreError("PRIVATE_CONTENT"),
        ),
    ):
        assert await async_setup_entry(hass, foundation)
    runtime = async_get_runtime(hass)
    assert foundation.entry_id in runtime.loaded_foundation_entry_ids
    assert runtime.action_manager._stopped
    assert runtime.audit_lifecycle._unsubscribe is None
    assert await async_unload_entry(hass, foundation)


async def test_old_dispatch_must_settle_before_journal_recovery(hass):
    foundation = entry()
    with patch(
        "custom_components.ai_orchestrator.async_register_panel",
        new_callable=AsyncMock,
        return_value=False,
    ):
        assert await async_setup_entry(hass, foundation)
        runtime = async_get_runtime(hass)
        assert await async_unload_entry(hass, foundation)
        with (
            patch.object(
                runtime.action_manager,
                "async_wait_stopped",
                side_effect=AgentPolicyError("pending"),
            ),
            patch.object(
                runtime.audit_store, "async_load", new_callable=AsyncMock
            ) as recover,
        ):
            assert await async_setup_entry(hass, foundation)
        recover.assert_not_called()
        assert runtime.action_manager._stopped
        assert runtime.audit_lifecycle._unsubscribe is None
        assert await async_unload_entry(hass, foundation)


async def test_successful_reload_drains_before_load_and_reopens_last(hass):
    foundation = entry()
    with patch(
        "custom_components.ai_orchestrator.async_register_panel",
        new_callable=AsyncMock,
        return_value=False,
    ):
        assert await async_setup_entry(hass, foundation)
        runtime = async_get_runtime(hass)
        assert await async_unload_entry(hass, foundation)
        observed = []

        async def drain():
            assert runtime.action_manager._stopped
            observed.append("drain")

        original = runtime.audit_store.async_load

        async def recover():
            observed.append("recover")
            await original()

        with (
            patch.object(
                runtime.action_manager, "async_wait_stopped", side_effect=drain
            ),
            patch.object(runtime.audit_store, "async_load", side_effect=recover),
        ):
            assert await async_setup_entry(hass, foundation)
        assert observed == ["drain", "recover", "drain"]
        assert not runtime.action_manager._stopped
        assert runtime.audit_lifecycle._unsubscribe is not None
        assert await async_unload_entry(hass, foundation)
