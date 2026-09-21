"""The bounded transport dialect supplements, never replaces, workflow parsing."""

import copy

import pytest

from custom_components.ai_orchestrator.providers.contract import validate_schema_value
from custom_components.ai_orchestrator.workflow_draft_schema import draft_output_schema

ENTITY = "binary_sensor.synthetic"
TARGET = "notify.synthetic"
DRAFT = {
    "name": "Synthetic",
    "description": "",
    "triggers": [{"kind": "state", "entity_ids": [ENTITY], "to_state": "on"}],
    "conditions": [],
    "steps": [
        {"step_id": "compose", "kind": "ai_compose", "prompt": "Synthetic"},
        {"step_id": "send", "kind": "notify", "notify_service": TARGET},
    ],
}


def test_known_dialect_accepts_selected_draft_and_empty_selection_manual():
    validate_schema_value(draft_output_schema([ENTITY], [TARGET]).schema, DRAFT)
    manual = {**DRAFT, "triggers": [{"kind": "manual"}], "steps": DRAFT["steps"][:1]}
    validate_schema_value(draft_output_schema([], []).schema, manual)


@pytest.mark.parametrize(
    "change",
    [
        {"enabled": True},
        {"triggers": [{"kind": "state", "entity_ids": ["sensor.unselected"]}]},
        {
            "conditions": [
                {"kind": "state", "entity_id": "sensor.unselected", "state": "on"}
            ]
        },
        {
            "steps": [
                {
                    "step_id": "send",
                    "kind": "notify",
                    "notify_service": "notify.unselected",
                }
            ]
        },
        {"steps": [{"step_id": "run", "kind": "call_service"}]},
        {
            "steps": [
                {"step_id": "run", "kind": "ai_compose", "service": "light.turn_on"}
            ]
        },
        {"description": None},
    ],
)
def test_closed_transport_rejects_expanded_authority(change):
    with pytest.raises(ValueError):
        validate_schema_value(
            draft_output_schema([ENTITY], [TARGET]).schema, {**DRAFT, **change}
        )


@pytest.mark.parametrize("entities,targets", [([], [TARGET]), ([ENTITY], []), ([], [])])
def test_absent_selection_cannot_gain_entity_or_notify_kind(entities, targets):
    with pytest.raises(ValueError):
        validate_schema_value(draft_output_schema(entities, targets).schema, DRAFT)


def test_schema_detaches_selection_and_does_not_mutate_callers():
    entities, targets = [ENTITY], [TARGET]
    before = copy.deepcopy(DRAFT)
    schema = draft_output_schema(entities, targets).schema
    entities.append("sensor.unselected")
    targets.append("notify.unselected")
    validate_schema_value(schema, DRAFT)
    assert DRAFT == before
    with pytest.raises(ValueError):
        validate_schema_value(
            schema,
            {**DRAFT, "triggers": [{"kind": "state", "entity_ids": entities}]},
        )
