"""Tests for the AI Orchestrator config flow."""

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator.const import (
    DOMAIN,
    FOUNDATION_ENTRY_UNIQUE_ID,
    NAME,
)


async def test_user_flow_creates_empty_foundation_entry(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """The setup flow stores no provider, endpoint, model, or secret data."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == NAME
    assert result["data"] == {}
    assert result["result"].unique_id == FOUNDATION_ENTRY_UNIQUE_ID


async def test_user_flow_aborts_when_foundation_exists(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """A second user flow cannot create another foundation entry."""
    MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    ).add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"
