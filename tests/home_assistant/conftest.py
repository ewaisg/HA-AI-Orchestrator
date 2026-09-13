"""Shared Home Assistant test environment for this integration's suites."""

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component


@pytest.fixture(autouse=True)
async def setup_homeassistant_component(hass: HomeAssistant) -> None:
    """Set up the core `homeassistant` component, as a real instance always has.

    This integration depends on `conversation`, whose setup reads the core
    component's exposed-entity store. A bare test instance does not create it.
    """
    assert await async_setup_component(hass, "homeassistant", {})
