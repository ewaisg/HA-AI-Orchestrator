"""Config flow for the AI Orchestrator foundation."""

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import ConfigFlowResult

from .const import DOMAIN, FOUNDATION_ENTRY_UNIQUE_ID, NAME


class AIOrchestratorConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create the integration-level foundation entry."""

    VERSION = 1
    MINOR_VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle the user-initiated setup flow."""
        await self.async_set_unique_id(FOUNDATION_ENTRY_UNIQUE_ID)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(title=NAME, data={})

        return self.async_show_form(step_id="user", data_schema=vol.Schema({}))
