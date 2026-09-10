"""Pure offline evaluation of draft triggers and conditions, never execution.

All clock, event and state inputs are supplied by the caller. The returned trace
contains static reasons and step kinds only, with no household context or prompt.
"""

from __future__ import annotations

import math
import re
from typing import Any

from .workflow_schema import (
    ConditionKind,
    TriggerKind,
    WorkflowCondition,
    WorkflowTrigger,
    WorkflowValidationError,
    parse_workflow,
)

_ENTITY_ID = re.compile(r"[a-z_][a-z0-9_]*\.[a-z0-9_]+")
_TIME = re.compile(r"(?:[01][0-9]|2[0-3]):[0-5][0-9]")


def _entity_id(value: Any) -> bool:
    return (
        isinstance(value, str)
        and len(value) <= 255
        and _ENTITY_ID.fullmatch(value) is not None
    )


def _state(value: Any) -> bool:
    return isinstance(value, str) and len(value) <= 255


def _snapshot(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict) or set(raw) != {"states", "time", "event"}:
        raise WorkflowValidationError("snapshot requires states, time and event only")
    states = raw["states"]
    if not isinstance(states, dict) or len(states) > 500:
        raise WorkflowValidationError(
            "snapshot.states must be an object of at most 500 states"
        )
    if any(not _entity_id(key) or not _state(value) for key, value in states.items()):
        raise WorkflowValidationError(
            "snapshot.states requires valid entity IDs and bounded strings"
        )
    if not isinstance(raw["time"], str) or _TIME.fullmatch(raw["time"]) is None:
        raise WorkflowValidationError("snapshot.time must use ASCII HH:MM")
    event = raw["event"]
    if not isinstance(event, dict):
        raise WorkflowValidationError("snapshot.event must be an object")
    kind = event.get("kind")
    if kind in ("manual", "time"):
        if set(event) != {"kind"}:
            raise WorkflowValidationError("snapshot.event has unsupported fields")
    elif kind == "state":
        if set(event) != {"kind", "entity_id", "from_state", "to_state"}:
            raise WorkflowValidationError(
                "snapshot state event requires entity and transition only"
            )
        if not _entity_id(event["entity_id"]):
            raise WorkflowValidationError("snapshot.event.entity_id must be valid")
        if not _state(event["from_state"]) or not _state(event["to_state"]):
            raise WorkflowValidationError(
                "snapshot event states must be bounded strings"
            )
    else:
        raise WorkflowValidationError("snapshot.event.kind is not supported")
    return raw


def _trigger(trigger: WorkflowTrigger, snapshot: dict[str, Any]) -> tuple[bool, str]:
    event = snapshot["event"]
    if event["kind"] != trigger.kind.value:
        return False, "event_kind_mismatch"
    if trigger.kind is TriggerKind.STATE:
        if event["from_state"] == event["to_state"]:
            return False, "state_unchanged"
        if event["entity_id"] not in trigger.entity_ids:
            return False, "entity_not_selected"
        if trigger.to_state is not None and event["to_state"] != trigger.to_state:
            return False, "target_state_mismatch"
    elif trigger.kind is TriggerKind.TIME and snapshot["time"] != trigger.at_time:
        return False, "time_mismatch"
    return True, "matched"


def _condition(
    condition: WorkflowCondition, snapshot: dict[str, Any]
) -> tuple[bool, str]:
    if condition.kind is ConditionKind.TIME_WINDOW:
        start, end = condition.after_time, condition.before_time
        now = snapshot["time"]
        passed = start <= now < end if start < end else now >= start or now < end
        return passed, "matched" if passed else "outside_time_window"
    state = snapshot["states"].get(condition.entity_id)
    if state is None or state in ("unknown", "unavailable"):
        return False, "state_unavailable"
    if condition.kind is ConditionKind.STATE:
        passed = state == condition.state
        return passed, "matched" if passed else "state_mismatch"
    try:
        number = float(state)
    except ValueError:
        return False, "state_not_numeric"
    if not math.isfinite(number):
        return False, "state_not_numeric"
    passed = (condition.above is None or number > condition.above) and (
        condition.below is None or number < condition.below
    )
    return passed, "matched" if passed else "outside_numeric_bounds"


def preview_workflow(workflow_raw: Any, snapshot_raw: Any) -> dict[str, Any]:
    """Return a redacted deterministic preview from a validated synthetic snapshot.

    Triggers combine with OR, conditions with AND. Disabled drafts can be
    previewed; eligibility describes the supplied scenario, never activation or
    permission. All steps remain unexecuted, even when the scenario is eligible.
    Invalid inputs raise WorkflowValidationError with static, redacted messages.
    """
    workflow = parse_workflow(workflow_raw)
    snapshot = _snapshot(snapshot_raw)
    trigger_results = []
    for index, trigger in enumerate(workflow.triggers):
        passed, reason = _trigger(trigger, snapshot)
        trigger_results.append({"index": index, "passed": passed, "reason": reason})
    condition_results = []
    for index, condition in enumerate(workflow.conditions):
        passed, reason = _condition(condition, snapshot)
        condition_results.append({"index": index, "passed": passed, "reason": reason})
    triggered = any(result["passed"] for result in trigger_results)
    conditions_passed = all(result["passed"] for result in condition_results)
    eligible = triggered and conditions_passed and bool(workflow.steps)
    return {
        "mode": "offline",
        "enabled": workflow.enabled,
        "triggered": triggered,
        "conditions_passed": conditions_passed,
        "eligible": eligible,
        "trigger_results": trigger_results,
        "condition_results": condition_results,
        "planned_steps": [
            {"index": index, "kind": step.kind.value}
            for index, step in enumerate(workflow.steps)
        ]
        if eligible
        else [],
        "provider_calls": 0,
        "actions_executed": 0,
    }
