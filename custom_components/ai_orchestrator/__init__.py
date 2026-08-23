"""AI Orchestrator Home Assistant integration."""

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError
from homeassistant.helpers.typing import ConfigType

from .const import FOUNDATION_ENTRY_UNIQUE_ID
from .panel import (
    async_register_panel,
    async_register_static_assets,
    async_unregister_panel,
)
from .runtime import async_get_runtime
from .websocket_api import async_register_websocket_commands
from .workflow_probe import (
    async_setup_workflow_probe,
    async_unload_workflow_probe,
)

type AIOrchestratorConfigEntry = ConfigEntry[None]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up integration-wide static and authenticated API surfaces."""
    async_get_runtime(hass)
    await async_register_static_assets(hass)
    async_register_websocket_commands(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    """Set up the integration-level foundation entry."""
    if entry.unique_id != FOUNDATION_ENTRY_UNIQUE_ID:
        raise ConfigEntryError("AI Orchestrator config entry is not a foundation entry")

    runtime = async_get_runtime(hass)
    if entry.entry_id in runtime.loaded_foundation_entry_ids:
        return True

    if not runtime.loaded_foundation_entry_ids:
        runtime.owns_panel = await async_register_panel(hass)
        async_setup_workflow_probe(hass)
    runtime.loaded_foundation_entry_ids.add(entry.entry_id)
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    """Unload the integration-level foundation entry."""
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.discard(entry.entry_id)
    if runtime.loaded_foundation_entry_ids:
        return True

    async_unload_workflow_probe(hass)
    if runtime.owns_panel:
        async_unregister_panel(hass)
        runtime.owns_panel = False
    return True
