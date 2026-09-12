"""Run mode and provider binding in the v1 workflow schema (WFL-004)."""

from __future__ import annotations

import pytest

from custom_components.ai_orchestrator import workflow_schema as schema

CONNECTION = "12345678-1234-4234-9234-123456789abc"
BASE = {
    "schema_version": 1,
    "workflow_id": "12345678-1234-4123-8123-123456789abc",
    "name": "Synthetic",
    "triggers": [{"kind": "manual"}],
    "steps": [{"step_id": "compose", "kind": "ai_compose", "prompt": "Write."}],
}


def test_defaults_are_observe_and_no_provider() -> None:
    workflow = schema.parse_workflow(BASE)
    assert workflow.run_mode == schema.RUN_MODE_OBSERVE
    assert workflow.provider_connection_id is None
    normalized = workflow.as_dict()
    assert normalized["run_mode"] == "observe"
    assert normalized["provider_connection_id"] is None
    assert schema.parse_workflow(normalized).as_dict() == normalized


def test_older_document_never_gains_execution_by_migration() -> None:
    migrated = schema.migrate_workflow(BASE)
    assert migrated["run_mode"] == "observe"
    assert migrated["provider_connection_id"] is None


def test_execute_with_ai_steps_requires_provider() -> None:
    with pytest.raises(schema.WorkflowValidationError, match="provider_connection_id"):
        schema.parse_workflow({**BASE, "run_mode": "execute"})
    workflow = schema.parse_workflow(
        {**BASE, "run_mode": "execute", "provider_connection_id": CONNECTION}
    )
    assert workflow.run_mode == schema.RUN_MODE_EXECUTE
    assert workflow.provider_connection_id == CONNECTION


def test_execute_with_only_notify_steps_needs_no_provider() -> None:
    workflow = schema.parse_workflow(
        {
            **BASE,
            "run_mode": "execute",
            "steps": [
                {"step_id": "n", "kind": "notify", "notify_service": "notify.synthetic"}
            ],
        }
    )
    assert workflow.provider_connection_id is None


@pytest.mark.parametrize(
    "overrides",
    [
        {"run_mode": "run"},
        {"run_mode": None},
        {"run_mode": 1},
        {"provider_connection_id": "not-a-uuid"},
        {"provider_connection_id": CONNECTION.upper()},
        {"provider_connection_id": 5},
    ],
)
def test_invalid_run_mode_or_provider_is_rejected(overrides: dict) -> None:
    with pytest.raises(schema.WorkflowValidationError):
        schema.parse_workflow({**BASE, **overrides})
