"""Contract tests for committed evidence manifests."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / "docs" / "quality" / "schemas" / "evidence-manifest.schema.json"
EXAMPLE_PATH = (
    ROOT / "docs" / "quality" / "templates" / "evidence-manifest.example.json"
)


def _load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def schema() -> dict[str, object]:
    value = _load_json(SCHEMA_PATH)
    Draft202012Validator.check_schema(value)
    return value


@pytest.fixture(scope="module")
def validator(schema: dict[str, object]) -> Draft202012Validator:
    return Draft202012Validator(schema, format_checker=FormatChecker())


@pytest.fixture
def example() -> dict[str, object]:
    return _load_json(EXAMPLE_PATH)


def _make_passed(example: dict[str, object]) -> dict[str, object]:
    passed = deepcopy(example)
    passed["result"] = "passed"
    passed["source_revision"] = {
        "state": "committed",
        "git_commit": "1" * 40,
        "dirty": False,
    }
    passed["unknowns"] = []
    passed["reviews"] = [
        {
            "role": "test_release",
            "status": "approved",
            "reviewed_at": "2026-08-22T00:00:00Z",
        }
    ]
    return passed


def test_example_matches_schema(
    validator: Draft202012Validator, example: dict[str, object]
) -> None:
    validator.validate(example)


@pytest.mark.parametrize(
    ("path", "replacement"),
    [
        (("schema_version",), 2),
        (("environment", "data_mode"), "live_raw"),
        (("source_revision", "state"), "invented"),
    ],
)
def test_schema_rejects_unknown_or_unsafe_values(
    validator: Draft202012Validator,
    example: dict[str, object],
    path: tuple[str, ...],
    replacement: object,
) -> None:
    altered = deepcopy(example)
    target: dict[str, object] = altered
    for segment in path[:-1]:
        target = target[segment]  # type: ignore[assignment]
    target[path[-1]] = replacement

    with pytest.raises(ValidationError):
        validator.validate(altered)


def test_passed_manifest_requires_clean_committed_revision(
    validator: Draft202012Validator, example: dict[str, object]
) -> None:
    altered = deepcopy(example)
    altered["result"] = "passed"
    altered["unknowns"] = []

    with pytest.raises(ValidationError):
        validator.validate(altered)


def test_passed_manifest_requires_an_approval(
    validator: Draft202012Validator, example: dict[str, object]
) -> None:
    altered = deepcopy(example)
    altered["result"] = "passed"
    altered["source_revision"] = {
        "state": "committed",
        "git_commit": "1" * 40,
        "dirty": False,
    }
    altered["unknowns"] = []

    with pytest.raises(ValidationError):
        validator.validate(altered)

    altered["reviews"] = [
        {
            "role": "test_release",
            "status": "approved",
            "reviewed_at": "2026-08-22T00:00:00Z",
        }
    ]
    validator.validate(altered)


def test_passed_manifest_rejects_self_approval(
    validator: Draft202012Validator, example: dict[str, object]
) -> None:
    altered = _make_passed(example)
    altered["reviews"] = [
        {
            "role": "primary",
            "status": "approved",
            "reviewed_at": "2026-08-22T00:00:00Z",
        }
    ]

    with pytest.raises(ValidationError):
        validator.validate(altered)


def test_passed_manifest_rejects_blocking_unknowns(
    validator: Draft202012Validator, example: dict[str, object]
) -> None:
    altered = _make_passed(example)
    altered["unknowns"] = [{"id": "UNKNOWN_INPUT", "description": "Still unresolved."}]

    with pytest.raises(ValidationError):
        validator.validate(altered)


def test_check_result_and_exit_code_must_agree(
    validator: Draft202012Validator, example: dict[str, object]
) -> None:
    altered = deepcopy(example)
    altered["checks"][0]["exit_code"] = 1  # type: ignore[index]

    with pytest.raises(ValidationError):
        validator.validate(altered)


def test_repository_artifact_cannot_contain_live_data(
    validator: Draft202012Validator, example: dict[str, object]
) -> None:
    altered = deepcopy(example)
    altered["artifacts"] = [
        {
            "name": "unsafe-artifact",
            "location_type": "repository",
            "repository_path": "artifacts/unsafe.json",
            "sha256": "0" * 64,
            "classification": "live_redacted",
            "contains_live_data": True,
            "redaction_status": "reviewed",
        }
    ]

    with pytest.raises(ValidationError):
        validator.validate(altered)


@pytest.mark.parametrize(
    "repository_path",
    [
        "../private/evidence.json",
        "..\\private\\evidence.json",
        "/private/evidence.json",
        "C:\\private\\evidence.json",
    ],
)
def test_repository_artifact_path_must_be_normalized_and_relative(
    validator: Draft202012Validator,
    example: dict[str, object],
    repository_path: str,
) -> None:
    altered = deepcopy(example)
    altered["artifacts"] = [
        {
            "name": "synthetic-evidence",
            "location_type": "repository",
            "repository_path": repository_path,
            "sha256": "0" * 64,
            "classification": "synthetic",
            "contains_live_data": False,
            "redaction_status": "reviewed",
        }
    ]

    with pytest.raises(ValidationError):
        validator.validate(altered)


def test_schema_rejects_unrecognized_fields(
    validator: Draft202012Validator, example: dict[str, object]
) -> None:
    altered = deepcopy(example)
    altered["untracked_claim"] = "not allowed"

    with pytest.raises(ValidationError):
        validator.validate(altered)
