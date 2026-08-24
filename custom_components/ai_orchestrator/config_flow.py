"""Config flow for the AI Orchestrator foundation and provider entries."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from uuid import uuid4

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry, ConfigFlowResult

from .const import DOMAIN, FOUNDATION_ENTRY_UNIQUE_ID, NAME
from .provider_entry import (
    CONF_PROVIDER_TYPE,
    ProviderConfigMode,
    ProviderEntryAdapter,
    build_provider_entry_data,
    copy_provider_config,
    foundation_entry_data,
    parse_provider_entry_data,
    provider_entry_unique_id,
    validate_provider_entry_identity,
)
from .providers.contract import ErrorCode, ProviderError, safe_provider_error_code
from .runtime import async_get_runtime

_TRANSIENT_ERRORS = {
    ErrorCode.CONNECTION,
    ErrorCode.DNS,
    ErrorCode.PROVIDER_UNAVAILABLE,
    ErrorCode.RATE_LIMITED,
    ErrorCode.TIMEOUT,
    ErrorCode.TLS,
}


class AIOrchestratorConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create the foundation and provider connection entries."""

    VERSION = 2
    MINOR_VERSION = 1

    _provider_type: str | None = None

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Create the foundation first, then route later flows to providers."""
        if not self._foundation_exists():
            await self.async_set_unique_id(FOUNDATION_ENTRY_UNIQUE_ID)
            self._abort_if_unique_id_configured()
            if user_input is not None:
                return self.async_create_entry(
                    title=NAME,
                    data=foundation_entry_data(),
                )
            return self.async_show_form(step_id="user", data_schema=vol.Schema({}))

        return await self.async_step_provider_type(user_input)

    async def async_step_provider_type(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Select one currently registered provider adapter."""
        adapters = async_get_runtime(self.hass).provider_entry_adapters
        if not adapters:
            return self.async_abort(reason="no_provider_adapters")
        if user_input is not None:
            provider_type = user_input[CONF_PROVIDER_TYPE]
            if provider_type not in adapters:
                return self.async_abort(reason="unsupported_provider")
            self._provider_type = provider_type
            return await self.async_step_provider()
        return self.async_show_form(
            step_id="provider_type",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_PROVIDER_TYPE): vol.In(
                        {
                            provider_type: adapter.display_name
                            for provider_type, adapter in sorted(adapters.items())
                        }
                    )
                }
            ),
        )

    async def async_step_provider(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Validate adapter-owned configuration and create one provider entry."""
        adapter = self._selected_adapter()
        if adapter is None:
            return self.async_abort(reason="unsupported_provider")
        if user_input is None:
            return self._show_provider_form(
                "provider", adapter, ProviderConfigMode.SETUP
            )
        config, error = await self._async_normalize_and_validate(
            adapter,
            ProviderConfigMode.SETUP,
            None,
            user_input,
        )
        if error is not None:
            return self._show_provider_form(
                "provider",
                adapter,
                ProviderConfigMode.SETUP,
                errors={"base": error},
            )
        if config is None:
            return self._show_provider_form(
                "provider",
                adapter,
                ProviderConfigMode.SETUP,
                errors={"base": "unknown"},
            )
        connection_id = str(uuid4())
        await self.async_set_unique_id(provider_entry_unique_id(connection_id))
        self._abort_if_unique_id_configured()
        return self.async_create_entry(
            title=f"{adapter.display_name} {connection_id[:8]}",
            data=build_provider_entry_data(
                connection_id=connection_id,
                provider_type=adapter.provider_type,
                provider_config=config,
            ),
        )

    async def async_step_reauth(
        self, entry_data: Mapping[str, object]
    ) -> ConfigFlowResult:
        """Start credential replacement for one provider entry."""
        del entry_data
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Validate replacement credentials and reload the entry."""
        return await self._async_update_provider(
            ProviderConfigMode.REAUTH,
            user_input,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Validate changed provider configuration and reload the entry."""
        return await self._async_update_provider(
            ProviderConfigMode.RECONFIGURE,
            user_input,
        )

    def _foundation_exists(self) -> bool:
        return any(
            entry.unique_id == FOUNDATION_ENTRY_UNIQUE_ID
            for entry in self._async_current_entries()
        )

    def _selected_adapter(self) -> ProviderEntryAdapter | None:
        if self._provider_type is None:
            return None
        return async_get_runtime(self.hass).provider_entry_adapters.get(
            self._provider_type
        )

    async def _async_update_provider(
        self,
        mode: ProviderConfigMode,
        user_input: dict[str, Any] | None,
    ) -> ConfigFlowResult:
        entry = self._entry_for_update(mode)
        try:
            parsed = parse_provider_entry_data(entry.data)
            validate_provider_entry_identity(entry.unique_id, parsed)
        except TypeError, ValueError:
            return self.async_abort(reason="invalid_provider_entry")
        adapter = async_get_runtime(self.hass).provider_entry_adapters.get(
            parsed.provider_type
        )
        if adapter is None:
            return self.async_abort(reason="unsupported_provider")
        step_id = (
            "reauth_confirm" if mode is ProviderConfigMode.REAUTH else "reconfigure"
        )
        if user_input is None:
            return self._show_provider_form(step_id, adapter, mode)
        config, error = await self._async_normalize_and_validate(
            adapter,
            mode,
            parsed.provider_config,
            user_input,
        )
        if error is not None:
            return self._show_provider_form(
                step_id,
                adapter,
                mode,
                errors={"base": error},
            )
        if config is None:
            return self._show_provider_form(
                step_id,
                adapter,
                mode,
                errors={"base": "unknown"},
            )
        updated_data = build_provider_entry_data(
            connection_id=parsed.connection_id,
            provider_type=parsed.provider_type,
            provider_config=config,
        )
        return self.async_update_reload_and_abort(entry, data=updated_data)

    def _entry_for_update(self, mode: ProviderConfigMode) -> ConfigEntry:
        if mode is ProviderConfigMode.REAUTH:
            return self._get_reauth_entry()
        return self._get_reconfigure_entry()

    def _show_provider_form(
        self,
        step_id: str,
        adapter: ProviderEntryAdapter,
        mode: ProviderConfigMode,
        *,
        errors: dict[str, str] | None = None,
    ) -> ConfigFlowResult:
        """Build an adapter form without exposing schema callback failures."""
        try:
            schema = adapter.config_schema(mode)
            if not isinstance(schema, vol.Schema):
                raise TypeError("Provider schema must use voluptuous Schema")
        except Exception:  # noqa: BLE001 -- adapter details must not reach the UI.
            return self.async_abort(reason="provider_schema_error")
        return self.async_show_form(
            step_id=step_id,
            data_schema=schema,
            errors=errors,
        )

    async def _async_normalize_and_validate(
        self,
        adapter: ProviderEntryAdapter,
        mode: ProviderConfigMode,
        current_config: Mapping[str, object] | None,
        user_input: Mapping[str, object],
    ) -> tuple[Mapping[str, object] | None, str | None]:
        try:
            canonical_config = copy_provider_config(
                adapter.normalize_config(mode, current_config, user_input)
            )
            provider = await adapter.async_create_provider(
                copy_provider_config(canonical_config)
            )
            await provider.validate_connection()
        except ProviderError as err:
            return None, _flow_error_for_provider_error(err)
        except TypeError, ValueError:
            return None, "invalid_config"
        except Exception:  # noqa: BLE001 -- raw adapter failures never reach the UI.
            return None, "unknown"
        return copy_provider_config(canonical_config), None


def _flow_error_for_provider_error(error: ProviderError) -> str:
    code = safe_provider_error_code(error)
    if code is ErrorCode.AUTHENTICATION:
        return "invalid_auth"
    if code is ErrorCode.AUTHORIZATION:
        return "insufficient_permissions"
    if code in _TRANSIENT_ERRORS:
        return "cannot_connect"
    return "invalid_config"
