"""Offline evaluator contracts with exclusively synthetic context."""

from __future__ import annotations

import ast
import importlib.util
import json
import sys
import types
from copy import deepcopy
from pathlib import Path

import pytest

MODULE_DIR = Path(__file__).resolve().parents[2] / "custom_components/ai_orchestrator"
PACKAGE = "workflow_preview_contract"
package = types.ModuleType(PACKAGE)
package.__path__ = [str(MODULE_DIR)]
sys.modules[PACKAGE] = package
for name in ("workflow_schema", "workflow_preview"):
    spec = importlib.util.spec_from_file_location(
        f"{PACKAGE}.{name}", MODULE_DIR / f"{name}.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
preview = module.preview_workflow
ValidationError = module.WorkflowValidationError


@pytest.fixture
def workflow():
    return {
        "schema_version": 1,
        "workflow_id": "12345678-1234-4123-8123-123456789abc",
        "name": "Synthetic private name",
        "triggers": [{"kind": "manual"}],
        "steps": [
            {
                "kind": "ai_compose",
                "step_id": "compose",
                "prompt": "Private synthetic prompt",
            },
            {
                "kind": "ai_classify",
                "step_id": "classify",
                "prompt": "Classify fixture",
                "categories": ["low", "high"],
            },
            {
                "kind": "notify",
                "step_id": "deliver",
                "notify_service": "notify.synthetic",
            },
        ],
    }


@pytest.fixture
def snapshot():
    return {
        "states": {"sensor.synthetic": "on"},
        "time": "12:00",
        "event": {"kind": "manual"},
    }


def test_draft_preview_is_redacted_repeatable_and_does_not_mutate(workflow, snapshot):
    original = deepcopy((workflow, snapshot))
    result = preview(workflow, snapshot)
    assert result == preview(workflow, snapshot)
    assert (workflow, snapshot) == original
    assert result == {
        "mode": "offline",
        "enabled": False,
        "triggered": True,
        "conditions_passed": True,
        "eligible": True,
        "trigger_results": [{"index": 0, "passed": True, "reason": "matched"}],
        "condition_results": [],
        "planned_steps": [
            {"index": 0, "kind": "ai_compose"},
            {"index": 1, "kind": "ai_classify"},
            {"index": 2, "kind": "notify"},
        ],
        "provider_calls": 0,
        "actions_executed": 0,
    }
    serialized = json.dumps(result)
    for secret in (
        workflow["name"],
        workflow["workflow_id"],
        "sensor.synthetic",
        "notify.synthetic",
        "Private synthetic prompt",
    ):
        assert secret not in serialized
    workflow["enabled"] = True
    assert preview(workflow, snapshot)["enabled"] is True


@pytest.mark.parametrize("event", [{"kind": "manual"}, {"kind": "time"}])
def test_trigger_or_and_kind_matching(workflow, snapshot, event):
    workflow["triggers"] = [{"kind": "time", "at_time": "12:00"}, {"kind": "manual"}]
    snapshot["event"] = event
    result = preview(workflow, snapshot)
    assert result["triggered"] is True
    assert [item["passed"] for item in result["trigger_results"]] == [
        event["kind"] == "time",
        event["kind"] == "manual",
    ]


def test_time_trigger_uses_supplied_clock(workflow, snapshot):
    workflow["triggers"] = [{"kind": "time", "at_time": "12:01"}]
    snapshot["event"] = {"kind": "time"}
    assert (
        preview(workflow, snapshot)["trigger_results"][0]["reason"] == "time_mismatch"
    )


@pytest.mark.parametrize(
    ("entity", "before", "after", "target", "expected"),
    [
        ("sensor.synthetic", "off", "on", "on", "matched"),
        ("sensor.synthetic", "on", "on", "on", "state_unchanged"),
        ("sensor.other", "off", "on", "on", "entity_not_selected"),
        ("sensor.synthetic", "off", "idle", "on", "target_state_mismatch"),
        ("sensor.synthetic", "off", "idle", None, "matched"),
    ],
)
def test_state_transition(workflow, snapshot, entity, before, after, target, expected):
    workflow["triggers"] = [
        {"kind": "state", "entity_ids": ["sensor.synthetic"], "to_state": target}
    ]
    snapshot["event"] = {
        "kind": "state",
        "entity_id": entity,
        "from_state": before,
        "to_state": after,
    }
    result = preview(workflow, snapshot)
    assert result["trigger_results"][0]["reason"] == expected
    assert result["eligible"] == (expected == "matched")


@pytest.mark.parametrize("state", [None, "unknown", "unavailable", "ON", "off"])
def test_state_condition_fails_closed(workflow, snapshot, state):
    workflow["conditions"] = [
        {"kind": "state", "entity_id": "sensor.synthetic", "state": "on"}
    ]
    snapshot["states"] = {} if state is None else {"sensor.synthetic": state}
    result = preview(workflow, snapshot)
    assert result["conditions_passed"] is False
    assert result["eligible"] is False
    assert result["planned_steps"] == []


@pytest.mark.parametrize("state", ["unknown", "unavailable"])
def test_unavailable_never_matches_even_explicit_state(workflow, snapshot, state):
    workflow["conditions"] = [
        {"kind": "state", "entity_id": "sensor.synthetic", "state": state}
    ]
    snapshot["states"]["sensor.synthetic"] = state
    assert preview(workflow, snapshot)["conditions_passed"] is False


@pytest.mark.parametrize(
    ("state", "passed"),
    [
        ("1", False),
        ("2", False),
        ("1.5", True),
        ("nan", False),
        ("inf", False),
        ("-Infinity", False),
        ("1e999", False),
        ("bad", False),
        ("", False),
        ("unknown", False),
        ("unavailable", False),
    ],
)
def test_numeric_exclusive_finite_bounds(workflow, snapshot, state, passed):
    workflow["conditions"] = [
        {
            "kind": "numeric_state",
            "entity_id": "sensor.synthetic",
            "above": 1,
            "below": 2,
        }
    ]
    snapshot["states"]["sensor.synthetic"] = state
    assert preview(workflow, snapshot)["conditions_passed"] is passed


@pytest.mark.parametrize("bound", [{"above": 0}, {"below": 2}])
def test_numeric_one_sided(workflow, snapshot, bound):
    workflow["conditions"] = [
        {"kind": "numeric_state", "entity_id": "sensor.synthetic", **bound}
    ]
    snapshot["states"]["sensor.synthetic"] = "1"
    assert preview(workflow, snapshot)["eligible"] is True


@pytest.mark.parametrize(
    ("start", "end", "now", "passed"),
    [
        ("09:00", "17:00", "08:59", False),
        ("09:00", "17:00", "09:00", True),
        ("09:00", "17:00", "16:59", True),
        ("09:00", "17:00", "17:00", False),
        ("22:00", "06:00", "21:59", False),
        ("22:00", "06:00", "22:00", True),
        ("22:00", "06:00", "23:59", True),
        ("22:00", "06:00", "00:00", True),
        ("22:00", "06:00", "05:59", True),
        ("22:00", "06:00", "06:00", False),
    ],
)
def test_time_window_boundaries(workflow, snapshot, start, end, now, passed):
    workflow["conditions"] = [
        {"kind": "time_window", "after_time": start, "before_time": end}
    ]
    snapshot["time"] = now
    assert preview(workflow, snapshot)["conditions_passed"] is passed


def test_conditions_and_report_all_results(workflow, snapshot):
    workflow["conditions"] = [
        {"kind": "state", "entity_id": "sensor.synthetic", "state": "off"},
        {"kind": "state", "entity_id": "sensor.synthetic", "state": "on"},
    ]
    result = preview(workflow, snapshot)
    assert [item["passed"] for item in result["condition_results"]] == [False, True]
    assert result["eligible"] is False


@pytest.mark.parametrize("field", ["triggers", "steps"])
def test_incomplete_draft_ineligible(workflow, snapshot, field):
    workflow[field] = []
    assert preview(workflow, snapshot)["eligible"] is False


@pytest.mark.parametrize(
    "bad",
    [
        None,
        [],
        {},
        {
            "states": {},
            "time": "12:00",
            "event": {"kind": "manual"},
            "private-secret": True,
        },
    ],
)
def test_snapshot_shape_errors_are_static(workflow, bad):
    with pytest.raises(ValidationError) as exc:
        preview(workflow, bad)
    assert "private-secret" not in str(exc.value)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("states", []),
        ("states", {"sensor.synthetic": None}),
        ("states", {1: "on"}),
        ("states", {"private-secret": "on"}),
        ("states", {"sensor.synthetic": "x" * 256}),
        ("states", {"sensor." + "x" * 249: "on"}),
        ("states", {f"sensor.synthetic_{i}": "on" for i in range(501)}),
        ("time", None),
        ("time", "24:00"),
        ("time", "12:60"),
        ("time", "1:00"),
        ("time", "１２:００"),
        ("time", "12:00\n"),
        ("event", []),
        ("event", {"kind": []}),
        ("event", {"kind": "private-secret"}),
        ("event", {"kind": "manual", "private-secret": True}),
        ("event", {"kind": "state"}),
        (
            "event",
            {
                "kind": "state",
                "entity_id": "private-secret",
                "from_state": "off",
                "to_state": "on",
            },
        ),
        (
            "event",
            {
                "kind": "state",
                "entity_id": "sensor.synthetic",
                "from_state": None,
                "to_state": "on",
            },
        ),
        (
            "event",
            {
                "kind": "state",
                "entity_id": "sensor.synthetic",
                "from_state": "off",
                "to_state": "x" * 256,
            },
        ),
    ],
)
def test_snapshot_rejects_malformed_values_without_content(
    workflow, snapshot, field, value
):
    snapshot[field] = value
    with pytest.raises(ValidationError) as exc:
        preview(workflow, snapshot)
    assert "private-secret" not in str(exc.value)
    assert "x" * 20 not in str(exc.value)


def test_snapshot_inclusive_size_limits(workflow, snapshot):
    snapshot["states"] = {f"sensor.synthetic_{i}": "x" * 255 for i in range(499)}
    snapshot["states"]["sensor." + "x" * 248] = ""
    assert preview(workflow, snapshot)["eligible"] is True


def test_workflow_validation_is_not_bypassed(workflow, snapshot):
    workflow["steps"][0]["kind"] = "private-secret"
    with pytest.raises(ValidationError) as exc:
        preview(workflow, snapshot)
    assert "private-secret" not in str(exc.value)


def test_evaluator_import_boundary_has_no_io_dependencies():
    tree = ast.parse((MODULE_DIR / "workflow_preview.py").read_text(encoding="utf-8"))
    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            imports.add(node.module)
    assert imports == {"__future__", "math", "re", "typing", "workflow_schema"}
    forbidden = {"open", "exec", "eval", "compile", "__import__", "getattr"}
    assert not any(
        isinstance(node, ast.Name) and node.id in forbidden for node in ast.walk(tree)
    )
