"""Closed content-free audit metadata and one-way execution state transitions."""

from copy import deepcopy
from datetime import UTC, datetime
from uuid import UUID

RETENTION_DAYS = 90
MAX_RECORDS = 4096
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_SEQUENCE = 2**53 - 1
PENDING = frozenset({"requested", "authorized", "started"})
TERMINAL = frozenset({"committed", "failed", "unknown"})
OPERATIONS = {
    "switch_turn_on_v1": ("action", "high"),
    "switch_turn_off_v1": ("action", "high"),
    "light_turn_on_v1": ("action", "medium"),
    "light_turn_off_v1": ("action", "medium"),
    "media_play_v1": ("action", "medium"),
    "media_pause_v1": ("action", "medium"),
    "media_volume_v1": ("action", "medium"),
    "workflow_run": ("workflow", None),
    "notify": ("notification", None),
}
ERRORS = frozenset(
    {
        "not_authorized",
        "invalid_request",
        "provider_unavailable",
        "provider_failed",
        "invalid_output",
        "target_unavailable",
        "cancelled",
        "timeout",
        "dispatch_unknown",
        "interrupted",
        "storage_failure",
    }
)
KEYS = frozenset(
    {
        "sequence",
        "audit_id",
        "parent_id",
        "kind",
        "phase",
        "created_at",
        "updated_at",
        "operation",
        "risk",
        "step_index",
        "provider_calls",
        "actions_attempted",
        "service_returns",
        "error_code",
        "counts_final",
    }
)
TRANSITIONS = {
    "requested": frozenset({"authorized", "failed", "unknown"}),
    "authorized": frozenset({"started", "failed", "unknown"}),
    "started": frozenset({"committed", "failed", "unknown"}),
}


class AuditValidationError(ValueError):
    """Static audit validation error without untrusted values."""


def _integer(value: object, minimum: int, maximum: int) -> bool:
    return type(value) is int and minimum <= value <= maximum


def _identity(value: object) -> bool:
    try:
        return type(value) is str and str(UUID(value, version=4)) == value
    except ValueError:
        return False


def timestamp(value: object) -> datetime:
    """Parse only a canonical UTC ISO timestamp, with no freeform content."""
    try:
        if type(value) is not str or not 20 <= len(value) <= 32:
            raise ValueError
        parsed = datetime.fromisoformat(value)
        if parsed.utcoffset() != UTC.utcoffset(None) or parsed.isoformat() != value:
            raise ValueError
        return parsed
    except TypeError, ValueError:
        raise AuditValidationError("Invalid audit timestamp") from None


def parse_record(raw: object) -> dict:
    """Reject unknown keys, arbitrary content and inconsistent execution claims."""
    if type(raw) is not dict or set(raw) != KEYS:
        raise AuditValidationError("Invalid audit record")
    if (
        not _integer(raw["sequence"], 1, MAX_SEQUENCE)
        or not _identity(raw["audit_id"])
        or (raw["parent_id"] is not None and not _identity(raw["parent_id"]))
        or raw["parent_id"] == raw["audit_id"]
        or type(raw["operation"]) is not str
        or raw["operation"] not in OPERATIONS
        or type(raw["phase"]) is not str
        or raw["phase"] not in PENDING | TERMINAL
        or (raw["step_index"] is not None and not _integer(raw["step_index"], 0, 63))
        or any(
            not _integer(raw[key], 0, 64)
            for key in ("provider_calls", "actions_attempted", "service_returns")
        )
        or raw["service_returns"] > raw["actions_attempted"]
        or type(raw["counts_final"]) is not bool
    ):
        raise AuditValidationError("Invalid audit record")
    kind, risk = OPERATIONS[raw["operation"]]
    if (
        raw["kind"] != kind
        or raw["risk"] != risk
        or (
            raw["error_code"] is not None
            and (type(raw["error_code"]) is not str or raw["error_code"] not in ERRORS)
        )
        or timestamp(raw["updated_at"]) < timestamp(raw["created_at"])
    ):
        raise AuditValidationError("Invalid audit metadata")
    phase = raw["phase"]
    if (
        raw["counts_final"] != (phase in {"committed", "failed"})
        or (raw["error_code"] is not None) != (phase in {"failed", "unknown"})
        or (
            phase in {"requested", "authorized"}
            and (raw["actions_attempted"] != 0 or raw["provider_calls"] != 0)
        )
        or (
            phase in {"committed", "failed"}
            and raw["actions_attempted"] != raw["service_returns"]
        )
    ):
        raise AuditValidationError("Inconsistent audit outcome")
    return deepcopy(raw)


def parse_payload(raw: object) -> dict:
    """Validate an entire version-one collection without silent migrations."""
    if (
        type(raw) is not dict
        or set(raw) != {"schema_version", "next_sequence", "records"}
        or type(raw["schema_version"]) is not int
        or raw["schema_version"] != 1
        or not _integer(raw["next_sequence"], 1, MAX_SEQUENCE)
        or type(raw["records"]) is not list
        or len(raw["records"]) > MAX_RECORDS
    ):
        raise AuditValidationError("Invalid audit collection")
    rows = [parse_record(row) for row in raw["records"]]
    identities = [row["audit_id"] for row in rows]
    sequences = [row["sequence"] for row in rows]
    if (
        len(set(identities)) != len(identities)
        or len(set(sequences)) != len(sequences)
        or sequences != sorted(sequences)
        or any(sequence >= raw["next_sequence"] for sequence in sequences)
    ):
        raise AuditValidationError("Invalid audit ordering")
    return {"schema_version": 1, "next_sequence": raw["next_sequence"], "records": rows}


def transition(
    record: dict,
    *,
    phase: str,
    now: str,
    provider_calls: int = 0,
    actions_attempted: int = 0,
    service_returns: int = 0,
    error_code: str | None = None,
) -> dict:
    """Advance once using monotonic counters; terminal outcomes cannot reopen."""
    previous = parse_record(record)
    if type(phase) is not str or phase not in TRANSITIONS.get(previous["phase"], ()):
        raise AuditValidationError("Invalid audit transition")
    if timestamp(now) < timestamp(previous["updated_at"]):
        raise AuditValidationError("Audit clock moved backwards")
    counters = {
        "provider_calls": provider_calls,
        "actions_attempted": actions_attempted,
        "service_returns": service_returns,
    }
    if any(
        type(value) is not int or value < previous[key]
        for key, value in counters.items()
    ):
        raise AuditValidationError("Audit counters cannot decrease")
    return parse_record(
        {
            **previous,
            **counters,
            "phase": phase,
            "updated_at": now,
            "error_code": error_code,
            "counts_final": phase in {"committed", "failed"},
        }
    )
