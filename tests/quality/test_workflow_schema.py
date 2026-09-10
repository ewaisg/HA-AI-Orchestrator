"""Pure schema contract tests; fixtures are synthetic, never live HA identifiers."""

from __future__ import annotations

import importlib.util
import sys
from copy import deepcopy
from pathlib import Path

import pytest

MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "custom_components/ai_orchestrator/workflow_schema.py"
)
SPEC = importlib.util.spec_from_file_location("workflow_schema_contract", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
schema = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = schema
SPEC.loader.exec_module(schema)

TRIGGERS = [
    {"kind": "manual"},
    {"kind": "state", "entity_ids": ["sensor.synthetic"], "to_state": "on"},
    {"kind": "time", "at_time": "23:59"},
]
CONDITIONS = [
    {"kind": "state", "entity_id": "sensor.synthetic", "state": "on"},
    {"kind": "numeric_state", "entity_id": "sensor.synthetic", "above": 1, "below": 2},
    {"kind": "time_window", "after_time": "22:00", "before_time": "06:00"},
]
STEPS = [
    {"kind": "ai_compose", "step_id": "compose", "prompt": "Summarize this fixture."},
    {
        "kind": "ai_classify",
        "step_id": "classify",
        "prompt": "Classify this fixture.",
        "categories": ["low", "high"],
    },
    {"kind": "notify", "step_id": "notify", "notify_service": "notify.synthetic"},
]


@pytest.fixture
def document():
    return {
        "schema_version": 1,
        "workflow_id": "12345678-1234-4123-8123-123456789abc",
        "name": "Synthetic workflow",
    }


@pytest.mark.parametrize(
    ("parser", "records"),
    [
        (schema.parse_trigger, TRIGGERS),
        (schema.parse_condition, CONDITIONS),
        (schema.parse_step, STEPS),
    ],
)
def test_every_supported_kind_roundtrips(parser, records):
    for record in records:
        assert parser(record).as_dict() == record
        assert parser(parser(record).as_dict()) == parser(record)


def test_migration_normalizes_without_mutation_and_is_idempotent(document):
    original = deepcopy(document)
    normalized = schema.migrate_workflow(document)
    assert document == original
    assert normalized["enabled"] is False
    assert normalized["description"] == ""
    assert (
        normalized["triggers"] == normalized["conditions"] == normalized["steps"] == []
    )
    assert schema.migrate_workflow(normalized) == normalized
    assert normalized is not document


def test_enabled_complete_workflow_roundtrips(document):
    document.update(enabled=True, triggers=TRIGGERS, conditions=CONDITIONS, steps=STEPS)
    normalized = schema.parse_workflow(document).as_dict()
    assert normalized["enabled"] is True
    assert schema.migrate_workflow(normalized) == normalized


@pytest.mark.parametrize("version", [True, False, 1.0, "1", None, 0, -1, 2])
@pytest.mark.parametrize("parser", [schema.parse_workflow, schema.migrate_workflow])
def test_versions_are_exact_supported_integers(document, version, parser):
    document["schema_version"] = version
    with pytest.raises(schema.WorkflowValidationError):
        parser(document)


def test_future_migration_rejects_downgrade(document):
    document["schema_version"] = 2
    with pytest.raises(schema.WorkflowValidationError, match="newer"):
        schema.migrate_workflow(document)


@pytest.mark.parametrize(
    ("parser", "record", "extra"),
    [
        (schema.parse_trigger, TRIGGERS[0], "entity_ids"),
        (schema.parse_trigger, TRIGGERS[1], "at_time"),
        (schema.parse_trigger, TRIGGERS[2], "to_state"),
        (schema.parse_condition, CONDITIONS[0], "above"),
        (schema.parse_condition, CONDITIONS[1], "state"),
        (schema.parse_condition, CONDITIONS[2], "entity_id"),
        (schema.parse_step, STEPS[0], "notify_service"),
        (schema.parse_step, STEPS[0], "categories"),
        (schema.parse_step, STEPS[1], "notify_service"),
        (schema.parse_step, STEPS[2], "prompt"),
    ],
)
def test_wrong_kind_fields_are_rejected_even_when_null(parser, record, extra):
    with pytest.raises(schema.WorkflowValidationError):
        parser({**record, extra: None})


@pytest.mark.parametrize(
    ("parser", "record"),
    [
        (schema.parse_trigger, TRIGGERS[0]),
        (schema.parse_condition, CONDITIONS[0]),
        (schema.parse_step, STEPS[0]),
    ],
)
def test_unknown_keys_are_not_echoed(parser, record):
    secret = "synthetic-private-value-" * 500
    with pytest.raises(schema.WorkflowValidationError) as error:
        parser({**record, secret: secret})
    assert "synthetic-private-value" not in str(error.value)
    assert len(str(error.value)) < 200


def test_workflow_unknown_key_is_not_echoed(document):
    document["synthetic-private-key"] = "synthetic-private-value"
    with pytest.raises(schema.WorkflowValidationError) as error:
        schema.parse_workflow(document)
    assert "synthetic-private" not in str(error.value)


@pytest.mark.parametrize(
    "value", [True, "1", float("nan"), float("inf"), -float("inf"), 10**1000]
)
def test_numeric_failures_have_normalized_error(value):
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_condition({**CONDITIONS[1], "above": value})


@pytest.mark.parametrize("value", ["24:00", "12:60", "1:00", "١٢:٣٤", "²²:00"])
def test_time_is_ascii_and_in_range(value):
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_trigger({"kind": "time", "at_time": value})


@pytest.mark.parametrize(
    ("parser", "record", "field"),
    [
        (schema.parse_condition, CONDITIONS[0], "entity_id"),
        (schema.parse_step, STEPS[0], "step_id"),
        (schema.parse_step, STEPS[2], "notify_service"),
    ],
)
def test_identifiers_reject_trailing_newline(parser, record, field):
    with pytest.raises(schema.WorkflowValidationError):
        parser({**record, field: record[field] + "\n"})


@pytest.mark.parametrize(
    "service", ["lock.unlock", "homeassistant.turn_off", "script.synthetic"]
)
def test_notification_namespace_is_closed(service):
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_step({**STEPS[2], "notify_service": service})


@pytest.mark.parametrize("field", ["triggers", "conditions", "steps"])
def test_collection_limits_accept_boundary_reject_overflow(document, field):
    records, limit = {
        "triggers": (TRIGGERS, schema.MAX_TRIGGERS_PER_WORKFLOW),
        "conditions": (CONDITIONS, schema.MAX_CONDITIONS_PER_WORKFLOW),
        "steps": (STEPS, schema.MAX_STEPS_PER_WORKFLOW),
    }[field]
    values = [dict(records[0]) for _ in range(limit + 1)]
    if field == "steps":
        for index, value in enumerate(values):
            value["step_id"] = f"step_{index}"
    document[field] = values[:limit]
    assert len(getattr(schema.parse_workflow(document), field)) == limit
    document[field] = values
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_workflow(document)


@pytest.mark.parametrize("field", ["triggers", "steps"])
def test_enabled_workflow_requires_trigger_and_step(document, field):
    document.update(enabled=True, triggers=[TRIGGERS[0]], steps=[STEPS[0]])
    document[field] = []
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_workflow(document)


@pytest.mark.parametrize("value", [0, 1, "true", None, []])
def test_enabled_is_exact_boolean(document, value):
    document["enabled"] = value
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_workflow(document)


def test_duplicate_step_ids_rejected(document):
    document["steps"] = [STEPS[0], {**STEPS[1], "step_id": STEPS[0]["step_id"]}]
    with pytest.raises(schema.WorkflowValidationError, match="unique"):
        schema.parse_workflow(document)


def test_duplicate_entity_references_rejected():
    with pytest.raises(schema.WorkflowValidationError, match="unique"):
        schema.parse_trigger(
            {**TRIGGERS[1], "entity_ids": ["sensor.fake", "sensor.fake"]}
        )


@pytest.mark.parametrize(
    "categories", [[], ["one"], ["one", "one"], [str(i) for i in range(21)]]
)
def test_classification_categories_are_bounded_and_unique(categories):
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_step({**STEPS[1], "categories": categories})


@pytest.mark.parametrize("field,limit", [("name", 128), ("description", 512)])
def test_workflow_text_limits(document, field, limit):
    document[field] = "x" * limit
    schema.parse_workflow(document)
    document[field] += "x"
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_workflow(document)


def test_prompt_limit():
    schema.parse_step({**STEPS[0], "prompt": "x" * 4000})
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_step({**STEPS[0], "prompt": "x" * 4001})
