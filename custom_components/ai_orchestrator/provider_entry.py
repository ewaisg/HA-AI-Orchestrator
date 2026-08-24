"""Home Assistant lifecycle contract for provider config entries."""

from __future__ import annotations

import math
import re
from collections.abc import Callable, Mapping
from copy import deepcopy
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Protocol
from uuid import UUID

import voluptuous as vol
from homeassistant.core import HomeAssistant, callback

from .providers.contract import ConnectionValidationResult, Provider
from .runtime import async_get_runtime

CONF_CONNECTION_ID = "connection_id"
CONF_ENTRY_KIND = "entry_kind"
CONF_PROVIDER_CONFIG = "provider_config"
CONF_PROVIDER_TYPE = "provider_type"

ENTRY_KIND_FOUNDATION = "foundation"
ENTRY_KIND_PROVIDER = "provider"
PROVIDER_UNIQUE_ID_PREFIX = "provider:"

_PROVIDER_TYPE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


class ProviderConfigMode(StrEnum):
    """Supported provider configuration operations."""

    SETUP = "setup"
    REAUTH = "reauth"
    RECONFIGURE = "reconfigure"


class ProviderEntryAdapter(Protocol):
    """Provider-specific configuration behind the shared entry lifecycle."""

    provider_type: str
    display_name: str

    def config_schema(
        self,
        mode: ProviderConfigMode,
    ) -> vol.Schema:
        """Return a form schema without receiving stored configuration."""
        ...

    def normalize_config(
        self,
        mode: ProviderConfigMode,
        current_config: Mapping[str, object] | None,
        user_input: Mapping[str, object],
    ) -> Mapping[str, object]:
        """Return complete JSON-serializable provider configuration."""
        ...

    async def async_create_provider(self, config: Mapping[str, object]) -> Provider:
        """Build a provider instance without storing it globally."""
        ...


@dataclass(frozen=True, slots=True)
class ProviderEntryData:
    """Validated provider-entry metadata and adapter-owned configuration."""

    connection_id: str
    provider_type: str
    provider_config: Mapping[str, object] = field(repr=False)


@dataclass(frozen=True, slots=True)
class LoadedProviderConnection:
    """Backend-only runtime data attached to one loaded provider entry."""

    connection_id: str
    provider_type: str
    provider: Provider = field(repr=False)
    validation: ConnectionValidationResult


@callback
def async_register_provider_entry_adapter(
    hass: HomeAssistant, adapter: ProviderEntryAdapter
) -> Callable[[], None]:
    """Register one provider entry adapter and return its unsubscriber."""
    _validate_provider_type(adapter.provider_type)
    if not adapter.display_name.strip():
        raise ValueError("Provider adapter display name cannot be empty")
    runtime = async_get_runtime(hass)
    if adapter.provider_type in runtime.provider_entry_adapters:
        raise ValueError("Provider adapter type is already registered")
    runtime.provider_entry_adapters[adapter.provider_type] = adapter

    @callback
    def unregister() -> None:
        if runtime.provider_entry_adapters.get(adapter.provider_type) is adapter:
            del runtime.provider_entry_adapters[adapter.provider_type]

    return unregister


def foundation_entry_data() -> dict[str, str]:
    """Return the complete version-2 foundation entry data."""
    return {CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION}


def provider_entry_unique_id(connection_id: str) -> str:
    """Return the stable config-entry unique ID for one connection."""
    _validate_connection_id(connection_id)
    return f"{PROVIDER_UNIQUE_ID_PREFIX}{connection_id}"


def validate_provider_entry_identity(
    unique_id: str | None, entry_data: ProviderEntryData
) -> None:
    """Require config-entry identity to match its stored connection ID."""
    if unique_id != provider_entry_unique_id(entry_data.connection_id):
        raise ValueError("Provider config entry unique ID does not match its data")


def build_provider_entry_data(
    *,
    connection_id: str,
    provider_type: str,
    provider_config: Mapping[str, object],
) -> dict[str, object]:
    """Build detached, JSON-serializable provider entry data."""
    _validate_connection_id(connection_id)
    _validate_provider_type(provider_type)
    config = _copy_json_mapping(provider_config)
    return {
        CONF_ENTRY_KIND: ENTRY_KIND_PROVIDER,
        CONF_CONNECTION_ID: connection_id,
        CONF_PROVIDER_TYPE: provider_type,
        CONF_PROVIDER_CONFIG: config,
    }


def copy_provider_config(
    provider_config: Mapping[str, object],
) -> dict[str, object]:
    """Return detached JSON data before an adapter or config entry receives it."""
    return _copy_json_mapping(provider_config)


def parse_provider_entry_data(data: Mapping[str, object]) -> ProviderEntryData:
    """Parse provider data without accepting ambiguous or extra top-level fields."""
    expected = {
        CONF_ENTRY_KIND,
        CONF_CONNECTION_ID,
        CONF_PROVIDER_TYPE,
        CONF_PROVIDER_CONFIG,
    }
    if set(data) != expected or data.get(CONF_ENTRY_KIND) != ENTRY_KIND_PROVIDER:
        raise ValueError("Provider config entry data has an invalid shape")
    connection_id = data[CONF_CONNECTION_ID]
    provider_type = data[CONF_PROVIDER_TYPE]
    provider_config = data[CONF_PROVIDER_CONFIG]
    if not isinstance(connection_id, str):
        raise TypeError("Provider connection ID must be a string")
    if not isinstance(provider_type, str):
        raise TypeError("Provider type must be a string")
    if not isinstance(provider_config, Mapping):
        raise TypeError("Provider configuration must be a mapping")
    _validate_connection_id(connection_id)
    _validate_provider_type(provider_type)
    return ProviderEntryData(
        connection_id=connection_id,
        provider_type=provider_type,
        provider_config=_copy_json_mapping(provider_config),
    )


def is_foundation_entry_data(data: Mapping[str, object]) -> bool:
    """Return whether data is the exact version-2 foundation shape."""
    return data == foundation_entry_data()


def _validate_provider_type(provider_type: str) -> None:
    if _PROVIDER_TYPE_PATTERN.fullmatch(provider_type) is None:
        raise ValueError("Provider type has an invalid format")


def _validate_connection_id(connection_id: str) -> None:
    try:
        parsed = UUID(connection_id)
    except (ValueError, AttributeError) as err:
        raise ValueError("Provider connection ID must be a canonical UUID") from err
    if str(parsed) != connection_id:
        raise ValueError("Provider connection ID must be a canonical UUID")


def _copy_json_mapping(value: Mapping[str, object]) -> dict[str, object]:
    if any(not isinstance(key, str) for key in value):
        raise TypeError("Provider configuration keys must be strings")
    copied = deepcopy(dict(value))
    _validate_json_value(copied, set())
    return copied


def _validate_json_value(value: object, active_container_ids: set[int]) -> None:
    """Reject values whose Python shape cannot survive HA JSON storage exactly."""
    if value is None or type(value) in {str, bool, int}:
        return
    if type(value) is float:
        if not math.isfinite(value):
            raise ValueError("Provider configuration numbers must be finite")
        return
    if type(value) not in {dict, list}:
        raise TypeError(
            "Provider configuration must contain only canonical JSON values"
        )

    container_id = id(value)
    if container_id in active_container_ids:
        raise ValueError("Provider configuration cannot contain circular values")
    active_container_ids.add(container_id)
    try:
        if type(value) is dict:
            for key, item in value.items():
                if type(key) is not str:
                    raise TypeError("Provider configuration keys must be strings")
                _validate_json_value(item, active_container_ids)
        else:
            for item in value:
                _validate_json_value(item, active_container_ids)
    finally:
        active_container_ids.remove(container_id)
