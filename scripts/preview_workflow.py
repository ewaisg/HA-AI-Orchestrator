"""Preview a workflow against explicit offline JSON inputs; never start HA."""

from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

MAX_INPUT_BYTES = 1_048_576


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    """Reject ambiguous duplicate JSON keys without echoing their contents."""
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def _reject_constant(_value: str) -> None:
    """Reject JSON extensions such as NaN and Infinity."""
    raise ValueError("noncanonical JSON number")


def _read_json(path: Path) -> Any:
    """Read a bounded UTF-8 input with strict JSON syntax."""
    with path.open("rb") as source:
        data = source.read(MAX_INPUT_BYTES + 1)
    if len(data) > MAX_INPUT_BYTES:
        raise ValueError("input too large")
    return json.loads(
        data.decode("utf-8"),
        object_pairs_hook=_unique_object,
        parse_constant=_reject_constant,
    )


def _engine() -> Any:
    """Load only pure modules without executing the HA integration entrypoint."""
    package_name = "_offline_workflow_preview"
    package = ModuleType(package_name)
    package.__path__ = [
        str(Path(__file__).resolve().parents[1] / "custom_components/ai_orchestrator")
    ]
    sys.modules[package_name] = package
    return importlib.import_module(f"{package_name}.workflow_preview")


def main() -> int:
    """Print a redacted offline outcome, or a static invalid-input error."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workflow", type=Path, required=True)
    parser.add_argument("--snapshot", type=Path, required=True)
    arguments = parser.parse_args()
    try:
        workflow = _read_json(arguments.workflow)
        snapshot = _read_json(arguments.snapshot)
        result = _engine().preview_workflow(workflow, snapshot)
    except OSError, ValueError, RecursionError:
        print(
            json.dumps({"mode": "offline", "error": "invalid_input"}),
            file=sys.stderr,
        )
        return 2
    print(json.dumps(result, indent=2, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
