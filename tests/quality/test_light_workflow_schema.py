"""A light workflow plans one exact deterministic action, with no authority."""

from copy import deepcopy
from unittest.mock import AsyncMock

import pytest

from custom_components.ai_orchestrator.providers.contract import validate_schema_value
from custom_components.ai_orchestrator.workflow_draft_schema import draft_output_schema
from custom_components.ai_orchestrator.workflow_schema import (
    WorkflowValidationError,
    parse_workflow,
)
from custom_components.ai_orchestrator.workflow_steps import (
    StepContext,
    WorkflowStepError,
    run_ai_steps,
)

LIGHT_STEP = {
    "step_id": "light",
    "kind": "light_control",
    "target_registry_id": "synthetic-light-registry",
    "operation": "turn_on",
}
LIGHT_WORKFLOW = {
    "schema_version": 1,
    "workflow_id": "12345678-1234-4123-8123-123456789abc",
    "name": "Synthetic light schedule",
    "enabled": False,
    "run_mode": "execute",
    "provider_connection_id": None,
    "triggers": [{"kind": "time", "at_time": "20:00"}],
    "conditions": [],
    "steps": [LIGHT_STEP],
}


@pytest.mark.parametrize("operation", ["turn_on", "turn_off"])
@pytest.mark.parametrize("mode", ["observe", "execute"])
def test_closed_light_roundtrip(operation, mode):
    source = deepcopy(LIGHT_WORKFLOW)
    source["run_mode"] = mode
    source["steps"][0]["operation"] = operation
    parsed = parse_workflow(source)
    assert parsed.as_dict()["steps"] == source["steps"]
    assert parsed.provider_connection_id is None
    assert not parsed.enabled


@pytest.mark.parametrize(
    "change",
    [
        {"operation": "toggle"},
        {"operation": None},
        {"operation": True},
        {"target_registry_id": ""},
        {"target_registry_id": "x" * 65},
        {"target_registry_id": None},
        {"entity_id": "light.synthetic"},
        {"brightness": 128},
        {"service": "switch.turn_on"},
        {"grant": True},
        {"prompt": "Choose another device"},
    ],
)
def test_light_unknown_fields_and_invalid_values_rejected(change):
    with pytest.raises(WorkflowValidationError):
        parse_workflow({**LIGHT_WORKFLOW, "steps": [{**LIGHT_STEP, **change}]})


@pytest.mark.parametrize(
    "extra",
    [
        {**LIGHT_STEP, "step_id": "second"},
        {"step_id": "compose", "kind": "ai_compose", "prompt": "Synthetic"},
        {"step_id": "notify", "kind": "notify", "notify_service": "notify.synthetic"},
    ],
)
def test_light_cannot_mix_steps(extra):
    with pytest.raises(WorkflowValidationError):
        parse_workflow({**LIGHT_WORKFLOW, "steps": [LIGHT_STEP, extra]})


def test_light_provider_and_model_grants_rejected():
    with pytest.raises(WorkflowValidationError):
        parse_workflow(
            {**LIGHT_WORKFLOW, "provider_connection_id": LIGHT_WORKFLOW["workflow_id"]}
        )
    with pytest.raises(WorkflowValidationError):
        parse_workflow({**LIGHT_WORKFLOW, "unattended_grant": True})


@pytest.mark.parametrize("provider", [None, AsyncMock()])
async def test_light_plan_never_calls_provider(provider):
    result = await run_ai_steps(
        parse_workflow(LIGHT_WORKFLOW),
        StepContext(
            workflow_name="Synthetic", event={"kind": "time"}, time="20:00", states={}
        ),
        provider,
    )
    assert result == {
        "steps": [{**LIGHT_STEP, "index": 0, "executed": False, "status": "planned"}],
        "provider_calls": 0,
        "actions_executed": 0,
        "completed": True,
    }
    if provider is not None:
        provider.generate.assert_not_called()


async def test_actual_ai_step_still_requires_provider():
    workflow = parse_workflow(
        {
            **LIGHT_WORKFLOW,
            "run_mode": "observe",
            "steps": [
                {"step_id": "compose", "kind": "ai_compose", "prompt": "Synthetic"}
            ],
        }
    )
    with pytest.raises(WorkflowStepError):
        await run_ai_steps(
            workflow,
            StepContext(workflow_name="Synthetic", event={}, time="20:00", states={}),
            None,
        )


def test_draft_light_schema_uses_only_selected_registry_ids():
    draft = {
        key: LIGHT_WORKFLOW[key] for key in ("name", "triggers", "conditions", "steps")
    }
    draft["description"] = ""
    schema = draft_output_schema(
        ["light.synthetic"], [], [LIGHT_STEP["target_registry_id"]]
    )
    validate_schema_value(schema.schema, draft)
    for ids in (None, ["other-registry"]):
        with pytest.raises(ValueError):
            validate_schema_value(
                draft_output_schema(["light.synthetic"], [], ids).schema, draft
            )
