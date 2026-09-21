"""Synthetic metadata only: unknown fields and inconsistent claims fail closed."""

from copy import deepcopy

import pytest

from custom_components.ai_orchestrator.audit_schema import (
    AuditValidationError,
    parse_payload,
    parse_record,
    timestamp,
    transition,
)

ROW = {
    "sequence": 1,
    "audit_id": "12345678-1234-4234-9234-123456789abc",
    "parent_id": None,
    "kind": "action",
    "phase": "requested",
    "created_at": "2026-09-20T00:00:00+00:00",
    "updated_at": "2026-09-20T00:00:00+00:00",
    "operation": "light_turn_on_v1",
    "risk": "medium",
    "step_index": None,
    "provider_calls": 0,
    "actions_attempted": 0,
    "service_returns": 0,
    "error_code": None,
    "counts_final": False,
}


def test_transitions_exact_counts_and_terminal_immutability():
    row = transition(ROW, phase="authorized", now=ROW["created_at"])
    row = transition(row, phase="started", now=ROW["created_at"], actions_attempted=1)
    with pytest.raises(AuditValidationError):
        transition(
            row,
            phase="failed",
            now=ROW["created_at"],
            actions_attempted=1,
            error_code="provider_failed",
        )
    done = transition(
        row,
        phase="committed",
        now=ROW["created_at"],
        actions_attempted=1,
        service_returns=1,
    )
    assert done["counts_final"]
    with pytest.raises(AuditValidationError):
        transition(done, phase="requested", now=ROW["created_at"])


@pytest.mark.parametrize(
    "changes",
    [
        {"prompt": "private-canary"},
        {"entity_id": "light.private-canary"},
        {"sequence": True},
        {"audit_id": "private-canary"},
        {"audit_id": 1},
        {"parent_id": "bad"},
        {"parent_id": ROW["audit_id"]},
        {"operation": []},
        {"operation": "arbitrary-private-value"},
        {"phase": "success"},
        {"phase": []},
        {"step_index": -1},
        {"provider_calls": 65},
        {"service_returns": 1},
        {"counts_final": 1},
        {"kind": "custom"},
        {"risk": "critical"},
        {"error_code": []},
        {"error_code": "private-canary"},
        {"updated_at": "2026-09-19T00:00:00+00:00"},
        {"counts_final": True},
        {"provider_calls": 1},
        {"phase": "failed", "counts_final": True},
    ],
)
def test_closed_record_rejects_content_and_inconsistent_fields(changes):
    with pytest.raises(AuditValidationError) as caught:
        parse_record({**ROW, **changes})
    assert "private-canary" not in str(caught.value)


@pytest.mark.parametrize(
    "value",
    [
        None,
        "",
        "2026-09-20T00:00:00",
        "2026-09-20T00:00:00Z",
        "2026-09-20T00:00:00+01:00",
        "x" * 24,
    ],
)
def test_timestamp_requires_canonical_utc(value):
    with pytest.raises(AuditValidationError):
        timestamp(value)


@pytest.mark.parametrize(
    "raw",
    [
        None,
        {},
        {"schema_version": True, "next_sequence": 1, "records": []},
        {"schema_version": 2, "next_sequence": 1, "records": []},
        {"schema_version": 1, "next_sequence": 0, "records": []},
        {"schema_version": 1, "next_sequence": 1, "records": {}},
        {"schema_version": 1, "next_sequence": 1, "records": [ROW]},
        {"schema_version": 1, "next_sequence": 2, "records": [ROW, ROW]},
    ],
)
def test_payload_invalid(raw):
    with pytest.raises(AuditValidationError):
        parse_payload(raw)


def test_detached_parse_and_unknown_recovery_shape():
    raw = {"schema_version": 1, "next_sequence": 2, "records": [deepcopy(ROW)]}
    parsed = parse_payload(raw)
    parsed["records"].clear()
    assert len(raw["records"]) == 1
    unknown = transition(
        ROW, phase="unknown", now=ROW["created_at"], error_code="interrupted"
    )
    assert not unknown["counts_final"]


def test_backward_clock_and_counter_denied():
    with pytest.raises(AuditValidationError):
        transition(ROW, phase="authorized", now="2026-09-19T00:00:00+00:00")
    started = {**ROW, "phase": "started", "provider_calls": 1}
    with pytest.raises(AuditValidationError):
        transition(
            started, phase="unknown", now=ROW["created_at"], error_code="interrupted"
        )
