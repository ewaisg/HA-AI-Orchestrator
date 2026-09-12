"""Versioned workflow schema, validation, and migration.

This module owns the orchestrator's workflow document format under ADR-0002 and
ADR-0005. It is deliberately closed: unknown keys, unknown step or trigger
kinds, and out-of-range values are rejected rather than coerced, so a malformed
or hostile stored document cannot widen what the runtime will later execute.

Nothing here performs I/O, contacts a provider, or calls a Home Assistant
action. Validation is pure so it can be exercised without a running instance.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Final

WORKFLOW_SCHEMA_VERSION: Final = 1

MAX_WORKFLOW_NAME_CHARS: Final = 128
MAX_WORKFLOW_DESCRIPTION_CHARS: Final = 512
MAX_STEPS_PER_WORKFLOW: Final = 25
MAX_TRIGGERS_PER_WORKFLOW: Final = 10
MAX_CONDITIONS_PER_WORKFLOW: Final = 20
MAX_PROMPT_CHARS: Final = 4000
MAX_ENTITY_IDS_PER_TRIGGER: Final = 50

_WORKFLOW_ID_PATTERN: Final = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)
_STEP_ID_PATTERN: Final = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_ENTITY_ID_PATTERN: Final = re.compile(r"^[a-z_][a-z0-9_]*\.[a-z0-9_]+$")


class WorkflowValidationError(ValueError):
    """Raised when a workflow document violates the closed schema.

    The message is safe to show an administrator: it names the offending field
    but never echoes a stored credential or unbounded caller-supplied content.
    """


class TriggerKind(StrEnum):
    """Deterministic trigger kinds supported by the v1 schema.

    This set is intentionally small. ADR-0002 requires each trigger to be
    proven across reload, restart, and duplicate registration before it is
    published, so kinds are added only with matching evidence.
    """

    STATE = "state"
    TIME = "time"
    MANUAL = "manual"


class ConditionKind(StrEnum):
    """Deterministic condition kinds evaluated before any inference."""

    STATE = "state"
    TIME_WINDOW = "time_window"
    NUMERIC_STATE = "numeric_state"


class StepKind(StrEnum):
    """Bounded step kinds.

    AI appears only as a constrained `ai_compose` or `ai_classify` step. There
    is deliberately no generic action executor and no free-form tool step; see
    ADR-0004 and the safety boundaries in AGENTS.md.
    """

    AI_COMPOSE = "ai_compose"
    AI_CLASSIFY = "ai_classify"
    NOTIFY = "notify"


@dataclass(frozen=True, slots=True)
class WorkflowTrigger:
    """One deterministic trigger."""

    kind: TriggerKind
    entity_ids: tuple[str, ...] = ()
    to_state: str | None = None
    at_time: str | None = None

    def as_dict(self) -> dict[str, Any]:
        """Return the exact serializable form."""
        data: dict[str, Any] = {"kind": self.kind.value}
        if self.entity_ids:
            data["entity_ids"] = list(self.entity_ids)
        if self.to_state is not None:
            data["to_state"] = self.to_state
        if self.at_time is not None:
            data["at_time"] = self.at_time
        return data


@dataclass(frozen=True, slots=True)
class WorkflowCondition:
    """One deterministic condition evaluated before inference."""

    kind: ConditionKind
    entity_id: str | None = None
    state: str | None = None
    above: float | None = None
    below: float | None = None
    after_time: str | None = None
    before_time: str | None = None

    def as_dict(self) -> dict[str, Any]:
        """Return the exact serializable form."""
        data: dict[str, Any] = {"kind": self.kind.value}
        for key in (
            "entity_id",
            "state",
            "above",
            "below",
            "after_time",
            "before_time",
        ):
            value = getattr(self, key)
            if value is not None:
                data[key] = value
        return data


@dataclass(frozen=True, slots=True)
class WorkflowStep:
    """One bounded step."""

    step_id: str
    kind: StepKind
    prompt: str | None = None
    categories: tuple[str, ...] = ()
    notify_service: str | None = None

    def as_dict(self) -> dict[str, Any]:
        """Return the exact serializable form."""
        data: dict[str, Any] = {"step_id": self.step_id, "kind": self.kind.value}
        if self.prompt is not None:
            data["prompt"] = self.prompt
        if self.categories:
            data["categories"] = list(self.categories)
        if self.notify_service is not None:
            data["notify_service"] = self.notify_service
        return data


@dataclass(frozen=True, slots=True)
class Workflow:
    """One complete versioned workflow document.

    Missing enabled state defaults to disabled. Parsing preserves an explicit
    enabled state for storage round trips; future import and activation handlers
    must separately enforce administrator approval. Parsing never starts a run.
    """

    workflow_id: str
    name: str
    enabled: bool = False
    description: str = ""
    triggers: tuple[WorkflowTrigger, ...] = ()
    conditions: tuple[WorkflowCondition, ...] = ()
    steps: tuple[WorkflowStep, ...] = ()

    def as_dict(self) -> dict[str, Any]:
        """Return the exact serializable form stored and sent to the panel."""
        return {
            "schema_version": WORKFLOW_SCHEMA_VERSION,
            "workflow_id": self.workflow_id,
            "name": self.name,
            "description": self.description,
            "enabled": self.enabled,
            "triggers": [trigger.as_dict() for trigger in self.triggers],
            "conditions": [condition.as_dict() for condition in self.conditions],
            "steps": [step.as_dict() for step in self.steps],
        }


def _require_mapping(value: Any, field_name: str) -> dict[str, Any]:
    """Return a mapping or fail closed."""
    if not isinstance(value, dict):
        raise WorkflowValidationError(f"{field_name} must be an object")
    for key in value:
        if not isinstance(key, str):
            raise WorkflowValidationError(f"{field_name} keys must be strings")
    return value


def _reject_unknown_keys(
    data: dict[str, Any], allowed: frozenset[str], field_name: str
) -> None:
    """Fail closed on any key outside the closed schema."""
    if set(data) - allowed:
        raise WorkflowValidationError(f"{field_name} has unsupported fields")


def _require_bounded_str(
    value: Any, field_name: str, *, max_chars: int, allow_empty: bool = False
) -> str:
    """Return a length-bounded string or fail closed."""
    if not isinstance(value, str):
        raise WorkflowValidationError(f"{field_name} must be a string")
    if not allow_empty and not value.strip():
        raise WorkflowValidationError(f"{field_name} must not be empty")
    if len(value) > max_chars:
        raise WorkflowValidationError(
            f"{field_name} must be at most {max_chars} characters"
        )
    # JSON escapes can produce lone surrogates that no storage encoder accepts.
    try:
        value.encode("utf-8")
    except UnicodeEncodeError:
        raise WorkflowValidationError(f"{field_name} must be valid text") from None
    return value


def _require_bool(value: Any, field_name: str) -> bool:
    """Return an exact boolean; 0/1 and truthy values are rejected."""
    if value is not True and value is not False:
        raise WorkflowValidationError(f"{field_name} must be a boolean")
    return value


def _require_entity_id(value: Any, field_name: str) -> str:
    """Return a syntactically valid entity ID or fail closed.

    This validates shape only. It never asserts the entity exists, because the
    catalogue is the authority for that and a workflow may reference an entity
    that is temporarily unavailable.
    """
    entity_id = _require_bounded_str(value, field_name, max_chars=255)
    if not _ENTITY_ID_PATTERN.fullmatch(entity_id):
        raise WorkflowValidationError(f"{field_name} is not a valid entity ID")
    return entity_id


def _require_time_of_day(value: Any, field_name: str) -> str:
    """Return a strict 24-hour ``HH:MM`` string or fail closed."""
    text = _require_bounded_str(value, field_name, max_chars=5)
    if len(text) != 5 or text[2] != ":":
        raise WorkflowValidationError(f"{field_name} must use HH:MM")
    hours, minutes = text[:2], text[3:]
    if not (
        hours.isascii()
        and minutes.isascii()
        and hours.isdecimal()
        and minutes.isdecimal()
    ):
        raise WorkflowValidationError(f"{field_name} must use HH:MM")
    if not (0 <= int(hours) <= 23 and 0 <= int(minutes) <= 59):
        raise WorkflowValidationError(f"{field_name} is not a valid time of day")
    return text


def _require_finite_number(value: Any, field_name: str) -> float:
    """Return a finite number, rejecting booleans, NaN, and infinities."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise WorkflowValidationError(f"{field_name} must be a number")
    try:
        number = float(value)
    except OverflowError:
        raise WorkflowValidationError(f"{field_name} must be a finite number") from None
    if number != number or number in (float("inf"), float("-inf")):
        raise WorkflowValidationError(f"{field_name} must be a finite number")
    return number


def _require_list(value: Any, field_name: str, *, max_items: int) -> list[Any]:
    """Return a bounded list or fail closed."""
    if not isinstance(value, list):
        raise WorkflowValidationError(f"{field_name} must be a list")
    if len(value) > max_items:
        raise WorkflowValidationError(
            f"{field_name} must contain at most {max_items} items"
        )
    return value


_TRIGGER_KEYS = frozenset({"kind", "entity_ids", "to_state", "at_time"})
_CONDITION_KEYS = frozenset(
    {"kind", "entity_id", "state", "above", "below", "after_time", "before_time"}
)
_STEP_KEYS = frozenset({"step_id", "kind", "prompt", "categories", "notify_service"})
_WORKFLOW_KEYS = frozenset(
    {
        "schema_version",
        "workflow_id",
        "name",
        "description",
        "enabled",
        "triggers",
        "conditions",
        "steps",
    }
)


def parse_trigger(raw: Any) -> WorkflowTrigger:
    """Parse one trigger, requiring exactly the fields its kind needs."""
    data = _require_mapping(raw, "trigger")
    _reject_unknown_keys(data, _TRIGGER_KEYS, "trigger")
    try:
        kind = TriggerKind(data.get("kind"))
    except ValueError:
        raise WorkflowValidationError("trigger.kind is not supported") from None

    if kind is TriggerKind.STATE:
        raw_ids = _require_list(
            data.get("entity_ids"),
            "trigger.entity_ids",
            max_items=MAX_ENTITY_IDS_PER_TRIGGER,
        )
        if not raw_ids:
            raise WorkflowValidationError(
                "trigger.entity_ids must list at least one entity"
            )
        entity_ids = tuple(
            _require_entity_id(item, "trigger.entity_ids[]") for item in raw_ids
        )
        if len(set(entity_ids)) != len(entity_ids):
            raise WorkflowValidationError("trigger.entity_ids must be unique")
        to_state = data.get("to_state")
        if to_state is not None:
            to_state = _require_bounded_str(to_state, "trigger.to_state", max_chars=255)
        if "at_time" in data:
            raise WorkflowValidationError("state trigger does not accept at_time")
        return WorkflowTrigger(kind=kind, entity_ids=entity_ids, to_state=to_state)

    if kind is TriggerKind.TIME:
        if "entity_ids" in data or "to_state" in data:
            raise WorkflowValidationError("time trigger accepts only at_time")
        return WorkflowTrigger(
            kind=kind,
            at_time=_require_time_of_day(data.get("at_time"), "trigger.at_time"),
        )

    if set(data) != {"kind"}:
        raise WorkflowValidationError("manual trigger accepts no other field")
    return WorkflowTrigger(kind=kind)


def parse_condition(raw: Any) -> WorkflowCondition:
    """Parse one deterministic condition."""
    data = _require_mapping(raw, "condition")
    _reject_unknown_keys(data, _CONDITION_KEYS, "condition")
    try:
        kind = ConditionKind(data.get("kind"))
    except ValueError:
        raise WorkflowValidationError("condition.kind is not supported") from None

    allowed = {
        ConditionKind.STATE: frozenset({"kind", "entity_id", "state"}),
        ConditionKind.NUMERIC_STATE: frozenset({"kind", "entity_id", "above", "below"}),
        ConditionKind.TIME_WINDOW: frozenset({"kind", "after_time", "before_time"}),
    }
    _reject_unknown_keys(data, allowed[kind], "condition")

    if kind is ConditionKind.STATE:
        return WorkflowCondition(
            kind=kind,
            entity_id=_require_entity_id(data.get("entity_id"), "condition.entity_id"),
            state=_require_bounded_str(
                data.get("state"), "condition.state", max_chars=255
            ),
        )

    if kind is ConditionKind.NUMERIC_STATE:
        entity_id = _require_entity_id(data.get("entity_id"), "condition.entity_id")
        above = data.get("above")
        below = data.get("below")
        if above is None and below is None:
            raise WorkflowValidationError(
                "numeric_state condition requires above or below"
            )
        above_value = (
            None if above is None else _require_finite_number(above, "condition.above")
        )
        below_value = (
            None if below is None else _require_finite_number(below, "condition.below")
        )
        if (
            above_value is not None
            and below_value is not None
            and above_value >= below_value
        ):
            raise WorkflowValidationError(
                "condition.above must be less than condition.below"
            )
        return WorkflowCondition(
            kind=kind, entity_id=entity_id, above=above_value, below=below_value
        )

    after_time = _require_time_of_day(data.get("after_time"), "condition.after_time")
    before_time = _require_time_of_day(data.get("before_time"), "condition.before_time")
    if after_time == before_time:
        raise WorkflowValidationError(
            "condition.after_time and condition.before_time must differ"
        )
    return WorkflowCondition(kind=kind, after_time=after_time, before_time=before_time)


def parse_step(raw: Any) -> WorkflowStep:
    """Parse one bounded step."""
    data = _require_mapping(raw, "step")
    _reject_unknown_keys(data, _STEP_KEYS, "step")
    step_id = _require_bounded_str(data.get("step_id"), "step.step_id", max_chars=64)
    if not _STEP_ID_PATTERN.fullmatch(step_id):
        raise WorkflowValidationError("step.step_id must be a lowercase identifier")
    try:
        kind = StepKind(data.get("kind"))
    except ValueError:
        raise WorkflowValidationError("step.kind is not supported") from None

    allowed = {
        StepKind.AI_COMPOSE: frozenset({"step_id", "kind", "prompt"}),
        StepKind.AI_CLASSIFY: frozenset({"step_id", "kind", "prompt", "categories"}),
        StepKind.NOTIFY: frozenset({"step_id", "kind", "notify_service"}),
    }
    _reject_unknown_keys(data, allowed[kind], "step")

    if kind is StepKind.AI_COMPOSE:
        if "categories" in data:
            raise WorkflowValidationError("ai_compose step does not accept categories")
        return WorkflowStep(
            step_id=step_id,
            kind=kind,
            prompt=_require_bounded_str(
                data.get("prompt"), "step.prompt", max_chars=MAX_PROMPT_CHARS
            ),
        )

    if kind is StepKind.AI_CLASSIFY:
        raw_categories = _require_list(
            data.get("categories"), "step.categories", max_items=20
        )
        if len(raw_categories) < 2:
            raise WorkflowValidationError(
                "ai_classify step requires at least two categories"
            )
        categories = tuple(
            _require_bounded_str(item, "step.categories[]", max_chars=64)
            for item in raw_categories
        )
        if len(set(categories)) != len(categories):
            raise WorkflowValidationError("step.categories must be unique")
        return WorkflowStep(
            step_id=step_id,
            kind=kind,
            prompt=_require_bounded_str(
                data.get("prompt"), "step.prompt", max_chars=MAX_PROMPT_CHARS
            ),
            categories=categories,
        )

    if "prompt" in data or "categories" in data:
        raise WorkflowValidationError("notify step accepts only notify_service")
    service = _require_bounded_str(
        data.get("notify_service"), "step.notify_service", max_chars=255
    )
    if not _ENTITY_ID_PATTERN.fullmatch(service) or not service.startswith("notify."):
        raise WorkflowValidationError(
            "step.notify_service must be a notify service reference"
        )
    return WorkflowStep(step_id=step_id, kind=kind, notify_service=service)


def parse_workflow(raw: Any) -> Workflow:
    """Parse and validate one complete workflow document.

    Every failure mode raises `WorkflowValidationError`; nothing is coerced or
    silently dropped, so a stored document can never gain capability by being
    malformed.
    """
    data = _require_mapping(raw, "workflow")
    _reject_unknown_keys(data, _WORKFLOW_KEYS, "workflow")

    version = data.get("schema_version")
    if type(version) is not int or version != WORKFLOW_SCHEMA_VERSION:
        raise WorkflowValidationError(
            f"workflow.schema_version must be {WORKFLOW_SCHEMA_VERSION}"
        )

    workflow_id = _require_bounded_str(
        data.get("workflow_id"), "workflow.workflow_id", max_chars=36
    )
    if not _WORKFLOW_ID_PATTERN.fullmatch(workflow_id):
        raise WorkflowValidationError("workflow.workflow_id must be a UUID4")

    name = _require_bounded_str(
        data.get("name"), "workflow.name", max_chars=MAX_WORKFLOW_NAME_CHARS
    )
    description = _require_bounded_str(
        data.get("description", ""),
        "workflow.description",
        max_chars=MAX_WORKFLOW_DESCRIPTION_CHARS,
        allow_empty=True,
    )
    enabled = _require_bool(data.get("enabled", False), "workflow.enabled")

    triggers = tuple(
        parse_trigger(item)
        for item in _require_list(
            data.get("triggers", []),
            "workflow.triggers",
            max_items=MAX_TRIGGERS_PER_WORKFLOW,
        )
    )
    conditions = tuple(
        parse_condition(item)
        for item in _require_list(
            data.get("conditions", []),
            "workflow.conditions",
            max_items=MAX_CONDITIONS_PER_WORKFLOW,
        )
    )
    steps = tuple(
        parse_step(item)
        for item in _require_list(
            data.get("steps", []), "workflow.steps", max_items=MAX_STEPS_PER_WORKFLOW
        )
    )

    step_ids = [step.step_id for step in steps]
    if len(set(step_ids)) != len(step_ids):
        raise WorkflowValidationError("workflow.steps must have unique step_id values")

    # An enabled workflow must be able to start and to do something, otherwise
    # it would be silently inert while presenting as active.
    if enabled and not triggers:
        raise WorkflowValidationError("an enabled workflow requires a trigger")
    if enabled and not steps:
        raise WorkflowValidationError("an enabled workflow requires a step")

    return Workflow(
        workflow_id=workflow_id,
        name=name,
        description=description,
        enabled=enabled,
        triggers=triggers,
        conditions=conditions,
        steps=steps,
    )


def migrate_workflow(raw: Any) -> dict[str, Any]:
    """Return a document upgraded to the current schema version.

    Only version 1 exists, so this validates and normalizes. It exists now so
    that a future version has one enforced entry point and stored documents are
    never read without passing through migration first.
    """
    data = _require_mapping(raw, "workflow")
    version = data.get("schema_version")
    if type(version) is int and version == WORKFLOW_SCHEMA_VERSION:
        return parse_workflow(data).as_dict()
    if type(version) is int and version > WORKFLOW_SCHEMA_VERSION:
        raise WorkflowValidationError(
            "workflow was written by a newer version and cannot be downgraded"
        )
    raise WorkflowValidationError("workflow.schema_version is not supported")
