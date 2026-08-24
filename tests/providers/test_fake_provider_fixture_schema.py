"""Schema and semantic checks for deterministic fake-provider fixtures."""

# ruff: noqa: E402 -- the uninstalled custom integration needs the repo root.

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator, ValidationError

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from custom_components.ai_orchestrator.providers.fake import (
    FixtureValidationError,
    parse_fake_provider_fixture,
)

SCHEMA_PATH = (
    ROOT
    / "tests"
    / "fixtures"
    / "providers"
    / "schema"
    / "fake-provider-fixture.schema.json"
)
FIXTURE_DIR = ROOT / "tests" / "fixtures" / "providers" / "v1"
REQUIRED_CONTRACT_FIXTURES = {
    "capabilities.unknown",
    "error.authentication",
    "error.rate_limit_with_retry_hint",
    "error.timeout",
    "generate.empty_response",
    "generate.malformed_response",
    "generate.text_success",
    "generate.tool_call_success",
    "generate.tool_continuation_success",
    "health.healthy",
    "models.discovery_success",
    "request.cancelled",
    "stream.chunked_success",
    "validate.connection_success",
}
FORBIDDEN_FIXTURE_KEYS = {
    "account_id",
    "api_key",
    "authorization",
    "credential",
    "endpoint",
    "entity_id",
    "model",
    "region",
    "tenant_id",
}


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _fixture_paths() -> list[Path]:
    return sorted(FIXTURE_DIR.glob("*.json"))


def _all_keys(value: Any) -> set[str]:
    if isinstance(value, dict):
        return set(value) | set().union(*(_all_keys(item) for item in value.values()))
    if isinstance(value, list):
        return set().union(*(_all_keys(item) for item in value))
    return set()


def _semantic_errors(fixture: dict[str, Any]) -> list[str]:
    """Secondary readable oracle; runtime parsing is the canonical semantics."""

    errors: list[str] = []
    operation = fixture["operation"]
    steps = fixture["script"]["steps"]
    terminal = steps[-1]
    expected = fixture["expected"]

    if expected["request_count"] != 1:
        errors.append("Fixtures must describe exactly one provider request")

    for capability in fixture["required_capabilities"]:
        if fixture["capabilities"][capability] != "supported":
            errors.append(f"required capability {capability} is not supported")

    tools = fixture["request_match"]["tools"]
    if tools and fixture["capabilities"]["tool_calling"] != "supported":
        errors.append("fixtures exposing tools must support tool calling")
    if tools and fixture["capabilities"]["structured_output"] != "supported":
        errors.append("fixtures exposing tools must support structured output")

    terminal_type = terminal["type"]
    if operation == "validate_connection":
        if terminal_type not in {"return", "raise_normalized_error"}:
            errors.append("validate_connection has an invalid terminal event")
        if (
            terminal_type == "return"
            and terminal.get("result", {}).get("kind") != "connection_validation"
        ):
            errors.append("validate_connection must return connection_validation")
    elif operation == "discover_models":
        if terminal_type not in {"return", "raise_normalized_error"}:
            errors.append("discover_models has an invalid terminal event")
        if (
            terminal_type == "return"
            and terminal.get("result", {}).get("kind") != "model_catalog"
        ):
            errors.append("discover_models must return model_catalog")
    elif operation == "discover_capabilities":
        if terminal_type not in {"return", "raise_normalized_error"}:
            errors.append("discover_capabilities has an invalid terminal event")
        if (
            terminal_type == "return"
            and terminal.get("result", {}).get("kind") != "capability_record"
        ):
            errors.append("discover_capabilities must return capability_record")
    elif operation == "check_health":
        if terminal_type not in {"return", "raise_normalized_error"}:
            errors.append("check_health has an invalid terminal event")
        if (
            terminal_type == "return"
            and terminal.get("result", {}).get("kind") != "health"
        ):
            errors.append("check_health must return health")
    elif operation == "generate":
        allowed = {
            "return",
            "return_malformed",
            "raise_normalized_error",
            "await_cancellation",
        }
        if terminal_type not in allowed:
            errors.append("generate has an invalid terminal event")
        if terminal_type == "return" and terminal["result"]["kind"] != "message":
            errors.append("generate must return a message")
        if (
            terminal_type == "return"
            and fixture["capabilities"]["text_generation"] != "supported"
        ):
            errors.append("successful generate must support text generation")
    elif operation == "stream":
        if terminal_type not in {
            "complete_stream",
            "raise_normalized_error",
            "await_cancellation",
        }:
            errors.append("stream has an invalid terminal event")
        if any(step["type"] != "emit_delta" for step in steps[:-1]):
            errors.append("stream pre-terminal events must be emit_delta")
        if fixture["capabilities"]["text_generation"] != "supported":
            errors.append("stream must support text generation")

    if terminal_type == "return":
        if expected["outcome"] != "success":
            errors.append("return requires a success outcome")
        elif terminal["result"] != expected["normalized_result"]:
            errors.append("scripted and expected results differ")
    elif terminal_type == "return_malformed":
        if (
            expected["outcome"] != "error"
            or expected.get("normalized_error", {}).get("code") != "invalid_response"
        ):
            errors.append("malformed requires error and invalid_response")
    elif terminal_type == "raise_normalized_error":
        if expected["outcome"] != "error":
            errors.append("normalized error requires an error outcome")
        elif terminal["error"] != expected.get("normalized_error"):
            errors.append("scripted and expected errors differ")
    elif terminal_type == "await_cancellation":
        if (
            expected["outcome"] != "cancelled"
            or expected.get("normalized_error", {}).get("code") != "cancelled"
        ):
            errors.append("cancellation requires cancelled outcome and code")
    elif terminal_type == "complete_stream" and expected["outcome"] != "success":
        errors.append("complete stream requires a success outcome")

    if expected["outcome"] in {"error", "cancelled"}:
        if not expected.get("normalized_error", {}).get("message", "").strip():
            errors.append("normalized error message cannot be empty")

    return errors


@pytest.fixture(scope="module")
def schema() -> dict[str, Any]:
    value = _load_json(SCHEMA_PATH)
    Draft202012Validator.check_schema(value)
    return value


@pytest.fixture(scope="module")
def validator(schema: dict[str, Any]) -> Draft202012Validator:
    return Draft202012Validator(schema)


@pytest.fixture(scope="module")
def fixtures() -> list[tuple[Path, dict[str, Any]]]:
    return [(path, _load_json(path)) for path in _fixture_paths()]


def test_contract_fixture_catalogue_is_present(
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    fixture_ids = {fixture["fixture_id"] for _, fixture in fixtures}
    assert fixture_ids == REQUIRED_CONTRACT_FIXTURES


def test_all_fixtures_match_schema(
    validator: Draft202012Validator,
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    for path, fixture in fixtures:
        errors = sorted(
            validator.iter_errors(fixture), key=lambda error: list(error.path)
        )
        assert not errors, f"{path.name}: {errors}"


def test_all_fixtures_are_accepted_by_canonical_runtime_parser(
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    for path, fixture in fixtures:
        parsed = parse_fake_provider_fixture(fixture)
        assert parsed.fixture_id == path.stem


def test_fixture_ids_are_unique_and_match_filenames(
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    ids = [fixture["fixture_id"] for _, fixture in fixtures]
    assert len(ids) == len(set(ids))
    for path, fixture in fixtures:
        assert path.stem == fixture["fixture_id"]


def test_fixtures_are_synthetic_reviewed_and_manual_clocked(
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    for _, fixture in fixtures:
        assert fixture["provenance"] == {"type": "synthetic"}
        assert fixture["redaction"] == {
            "contains_live_data": False,
            "status": "reviewed",
        }
        assert fixture["script"]["clock"] == "manual"


def test_fixtures_contain_no_live_provider_or_household_fields(
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    for path, fixture in fixtures:
        assert not (FORBIDDEN_FIXTURE_KEYS & _all_keys(fixture)), path.name
        rendered = json.dumps(fixture, sort_keys=True).lower()
        assert "http://" not in rendered
        assert "https://" not in rendered
        assert "arn:" not in rendered


def test_script_sequences_are_contiguous(
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    for path, fixture in fixtures:
        sequence = [step["sequence"] for step in fixture["script"]["steps"]]
        assert sequence == list(range(len(sequence))), path.name


def test_script_and_expected_results_are_consistent(
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    for path, fixture in fixtures:
        assert not _semantic_errors(fixture), path.name
        steps = fixture["script"]["steps"]
        expected = fixture["expected"]
        terminal = steps[-1]

        if terminal["type"] == "return":
            assert expected["outcome"] == "success", path.name
            assert terminal["result"] == expected["normalized_result"], path.name
        elif terminal["type"] == "return_malformed":
            assert expected["outcome"] == "error", path.name
            assert expected["normalized_error"]["code"] == "invalid_response", path.name
        elif terminal["type"] == "raise_normalized_error":
            assert expected["outcome"] == "error", path.name
            assert terminal["error"] == expected["normalized_error"], path.name
        elif terminal["type"] == "await_cancellation":
            assert expected["outcome"] == "cancelled", path.name
            assert expected["normalized_error"]["code"] == "cancelled", path.name
        elif terminal["type"] == "complete_stream":
            assert fixture["operation"] == "stream", path.name
            assert fixture["capabilities"]["streaming"] == "supported", path.name
            text = "".join(
                step["text"] for step in steps if step["type"] == "emit_delta"
            )
            assert text == expected["normalized_result"]["text"], path.name
            if "usage" in terminal:
                assert terminal["usage"] == expected["normalized_result"]["usage"], (
                    path.name
                )
        else:  # pragma: no cover - schema validation keeps the event set closed.
            pytest.fail(f"Unrecognized terminal event in {path.name}")


def test_semantics_reject_cross_field_contradictions(
    validator: Draft202012Validator,
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    by_id = {fixture["fixture_id"]: fixture for _, fixture in fixtures}

    wrong_result = deepcopy(by_id["validate.connection_success"])
    wrong_result["script"]["steps"][-1]["result"] = {
        "kind": "message",
        "text": "synthetic",
        "tool_calls": [],
    }
    assert _semantic_errors(wrong_result)

    unsupported_requirement = deepcopy(by_id["stream.chunked_success"])
    unsupported_requirement["capabilities"]["streaming"] = "unsupported"
    assert _semantic_errors(unsupported_requirement)

    implausible_count = deepcopy(by_id["generate.text_success"])
    implausible_count["expected"]["request_count"] = 99

    malformed_cancelled = deepcopy(by_id["generate.malformed_response"])
    malformed_cancelled["expected"]["outcome"] = "cancelled"

    for altered in (
        wrong_result,
        unsupported_requirement,
        implausible_count,
        malformed_cancelled,
    ):
        validator.validate(altered)
        assert _semantic_errors(altered)
        with pytest.raises(FixtureValidationError):
            parse_fake_provider_fixture(altered)


def test_schema_and_runtime_reject_empty_error_messages(
    validator: Draft202012Validator,
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    by_id = {fixture["fixture_id"]: fixture for _, fixture in fixtures}
    altered = deepcopy(by_id["error.authentication"])
    altered["script"]["steps"][-1]["error"]["message"] = ""
    altered["expected"]["normalized_error"]["message"] = ""

    with pytest.raises(ValidationError):
        validator.validate(altered)
    with pytest.raises(FixtureValidationError, match="message cannot be empty"):
        parse_fake_provider_fixture(altered)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("fixture_schema_version", 2),
        ("provider_contract_version", "untracked-contract"),
        ("provenance", {"type": "live"}),
    ],
)
def test_schema_rejects_unrecognized_or_live_fixture_metadata(
    validator: Draft202012Validator,
    fixtures: list[tuple[Path, dict[str, Any]]],
    field: str,
    value: Any,
) -> None:
    altered = deepcopy(fixtures[0][1])
    altered[field] = value

    with pytest.raises(ValidationError):
        validator.validate(altered)


def test_schema_rejects_unknown_script_step(
    validator: Draft202012Validator,
    fixtures: list[tuple[Path, dict[str, Any]]],
) -> None:
    altered = deepcopy(fixtures[0][1])
    altered["script"]["steps"] = [{"sequence": 0, "type": "sleep"}]

    with pytest.raises(ValidationError):
        validator.validate(altered)
