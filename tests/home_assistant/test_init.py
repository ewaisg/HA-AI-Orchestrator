"""Tests for the AI Orchestrator integration lifecycle."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.components import frontend, panel_custom
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator import (
    async_setup,
    async_setup_entry,
    async_unload_entry,
)
from custom_components.ai_orchestrator.const import (
    DOMAIN,
    FOUNDATION_ENTRY_UNIQUE_ID,
    PANEL_URL_PATH,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime


async def test_async_setup_registers_global_surfaces(hass: HomeAssistant) -> None:
    """Static assets and the WebSocket command register at integration setup."""
    with (
        patch(
            "custom_components.ai_orchestrator.async_register_static_assets",
            new_callable=AsyncMock,
        ) as register_assets,
        patch(
            "custom_components.ai_orchestrator.async_register_websocket_commands"
        ) as register_websocket,
    ):
        assert await async_setup(hass, {})

    register_assets.assert_awaited_once_with(hass)
    register_websocket.assert_called_once_with(hass)
    assert async_get_runtime(hass).loaded_foundation_entry_ids == set()


async def test_entry_setup_and_unload_manage_panel(hass: HomeAssistant) -> None:
    """The foundation entry owns panel registration across its lifecycle."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )

    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=True,
        ) as register_panel,
        patch(
            "custom_components.ai_orchestrator.async_unregister_panel",
            new=Mock(),
        ) as unregister_panel,
    ):
        assert await async_setup_entry(hass, entry)
        runtime = async_get_runtime(hass)
        assert runtime.loaded_foundation_entry_ids == {entry.entry_id}
        assert runtime.owns_panel is True
        assert await async_unload_entry(hass, entry)
        assert runtime.loaded_foundation_entry_ids == set()
        assert runtime.owns_panel is False

    register_panel.assert_awaited_once_with(hass)
    unregister_panel.assert_called_once_with(hass)


async def test_unload_preserves_preexisting_panel(hass: HomeAssistant) -> None:
    """A panel found during setup remains untouched during unload."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )

    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=False,
        ) as register_panel,
        patch(
            "custom_components.ai_orchestrator.async_unregister_panel",
            new=Mock(),
        ) as unregister_panel,
    ):
        assert await async_setup_entry(hass, entry)
        runtime = async_get_runtime(hass)
        assert runtime.owns_panel is False
        assert await async_unload_entry(hass, entry)

    register_panel.assert_awaited_once_with(hass)
    unregister_panel.assert_not_called()


async def test_panel_unloads_only_after_last_loaded_foundation_entry(
    hass: HomeAssistant,
) -> None:
    """Domain-wide ownership survives until the last loaded entry unloads."""
    first = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    second = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )

    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=True,
        ) as register_panel,
        patch(
            "custom_components.ai_orchestrator.async_unregister_panel",
            new=Mock(),
        ) as unregister_panel,
    ):
        assert await async_setup_entry(hass, first)
        assert await async_setup_entry(hass, second)
        assert await async_unload_entry(hass, first)
        unregister_panel.assert_not_called()
        assert await async_unload_entry(hass, second)

    register_panel.assert_awaited_once_with(hass)
    unregister_panel.assert_called_once_with(hass)


async def test_non_foundation_entry_fails_without_loaded_state(
    hass: HomeAssistant,
) -> None:
    """An unrecognized Phase 0 entry cannot make the foundation look loaded."""
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id="not_the_foundation")

    with pytest.raises(ConfigEntryError, match="not a foundation entry"):
        await async_setup_entry(hass, entry)

    assert async_get_runtime(hass).loaded_foundation_entry_ids == set()


async def test_foreign_panel_collision_fails_entry_setup(
    hass: HomeAssistant,
) -> None:
    """A foreign panel collision propagates as a failed entry setup."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name="foreign-panel",
        module_url="/local/foreign-panel.js",
        require_admin=True,
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )

    with pytest.raises(ConfigEntryError, match="incompatible panel"):
        await async_setup_entry(hass, entry)

    runtime = async_get_runtime(hass)
    assert runtime.loaded_foundation_entry_ids == set()
    assert runtime.owns_panel is False


async def test_config_entry_manager_lifecycle(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Home Assistant's config-entry manager loads and unloads the foundation."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    assert async_get_runtime(hass).loaded_foundation_entry_ids == {entry.entry_id}
    assert frontend.async_panel_exists(hass, PANEL_URL_PATH)

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.NOT_LOADED
    assert async_get_runtime(hass).loaded_foundation_entry_ids == set()
    assert not frontend.async_panel_exists(hass, PANEL_URL_PATH)


async def test_config_entry_manager_reports_foreign_panel_collision(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """The manager reports setup failure and preserves a colliding panel."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name="foreign-panel",
        module_url="/local/foreign-panel.js",
        require_admin=True,
    )
    foreign_panel = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert async_get_runtime(hass).loaded_foundation_entry_ids == set()
    assert hass.data[frontend.DATA_PANELS][PANEL_URL_PATH] is foreign_panel
