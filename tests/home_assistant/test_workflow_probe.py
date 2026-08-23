"""Tests for the restricted no-side-effect workflow lifecycle probe."""

from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.core import Context, Event, HomeAssistant, callback

from custom_components.ai_orchestrator.const import WORKFLOW_PROBE_EVENT
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.workflow_probe import (
    WorkflowProbeInvariantError,
    async_run_workflow_probe,
    async_setup_workflow_probe,
    async_unload_workflow_probe,
)


def test_setup_is_idempotent_and_each_trigger_executes_once(
    hass: HomeAssistant,
) -> None:
    """Repeated setup cannot attach a duplicate probe listener."""
    async_setup_workflow_probe(hass)
    async_setup_workflow_probe(hass)

    runtime = async_get_runtime(hass)
    assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1
    assert runtime.workflow_probe_registration_count == 1

    first = async_run_workflow_probe(hass, context=Context())
    second = async_run_workflow_probe(hass, context=Context())

    assert first == {
        "schema_version": 1,
        "workflow_id": "foundation_lifecycle_probe",
        "trigger_type": "integration_event",
        "execution_count": 1,
        "executions_for_trigger": 1,
        "registration_count": 1,
        "provider_contacted": False,
        "home_assistant_action_called": False,
    }
    assert second == {
        **first,
        "execution_count": 2,
    }


def test_unload_detaches_listener_and_reload_attaches_one(
    hass: HomeAssistant,
) -> None:
    """Unload stops execution and reload creates one new registration."""
    async_setup_workflow_probe(hass)
    before_unload = async_run_workflow_probe(hass, context=Context())
    async_unload_workflow_probe(hass)

    runtime = async_get_runtime(hass)
    assert WORKFLOW_PROBE_EVENT not in hass.bus.async_listeners()
    hass.bus.async_fire(WORKFLOW_PROBE_EVENT, {"source": "test"})
    assert runtime.workflow_probe_execution_count == before_unload["execution_count"]

    async_setup_workflow_probe(hass)
    assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1
    after_reload = async_run_workflow_probe(hass, context=Context())

    assert after_reload["execution_count"] == 2
    assert after_reload["executions_for_trigger"] == 1
    assert after_reload["registration_count"] == 2


def test_fresh_home_assistant_runtime_starts_with_one_listener_and_zero_runs(
    hass: HomeAssistant,
) -> None:
    """A fresh Home Assistant test runtime reproduces restart initialization."""
    runtime = async_get_runtime(hass)
    assert runtime.workflow_probe_execution_count == 0
    assert runtime.workflow_probe_registration_count == 0

    async_setup_workflow_probe(hass)

    assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1
    assert runtime.workflow_probe_execution_count == 0
    assert runtime.workflow_probe_registration_count == 1


def test_probe_calls_neither_provider_nor_home_assistant_action(
    hass: HomeAssistant,
) -> None:
    """The bounded trigger cannot cross either prohibited execution boundary."""
    async_setup_workflow_probe(hass)

    with (
        patch.object(
            type(hass.services), "async_call", new_callable=AsyncMock
        ) as call_action,
        patch(
            "custom_components.ai_orchestrator.providers.fake.FakeProvider.generate",
            new_callable=AsyncMock,
        ) as generate,
    ):
        result = async_run_workflow_probe(hass, context=Context())

    call_action.assert_not_awaited()
    generate.assert_not_awaited()
    assert result["provider_contacted"] is False
    assert result["home_assistant_action_called"] is False


def test_probe_preserves_context_on_its_internal_event(hass: HomeAssistant) -> None:
    """The initiating Home Assistant context reaches the bounded trigger."""
    observed_contexts: list[Context] = []

    @callback
    def _capture_context(event: Event[dict[str, str]]) -> None:
        observed_contexts.append(event.context)

    async_setup_workflow_probe(hass)
    remove_capture = hass.bus.async_listen(WORKFLOW_PROBE_EVENT, _capture_context)
    context = Context()
    try:
        async_run_workflow_probe(hass, context=context)
    finally:
        remove_capture()

    assert observed_contexts == [context]


def test_probe_fails_closed_if_duplicate_listener_executes(
    hass: HomeAssistant,
) -> None:
    """A duplicate execution raises instead of returning protocol success."""
    runtime = async_get_runtime(hass)

    @callback
    def _duplicate_execution(_event: Event[dict[str, str]]) -> None:
        runtime.workflow_probe_execution_count += 1

    async_setup_workflow_probe(hass)
    remove_duplicate = hass.bus.async_listen(
        WORKFLOW_PROBE_EVENT,
        _duplicate_execution,
    )
    try:
        with pytest.raises(WorkflowProbeInvariantError, match="exactly once"):
            async_run_workflow_probe(hass, context=Context())
    finally:
        remove_duplicate()
