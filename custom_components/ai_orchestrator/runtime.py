"""Domain-wide runtime state for AI Orchestrator."""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN

if TYPE_CHECKING:
    from .provider_entry import ProviderEntryAdapter


@dataclass(frozen=True, slots=True)
class ProviderTestStatus:
    """Last explicit provider test completed in this runtime."""

    health: str
    error_code: str | None
    tested_at: str


@dataclass(slots=True)
class AIOrchestratorRuntime:
    """Track resources shared by every loaded foundation entry."""

    loaded_foundation_entry_ids: set[str] = field(default_factory=set)
    loaded_provider_entry_ids: set[str] = field(default_factory=set)
    provider_entry_adapters: dict[str, ProviderEntryAdapter] = field(
        default_factory=dict
    )
    provider_test_in_progress_connection_ids: set[str] = field(default_factory=set)
    provider_test_statuses: dict[str, ProviderTestStatus] = field(default_factory=dict)
    owns_panel: bool = False
    workflow_probe_unsubscribe: Callable[[], None] | None = None
    workflow_probe_execution_count: int = 0
    workflow_probe_registration_count: int = 0


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
