"""AI Orchestrator Home Assistant integration."""

from typing import NoReturn

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import (
    ConfigEntryAuthFailed,
    ConfigEntryError,
    ConfigEntryNotReady,
)
from homeassistant.helpers.typing import ConfigType

from .const import FOUNDATION_ENTRY_UNIQUE_ID
from .panel import (
    async_register_panel,
    async_register_static_assets,
    async_unregister_panel,
)
from .provider_entry import (
    LoadedProviderConnection,
    copy_provider_config,
    foundation_entry_data,
    is_foundation_entry_data,
    parse_provider_entry_data,
    validate_provider_entry_identity,
)
from .providers.contract import (
    SAFE_ERROR_MESSAGES,
    ConnectionValidationResult,
    ErrorCode,
    ProviderError,
)
from .runtime import async_get_runtime
from .websocket_api import async_register_websocket_commands
from .workflow_probe import (
    async_setup_workflow_probe,
    async_unload_workflow_probe,
)

type AIOrchestratorConfigEntry = ConfigEntry[LoadedProviderConnection | None]

_TRANSIENT_SETUP_ERRORS = {
    ErrorCode.CONNECTION,
    ErrorCode.DNS,
    ErrorCode.PROVIDER_UNAVAILABLE,
    ErrorCode.RATE_LIMITED,
    ErrorCode.TIMEOUT,
    ErrorCode.TLS,
}


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up integration-wide static and authenticated API surfaces."""
    async_get_runtime(hass)
    await async_register_static_assets(hass)
    async_register_websocket_commands(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    """Set up either the foundation or one provider connection entry."""
    if entry.unique_id != FOUNDATION_ENTRY_UNIQUE_ID:
        return await _async_setup_provider_entry(hass, entry)

    if entry.version >= 2 and not is_foundation_entry_data(entry.data):
        raise ConfigEntryError("AI Orchestrator foundation entry data is invalid")

    runtime = async_get_runtime(hass)
    if entry.entry_id in runtime.loaded_foundation_entry_ids:
        return True

    if not runtime.loaded_foundation_entry_ids:
        runtime.owns_panel = await async_register_panel(hass)
        async_setup_workflow_probe(hass)
    runtime.loaded_foundation_entry_ids.add(entry.entry_id)
    entry.runtime_data = None
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    """Unload either the foundation or one provider connection entry."""
    runtime = async_get_runtime(hass)
    if entry.unique_id != FOUNDATION_ENTRY_UNIQUE_ID:
        runtime.loaded_provider_entry_ids.discard(entry.entry_id)
        entry.runtime_data = None
        return True

    runtime.loaded_foundation_entry_ids.discard(entry.entry_id)
    if runtime.loaded_foundation_entry_ids:
        return True

    async_unload_workflow_probe(hass)
    if runtime.owns_panel:
        async_unregister_panel(hass)
        runtime.owns_panel = False
    return True


async def async_migrate_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    """Migrate only the known version-1 foundation entry to version 2."""
    if entry.version == 1 and entry.minor_version == 1:
        if entry.unique_id != FOUNDATION_ENTRY_UNIQUE_ID or entry.data:
            return False
        hass.config_entries.async_update_entry(
            entry,
            data=foundation_entry_data(),
            version=2,
            minor_version=1,
        )
        return True
    if entry.version != 2 or entry.minor_version != 1:
        return False
    if entry.unique_id == FOUNDATION_ENTRY_UNIQUE_ID:
        return is_foundation_entry_data(entry.data)
    try:
        parsed = parse_provider_entry_data(entry.data)
        validate_provider_entry_identity(entry.unique_id, parsed)
    except TypeError, ValueError:
        return False
    return True


async def _async_setup_provider_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    runtime = async_get_runtime(hass)
    if entry.entry_id in runtime.loaded_provider_entry_ids:
        return True
    try:
        parsed = parse_provider_entry_data(entry.data)
        validate_provider_entry_identity(entry.unique_id, parsed)
    except (TypeError, ValueError) as err:
        raise ConfigEntryError("Provider config entry data is invalid") from err
    adapter = runtime.provider_entry_adapters.get(parsed.provider_type)
    if adapter is None:
        raise ConfigEntryError("Provider type is not registered")
    try:
        provider = await adapter.async_create_provider(
            copy_provider_config(parsed.provider_config)
        )
        validation = await provider.validate_connection()
    except ProviderError as err:
        _raise_provider_setup_error(err)
    except Exception:  # noqa: BLE001 -- adapter details must stay backend-only.
        raise ConfigEntryError("Provider setup failed safely") from None
    if not isinstance(validation, ConnectionValidationResult):
        raise ConfigEntryError("Provider returned invalid connection validation data")
    entry.runtime_data = LoadedProviderConnection(
        connection_id=parsed.connection_id,
        provider_type=parsed.provider_type,
        provider=provider,
        validation=validation,
    )
    runtime.loaded_provider_entry_ids.add(entry.entry_id)
    return True


def _raise_provider_setup_error(error: ProviderError) -> NoReturn:
    code = getattr(error.error, "code", None)
    message = SAFE_ERROR_MESSAGES.get(code, "Provider setup failed safely")
    if code is ErrorCode.AUTHENTICATION:
        raise ConfigEntryAuthFailed(message) from None
    if code in _TRANSIENT_SETUP_ERRORS:
        raise ConfigEntryNotReady(message) from None
    raise ConfigEntryError(message) from None
