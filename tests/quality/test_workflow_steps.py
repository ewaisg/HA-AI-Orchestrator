"""Pure tests for bounded AI step execution (WFL-003)."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

import pytest

from custom_components.ai_orchestrator.providers.contract import (
    SAFE_ERROR_MESSAGES,
    ErrorCode,
    MessageRole,
    NormalizedError,
    ProviderError,
    ProviderRequest,
    StreamEvent,
    TextGenerationResult,
    ToolCall,
)
from custom_components.ai_orchestrator.workflow_schema import parse_workflow
from custom_components.ai_orchestrator.workflow_steps import (
    CLASSIFY_INSTRUCTION,
    COMPOSE_INSTRUCTION,
    ERROR_INVALID_OUTPUT,
    ERROR_TIMEOUT,
    MAX_COMPOSE_CHARS,
    MAX_CONTEXT_STATES,
    StepContext,
    WorkflowStepError,
    build_step_request,
    run_ai_steps,
)

MARKER = "private-household-marker"
WORKFLOW = {
    "schema_version": 1,
    "workflow_id": "12345678-1234-4123-8123-123456789abc",
    "name": "Window reminder",
    "enabled": False,
    "triggers": [{"kind": "manual"}],
    "conditions": [],
    "steps": [
        {
            "step_id": "classify",
            "kind": "ai_classify",
            "prompt": "Classify.",
            "categories": ["urgent", "routine"],
        },
        {"step_id": "compose", "kind": "ai_compose", "prompt": "Write a reminder."},
        {"step_id": "notify", "kind": "notify", "notify_service": "notify.synthetic"},
    ],
}
CONTEXT = StepContext(
    workflow_name="Window reminder",
    event={
        "kind": "state",
        "entity_id": "binary_sensor.synthetic_window",
        "from_state": "off",
        "to_state": "on",
    },
    time="20:00",
    states={"binary_sensor.synthetic_window": "on"},
)


class ScriptedProvider:
    """Answers generate() from a queue and records every request."""

    def __init__(self, *outcomes: object) -> None:
        self.outcomes = list(outcomes)
        self.requests: list[ProviderRequest] = []

    async def generate(self, request: ProviderRequest) -> TextGenerationResult:
        self.requests.append(request)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, BaseException):
            raise outcome
        if callable(outcome):
            return await outcome()
        return outcome

    async def stream(self, request: ProviderRequest) -> AsyncIterator[StreamEvent]:
        raise AssertionError("stream is never used")
        yield  # pragma: no cover


def provider_error(code: ErrorCode) -> ProviderError:
    return ProviderError(
        NormalizedError(code=code, message=SAFE_ERROR_MESSAGES[code]),
        retry_allowed=False,
        failover_allowed=False,
    )


def classification(category: str) -> TextGenerationResult:
    return TextGenerationResult(text="", structured_output={"category": category})


def test_context_is_bounded_and_rendered_deterministically() -> None:
    text = CONTEXT.as_text()
    assert text.splitlines() == [
        "Workflow: Window reminder",
        "Time: 20:00",
        "Event: entity_id=binary_sensor.synthetic_window, from_state=off, "
        "kind=state, to_state=on",
        "States:",
        "- binary_sensor.synthetic_window: on",
    ]
    with pytest.raises(WorkflowStepError):
        StepContext(
            workflow_name="x",
            event={"kind": "manual"},
            time="20:00",
            states={f"sensor.s{i}": "1" for i in range(MAX_CONTEXT_STATES + 1)},
        )
    with pytest.raises(WorkflowStepError):
        StepContext(
            workflow_name="x",
            event={"kind": "manual"},
            time="20:00",
            states={"sensor.a": "x" * 256},
        )
    with pytest.raises(WorkflowStepError):
        StepContext(workflow_name="x", event={"kind": 1}, time="20:00", states={})  # type: ignore[dict-item]


def test_requests_carry_only_instruction_prompt_and_context() -> None:
    workflow = parse_workflow(WORKFLOW)
    classify = build_step_request(workflow.steps[0], CONTEXT)
    compose = build_step_request(workflow.steps[1], CONTEXT)

    assert [m.role for m in classify.messages] == [MessageRole.SYSTEM, MessageRole.USER]
    assert classify.messages[0].content.startswith(CLASSIFY_INSTRUCTION)
    assert "urgent, routine" in classify.messages[0].content
    assert classify.messages[1].content == "Classify.\n\n" + CONTEXT.as_text()
    assert classify.output_schema is not None
    assert tuple(classify.output_schema.schema["properties"]["category"]["enum"]) == (
        "urgent",
        "routine",
    )
    assert classify.tools == ()

    assert compose.messages[0].content == COMPOSE_INSTRUCTION
    assert compose.messages[1].content == "Write a reminder.\n\n" + CONTEXT.as_text()
    assert compose.output_schema is None
    with pytest.raises(WorkflowStepError):
        build_step_request(workflow.steps[2], CONTEXT)


async def test_ai_steps_run_in_order_and_notify_is_only_planned() -> None:
    provider = ScriptedProvider(
        classification("urgent"), TextGenerationResult(text="  Close the window.  ")
    )
    outcome = await run_ai_steps(parse_workflow(WORKFLOW), CONTEXT, provider)

    assert outcome == {
        "steps": [
            {
                "index": 0,
                "step_id": "classify",
                "kind": "ai_classify",
                "executed": True,
                "status": "ok",
                "category": "urgent",
            },
            {
                "index": 1,
                "step_id": "compose",
                "kind": "ai_compose",
                "executed": True,
                "status": "ok",
                "text": "Close the window.",
            },
            {
                "index": 2,
                "step_id": "notify",
                "kind": "notify",
                "executed": False,
                "status": "planned",
                "message_step_id": "compose",
            },
        ],
        "provider_calls": 2,
        "actions_executed": 0,
        "completed": True,
    }
    assert len(provider.requests) == 2


@pytest.mark.parametrize(
    "bad",
    [
        TextGenerationResult(text="   "),
        TextGenerationResult(text="x" * (MAX_COMPOSE_CHARS + 1)),
        TextGenerationResult(text="ok", structured_output={"category": "urgent"}),
        TextGenerationResult(
            text="ok", tool_calls=(ToolCall(id="1", name="do_it", arguments={}),)
        ),
        "not a result",
    ],
)
async def test_malformed_compose_output_fails_closed(bad: object) -> None:
    provider = ScriptedProvider(classification("routine"), bad)
    outcome = await run_ai_steps(parse_workflow(WORKFLOW), CONTEXT, provider)

    assert outcome["completed"] is False
    assert outcome["provider_calls"] == 2
    assert outcome["steps"][1] == {
        "index": 1,
        "step_id": "compose",
        "kind": "ai_compose",
        "executed": False,
        "status": "failed",
        "error": ERROR_INVALID_OUTPUT,
    }
    assert outcome["steps"][2]["status"] == "skipped"
    assert "text" not in outcome["steps"][1]


@pytest.mark.parametrize(
    "bad",
    [
        TextGenerationResult(text='{"category": "urgent"}'),
        TextGenerationResult(text="", structured_output={"category": "unknown"}),
        TextGenerationResult(
            text="", structured_output={"category": "urgent", "extra": 1}
        ),
        TextGenerationResult(text="", structured_output={"category": 1}),
        TextGenerationResult(
            text="",
            structured_output={"category": "urgent"},
            tool_calls=(ToolCall(id="1", name="do_it", arguments={}),),
        ),
    ],
)
async def test_malformed_classification_fails_closed_and_stops(bad: object) -> None:
    provider = ScriptedProvider(bad)
    outcome = await run_ai_steps(parse_workflow(WORKFLOW), CONTEXT, provider)

    assert outcome["provider_calls"] == 1
    assert outcome["completed"] is False
    assert [step["status"] for step in outcome["steps"]] == [
        "failed",
        "skipped",
        "skipped",
    ]
    assert outcome["steps"][0]["error"] == ERROR_INVALID_OUTPUT
    assert len(provider.requests) == 1


async def test_provider_error_is_reported_by_safe_code_without_retry() -> None:
    provider = ScriptedProvider(provider_error(ErrorCode.RATE_LIMITED))
    outcome = await run_ai_steps(parse_workflow(WORKFLOW), CONTEXT, provider)

    assert outcome["steps"][0]["error"] == ErrorCode.RATE_LIMITED.value
    assert outcome["steps"][0]["status"] == "failed"
    assert len(provider.requests) == 1
    assert outcome["actions_executed"] == 0


async def test_timeout_is_bounded_per_step() -> None:
    async def hang() -> TextGenerationResult:
        await asyncio.sleep(10)
        return classification("urgent")

    provider = ScriptedProvider(hang)
    outcome = await run_ai_steps(
        parse_workflow(WORKFLOW), CONTEXT, provider, timeout_seconds=0.01
    )

    assert outcome["steps"][0] == {
        "index": 0,
        "step_id": "classify",
        "kind": "ai_classify",
        "executed": False,
        "status": "failed",
        "error": ERROR_TIMEOUT,
    }
    assert outcome["completed"] is False


async def test_rejects_unparsed_inputs() -> None:
    with pytest.raises(WorkflowStepError):
        await run_ai_steps(WORKFLOW, CONTEXT, ScriptedProvider())  # type: ignore[arg-type]
