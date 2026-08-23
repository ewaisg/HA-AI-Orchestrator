"""Domain-wide runtime state for AI Orchestrator."""

from dataclasses import dataclass, field

from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN


@dataclass(slots=True)
class AIOrchestratorRuntime:
    """Track resources shared by every loaded foundation entry."""

    loaded_foundation_entry_ids: set[str] = field(default_factory=set)
    owns_panel: bool = False


@callback
def async_get_runtime(hass: HomeAssistant) -> AIOrchestratorRuntime:
    """Return the integration-wide runtime, creating it when needed."""
    runtime = hass.data.get(DOMAIN)
    if isinstance(runtime, AIOrchestratorRuntime):
        return runtime

    runtime = AIOrchestratorRuntime()
    hass.data[DOMAIN] = runtime
    return runtime


@callback
def is_foundation_loaded(hass: HomeAssistant) -> bool:
    """Return whether at least one foundation entry completed setup."""
    runtime = hass.data.get(DOMAIN)
    return isinstance(runtime, AIOrchestratorRuntime) and bool(
        runtime.loaded_foundation_entry_ids
    )
