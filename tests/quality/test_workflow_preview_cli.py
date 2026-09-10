"""Exercise the offline command with synthetic inputs and redacted failures."""

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "tests/fixtures/workflows"


def run_preview(snapshot: Path, workflow: Path | None = None):
    return subprocess.run(  # noqa: S603
        [
            sys.executable,
            "-S",
            str(ROOT / "scripts/preview_workflow.py"),
            "--workflow",
            str(workflow or FIXTURES / "window-preview.json"),
            "--snapshot",
            str(snapshot),
        ],
        capture_output=True,
        text=True,
        check=False,
        timeout=10,
    )


@pytest.mark.parametrize(
    ("filename", "eligible"),
    [("evening-open.json", True), ("daytime-open.json", False)],
)
def test_complete_synthetic_scenario(filename, eligible):
    process = run_preview(FIXTURES / filename)
    assert process.returncode == 0, process.stderr
    result = json.loads(process.stdout)
    assert result["eligible"] is eligible
    assert result["enabled"] is False
    assert result["mode"] == "offline"
    assert result["provider_calls"] == result["actions_executed"] == 0
    assert len(result["planned_steps"]) == (2 if eligible else 0)
    for sensitive in ("synthetic_window", "Write a short", "notify.synthetic"):
        assert sensitive not in process.stdout


@pytest.mark.parametrize(
    "payload",
    [
        b'{"sensitive-marker":',
        b'{"time":"20:00","time":"12:00"}',
        b'{"time":NaN}',
        b'{"time":Infinity}',
        b"\xff",
        b"[" * 2000 + b"]" * 2000,
        b" " * 1_048_577,
        b'{"sensitive-marker":"private-input"}',
    ],
    ids=[
        "syntax",
        "duplicate",
        "nan",
        "infinity",
        "encoding",
        "depth",
        "size",
        "schema",
    ],
)
def test_invalid_input_has_static_redacted_error(tmp_path, payload):
    snapshot = tmp_path / "private-filename.json"
    snapshot.write_bytes(payload)
    process = run_preview(snapshot)
    assert process.returncode == 2
    assert process.stdout == ""
    assert json.loads(process.stderr) == {"mode": "offline", "error": "invalid_input"}


def test_missing_file_has_static_error(tmp_path):
    process = run_preview(tmp_path / "private-missing.json")
    assert process.returncode == 2
    assert json.loads(process.stderr) == {"mode": "offline", "error": "invalid_input"}


def test_invalid_workflow_is_rejected_before_preview(tmp_path):
    workflow = tmp_path / "workflow.json"
    workflow.write_text('{"schema_version":2}', encoding="utf-8")
    process = run_preview(FIXTURES / "evening-open.json", workflow)
    assert process.returncode == 2
    assert process.stdout == ""
