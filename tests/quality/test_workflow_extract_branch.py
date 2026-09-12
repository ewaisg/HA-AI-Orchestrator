"""Extract and branch step kinds (WFL-003 completion)."""

from __future__ import annotations

import pytest

from custom_components.ai_orchestrator import workflow_schema as schema
from custom_components.ai_orchestrator.providers.contract import (
    TextGenerationResult,
)
from custom_components.ai_orchestrator.workflow_steps import (
    EXTRACT_INSTRUCTION,
    StepContext,
    build_step_request,
    run_ai_steps,
)
from tests.quality.test_workflow_steps import ScriptedProvider, classification

CLASSIFY = {
    "step_id": "classify",
    "kind": "ai_classify",
    "prompt": "Classify.",
    "categories": ["urgent", "routine"],
}
EXTRACT = {
    "step_id": "extract",
    "kind": "ai_extract",
    "prompt": "Extract.",
    "fields": [
        {"name": "room", "type": "string"},
        {"name": "minutes_open", "type": "number"},
        {"name": "needs_action", "type": "boolean"},
    ],
}
BRANCH = {
    "step_id": "gate",
    "kind": "branch",
    "when_step_id": "classify",
    "when_category": "urgent",
}
COMPOSE = {"step_id": "compose", "kind": "ai_compose", "prompt": "Write."}
NOTIFY = {"step_id": "notify", "kind": "notify", "notify_service": "notify.synthetic"}
CONTEXT = StepContext(
    workflow_name="Window", event={"kind": "manual"}, time="20:00", states={}
)


def workflow(*steps):
    return schema.parse_workflow(
        {
            "schema_version": 1,
            "workflow_id": "12345678-1234-4123-8123-123456789abc",
            "name": "Window",
            "triggers": [{"kind": "manual"}],
            "steps": list(steps),
        }
    )


def extraction(**values):
    return TextGenerationResult(text="", structured_output=values)


def test_extract_and_branch_roundtrip_and_closed_keys() -> None:
    parsed = workflow(CLASSIFY, BRANCH, EXTRACT)
    assert parsed.as_dict()["steps"] == [CLASSIFY, BRANCH, EXTRACT]
    assert schema.parse_workflow(parsed.as_dict()) == parsed


@pytest.mark.parametrize(
    "bad",
    [
        {**EXTRACT, "fields": []},
        {**EXTRACT, "fields": [{"name": "Room", "type": "string"}]},
        {**EXTRACT, "fields": [{"name": "room", "type": "object"}]},
        {**EXTRACT, "fields": [{"name": "room", "type": "string", "extra": 1}]},
        {**EXTRACT, "fields": [{"name": "a", "type": "string"}] * 2},
        {**EXTRACT, "fields": [{"name": f"f{i}", "type": "string"} for i in range(11)]},
        {**EXTRACT, "categories": ["x", "y"]},
        {**BRANCH, "prompt": "x"},
    ],
)
def test_invalid_extract_or_branch_shapes_are_rejected(bad: dict) -> None:
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_step(bad)


def test_branch_must_gate_on_an_earlier_classify_category() -> None:
    with pytest.raises(schema.WorkflowValidationError, match="earlier ai_classify"):
        workflow(BRANCH, CLASSIFY)
    with pytest.raises(schema.WorkflowValidationError, match="earlier ai_classify"):
        workflow(COMPOSE, {**BRANCH, "when_step_id": "compose"})
    with pytest.raises(schema.WorkflowValidationError, match="categories"):
        workflow(CLASSIFY, {**BRANCH, "when_category": "other"})


def test_execute_mode_with_extract_needs_provider() -> None:
    with pytest.raises(schema.WorkflowValidationError, match="provider_connection_id"):
        schema.parse_workflow({**workflow(EXTRACT).as_dict(), "run_mode": "execute"})


def test_extract_request_uses_typed_closed_schema() -> None:
    request = build_step_request(workflow(EXTRACT).steps[0], CONTEXT)
    assert request.messages[0].content.startswith(EXTRACT_INSTRUCTION)
    assert "room (string), minutes_open (number), needs_action (boolean)" in (
        request.messages[0].content
    )
    assert request.output_schema is not None
    assert request.output_schema.schema["properties"]["minutes_open"] == {
        "type": "number"
    }
    assert tuple(request.output_schema.schema["required"]) == (
        "room",
        "minutes_open",
        "needs_action",
    )
    assert request.output_schema.schema["additionalProperties"] is False


async def test_extract_returns_only_typed_values() -> None:
    provider = ScriptedProvider(
        extraction(room="Office", minutes_open=12, needs_action=True)
    )
    outcome = await run_ai_steps(workflow(EXTRACT), CONTEXT, provider)
    assert outcome["steps"][0] == {
        "index": 0,
        "step_id": "extract",
        "kind": "ai_extract",
        "executed": True,
        "status": "ok",
        "values": {"room": "Office", "minutes_open": 12, "needs_action": True},
    }
    assert outcome["completed"] is True and outcome["provider_calls"] == 1


@pytest.mark.parametrize(
    "bad",
    [
        extraction(room="Office", minutes_open=12),
        extraction(room="Office", minutes_open="12", needs_action=True),
        extraction(room="Office", minutes_open=True, needs_action=True),
        extraction(room="Office", minutes_open=float("nan"), needs_action=True),
        extraction(room="x" * 501, minutes_open=1, needs_action=False),
        extraction(room="Office", minutes_open=1, needs_action=True, extra=1),
        TextGenerationResult(text='{"room": "Office"}'),
    ],
)
async def test_malformed_extraction_fails_closed(bad: TextGenerationResult) -> None:
    outcome = await run_ai_steps(
        workflow(EXTRACT, NOTIFY), CONTEXT, ScriptedProvider(bad)
    )
    assert outcome["completed"] is False
    assert outcome["steps"][0]["error"] == "invalid_output"
    assert "values" not in outcome["steps"][0]
    assert outcome["steps"][1]["status"] == "skipped"


async def test_branch_taken_continues_and_not_taken_skips_the_rest() -> None:
    taken = await run_ai_steps(
        workflow(CLASSIFY, BRANCH, COMPOSE, NOTIFY),
        CONTEXT,
        ScriptedProvider(classification("urgent"), TextGenerationResult(text="Go.")),
    )
    assert [s["status"] for s in taken["steps"]] == ["ok", "taken", "ok", "planned"]
    assert taken["completed"] is True and taken["provider_calls"] == 2

    not_taken = await run_ai_steps(
        workflow(CLASSIFY, BRANCH, COMPOSE, NOTIFY),
        CONTEXT,
        ScriptedProvider(classification("routine")),
    )
    assert [s["status"] for s in not_taken["steps"]] == [
        "ok",
        "not_taken",
        "skipped",
        "skipped",
    ]
    assert not_taken["completed"] is True
    assert not_taken["provider_calls"] == 1
    assert not_taken["steps"][1]["executed"] is False
