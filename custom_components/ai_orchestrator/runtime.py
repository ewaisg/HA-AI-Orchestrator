"""Domain-wide runtime state for AI Orchestrator."""

import asyncio
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN

if TYPE_CHECKING:
    from .action_manager import ActionManager
    from .action_store import ActionStore
    from .agent_store import AgentStore
    from .agent_tools import ObservationToolEngine
    from .audit_lifecycle import AuditLifecycle
    from .audit_store import AuditStore
    from .chat import PendingChat
    from .provider_entry import ProviderEntryAdapter
    from .workflow_actions import WorkflowActions
    from .workflow_manager import WorkflowManager


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
    chat_in_progress: dict[str, PendingChat] = field(default_factory=dict)
    # Provider entries that forwarded the conversation entity platform.
    conversation_entry_ids: set[str] = field(default_factory=set)
    chat_recent_requests: dict[tuple[str, str], float] = field(default_factory=dict)
    owns_panel: bool = False
    workflow_probe_unsubscribe: Callable[[], None] | None = None
    workflow_probe_execution_count: int = 0
    workflow_probe_registration_count: int = 0
    workflow_manager: WorkflowManager | None = None
    workflow_actions: WorkflowActions | None = None
    agent_store: AgentStore | None = None
    action_store: ActionStore | None = None
    action_manager: ActionManager | None = None
    audit_store: AuditStore | None = None
    audit_lifecycle: AuditLifecycle | None = None
    action_ai_tasks: dict[str, tuple[str, asyncio.Task[Any]]] = field(
        default_factory=dict
    )
    agent_tool_engine: ObservationToolEngine | None = None
    agent_tool_users: dict[str, object] = field(default_factory=dict)
    agent_tool_recent_requests: dict[tuple[str, str], float] = field(
        default_factory=dict
    )
    workflow_dry_runs_in_progress: set[str] = field(default_factory=set)
    # user_id -> (provider entry_id, task) so a provider unload can cancel it.
    workflow_dry_run_tasks: dict[str, tuple[str, asyncio.Task[Any]]] = field(
        default_factory=dict
    )
    workflow_draft_tasks: dict[str, tuple[str, asyncio.Task[Any]]] = field(
        default_factory=dict
    )


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
