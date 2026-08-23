"""Restricted no-side-effect workflow lifecycle probe.

This Phase 0 probe validates trigger registration and cleanup without calling a
provider or a Home Assistant action. It is not the product workflow runtime.
"""

from typing import TypedDict

from homeassistant.core import Context, Event, HomeAssistant, callback

from .const import (
    WORKFLOW_PROBE_EVENT,
    WORKFLOW_PROBE_ID,
    WORKFLOW_PROBE_SCHEMA_VERSION,
    WORKFLOW_PROBE_TRIGGER_TYPE,
)
from .runtime import async_get_runtime


class WorkflowProbeResult(TypedDict):
    """Exact public result returned by the bounded probe command."""

    schema_version: int
    workflow_id: str
    trigger_type: str
    execution_count: int
    executions_for_trigger: int
    registration_count: int
    provider_contacted: bool
    home_assistant_action_called: bool


class WorkflowProbeInvariantError(RuntimeError):
    """Raised when one probe trigger does not produce exactly one execution."""


@callback
def async_setup_workflow_probe(hass: HomeAssistant) -> None:
    """Register exactly one integration-owned probe event listener."""
    runtime = async_get_runtime(hass)
    if runtime.workflow_probe_unsubscribe is not None:
        return

    @callback
    def _handle_probe_event(_event: Event[dict[str, str]]) -> None:
        runtime.workflow_probe_execution_count += 1

    runtime.workflow_probe_unsubscribe = hass.bus.async_listen(
        WORKFLOW_PROBE_EVENT,
        _handle_probe_event,
    )
    runtime.workflow_probe_registration_count += 1


@callback
def async_unload_workflow_probe(hass: HomeAssistant) -> None:
    """Detach the probe listener without resetting its in-memory evidence."""
    runtime = async_get_runtime(hass)
    if runtime.workflow_probe_unsubscribe is None:
        return

    runtime.workflow_probe_unsubscribe()
    runtime.workflow_probe_unsubscribe = None


@callback
def async_run_workflow_probe(
    hass: HomeAssistant,
    *,
    context: Context,
) -> WorkflowProbeResult:
    """Fire one bounded internal trigger and report the exact execution delta."""
    runtime = async_get_runtime(hass)
    before = runtime.workflow_probe_execution_count
    hass.bus.async_fire(
        WORKFLOW_PROBE_EVENT,
        {"source": "admin_websocket"},
        context=context,
    )
    after = runtime.workflow_probe_execution_count
    executions_for_trigger = after - before
    if executions_for_trigger != 1:
        raise WorkflowProbeInvariantError(
            "The workflow lifecycle probe did not execute exactly once"
        )

    return {
        "schema_version": WORKFLOW_PROBE_SCHEMA_VERSION,
        "workflow_id": WORKFLOW_PROBE_ID,
        "trigger_type": WORKFLOW_PROBE_TRIGGER_TYPE,
        "execution_count": after,
        "executions_for_trigger": executions_for_trigger,
        "registration_count": runtime.workflow_probe_registration_count,
        "provider_contacted": False,
        "home_assistant_action_called": False,
    }
