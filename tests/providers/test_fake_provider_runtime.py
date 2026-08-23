"""Runtime tests for the deterministic, zero-network fake provider."""

# ruff: noqa: E402 -- the uninstalled custom integration needs the repo root.

from __future__ import annotations

import ast
import asyncio
import http.client
import json
import socket
import sys
import urllib.request
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from custom_components.ai_orchestrator.providers.contract import (
    CapabilityRecord,
    ConnectionValidationResult,
    ErrorCode,
    ProviderError,
    ProviderRequest,
    StreamCompleted,
    StreamDelta,
    TextGenerationResult,
)
from custom_components.ai_orchestrator.providers.fake import (
    FakeProvider,
    FakeProviderFixture,
    FixtureExhaustedError,
    FixtureMismatchError,
    FixtureOperation,
    FixtureValidationError,
    load_fake_provider_fixture,
    parse_fake_provider_fixture,
)

FIXTURE_DIR = ROOT / "tests" / "fixtures" / "providers" / "v1"
FAKE_PROVIDER_PATH = (
    ROOT / "custom_components" / "ai_orchestrator" / "providers" / "fake.py"
)
FAKE_PROVIDER_IMPORT_ALLOWLIST = {
    "__future__",
    "asyncio",
    "collections",
    "dataclasses",
    "enum",
    "json",
    "pathlib",
    "re",
    "types",
}


def _fixture_paths() -> list[Path]:
    return sorted(FIXTURE_DIR.glob("*.json"))


def _load_mapping(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _load(fixture_id: str) -> FakeProviderFixture:
    return load_fake_provider_fixture(FIXTURE_DIR / f"{fixture_id}.json")


def _normalized_error_payload(
    *,
    code: str = "provider_unavailable",
    message: str = "Synthetic provider failure.",
) -> dict[str, object]:
    return {"code": code, "message": message}


def _replace_terminal_with_error(payload: dict[str, Any]) -> None:
    error = _normalized_error_payload()
    payload["script"]["steps"][-1] = {
        "sequence": len(payload["script"]["steps"]) - 1,
        "type": "raise_normalized_error",
        "error": deepcopy(error),
    }
    payload["expected"] = {
        "outcome": "error",
        "normalized_error": error,
        "retry_allowed": False,
        "failover_allowed": False,
        "request_count": 1,
    }


def _replace_stream_terminal_with_cancellation(payload: dict[str, Any]) -> None:
    error = _normalized_error_payload(
        code="cancelled", message="Synthetic stream cancellation."
    )
    payload["script"]["steps"][-1] = {
        "sequence": len(payload["script"]["steps"]) - 1,
        "type": "await_cancellation",
    }
    payload["expected"] = {
        "outcome": "cancelled",
        "normalized_error": error,
        "retry_allowed": False,
        "failover_allowed": False,
        "request_count": 1,
    }


async def _exercise(provider: FakeProvider, fixture: FakeProviderFixture) -> object:
    try:
        if fixture.operation is FixtureOperation.VALIDATE_CONNECTION:
            return await provider.validate_connection(fixture.request)
        if fixture.operation is FixtureOperation.DISCOVER_CAPABILITIES:
            return await provider.discover_capabilities(fixture.request)
        if fixture.operation is FixtureOperation.GENERATE:
            if fixture.fixture_id == "request.cancelled":
                task = asyncio.create_task(provider.generate(fixture.request))
                await asyncio.sleep(0)
                assert not task.done()
                provider.cancellation.cancel()
                return await task
            return await provider.generate(fixture.request)
        return tuple([event async for event in provider.stream(fixture.request)])
    except ProviderError as err:
        return (
            err.error,
            err.retry_allowed,
            err.failover_allowed,
            provider.request_count,
        )


def test_every_committed_fixture_loads_to_typed_runtime_data() -> None:
    fixtures = [load_fake_provider_fixture(path) for path in _fixture_paths()]

    assert len(fixtures) == 10
    assert len({fixture.fixture_id for fixture in fixtures}) == len(fixtures)
    assert all(fixture.expected.request_count == 1 for fixture in fixtures)
    assert all(not fixture.request.tools for fixture in fixtures)


@pytest.mark.asyncio
@pytest.mark.parametrize("path", _fixture_paths(), ids=lambda path: path.stem)
async def test_fixture_execution_is_repeatable(path: Path) -> None:
    fixture = load_fake_provider_fixture(path)

    first = await _exercise(FakeProvider(fixture), fixture)
    second = await _exercise(FakeProvider(fixture), fixture)

    assert first == second


@pytest.mark.asyncio
async def test_success_results_are_normalized_types() -> None:
    connection = _load("validate.connection_success")
    capabilities = _load("capabilities.unknown")
    generation = _load("generate.text_success")

    assert isinstance(
        await FakeProvider(connection).validate_connection(connection.request),
        ConnectionValidationResult,
    )
    assert isinstance(
        await FakeProvider(capabilities).discover_capabilities(capabilities.request),
        CapabilityRecord,
    )
    assert isinstance(
        await FakeProvider(generation).generate(generation.request),
        TextGenerationResult,
    )


@pytest.mark.asyncio
async def test_stream_yields_only_normalized_ordered_events() -> None:
    fixture = _load("stream.chunked_success")

    events = [event async for event in FakeProvider(fixture).stream(fixture.request)]

    assert events == [
        StreamDelta(sequence=0, text="Synthetic "),
        StreamDelta(sequence=1, text="stream."),
        StreamCompleted(
            sequence=2,
            finish_reason=events[-1].finish_reason,
            usage=events[-1].usage,
        ),
    ]
    stream_text = "".join(
        event.text for event in events if isinstance(event, StreamDelta)
    )
    assert stream_text == "Synthetic stream."


@pytest.mark.asyncio
async def test_manual_cancellation_waits_until_explicit_signal() -> None:
    fixture = _load("request.cancelled")
    provider = FakeProvider(fixture)
    task = asyncio.create_task(provider.generate(fixture.request))
    await asyncio.sleep(0)

    assert not task.done()
    provider.cancellation.cancel()
    with pytest.raises(ProviderError) as caught:
        await task

    assert caught.value.error.code is ErrorCode.CANCELLED
    assert caught.value.retry_allowed is False
    assert caught.value.failover_allowed is False


@pytest.mark.asyncio
async def test_malformed_payload_becomes_normalized_invalid_response() -> None:
    fixture = _load("generate.malformed_response")

    with pytest.raises(ProviderError) as caught:
        await FakeProvider(fixture).generate(fixture.request)

    assert caught.value.error.code is ErrorCode.INVALID_RESPONSE
    assert "unexpected" not in caught.value.error.message


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("fixture_id", "method_name"),
    [
        ("validate.connection_success", "validate_connection"),
        ("capabilities.unknown", "discover_capabilities"),
    ],
)
async def test_validation_and_discovery_can_raise_normalized_errors(
    fixture_id: str, method_name: str
) -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / f"{fixture_id}.json"))
    _replace_terminal_with_error(payload)
    fixture = parse_fake_provider_fixture(payload)
    provider = FakeProvider(fixture)

    with pytest.raises(ProviderError) as caught:
        await getattr(provider, method_name)(fixture.request)

    assert caught.value.error.code is ErrorCode.PROVIDER_UNAVAILABLE
    assert caught.value.error.message == "Synthetic provider failure."
    assert provider.request_count == 1


@pytest.mark.asyncio
async def test_stream_can_raise_a_normalized_error_after_a_delta() -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "stream.chunked_success.json"))
    _replace_terminal_with_error(payload)
    fixture = parse_fake_provider_fixture(payload)
    provider = FakeProvider(fixture)
    stream = provider.stream(fixture.request)

    assert await anext(stream) == StreamDelta(sequence=0, text="Synthetic ")
    assert await anext(stream) == StreamDelta(sequence=1, text="stream.")
    with pytest.raises(ProviderError) as caught:
        await anext(stream)

    assert caught.value.error.code is ErrorCode.PROVIDER_UNAVAILABLE
    assert provider.request_count == 1


@pytest.mark.asyncio
async def test_stream_waits_for_manual_cancellation_after_deltas() -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "stream.chunked_success.json"))
    _replace_stream_terminal_with_cancellation(payload)
    fixture = parse_fake_provider_fixture(payload)
    provider = FakeProvider(fixture)
    stream = provider.stream(fixture.request)

    assert await anext(stream) == StreamDelta(sequence=0, text="Synthetic ")
    assert await anext(stream) == StreamDelta(sequence=1, text="stream.")
    terminal = asyncio.create_task(anext(stream))
    await asyncio.sleep(0)
    assert not terminal.done()
    provider.cancellation.cancel()
    with pytest.raises(ProviderError) as caught:
        await terminal

    assert caught.value.error.code is ErrorCode.CANCELLED
    assert provider.request_count == 1


@pytest.mark.asyncio
async def test_external_asyncio_cancellation_propagates_without_normalization() -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "stream.chunked_success.json"))
    _replace_stream_terminal_with_cancellation(payload)
    fixture = parse_fake_provider_fixture(payload)
    provider = FakeProvider(fixture)
    stream = provider.stream(fixture.request)

    assert await anext(stream) == StreamDelta(sequence=0, text="Synthetic ")
    assert await anext(stream) == StreamDelta(sequence=1, text="stream.")
    terminal = asyncio.create_task(anext(stream))
    await asyncio.sleep(0)
    terminal.cancel()
    with pytest.raises(asyncio.CancelledError):
        await terminal

    assert provider.cancellation.is_cancelled is False
    assert provider.request_count == 1


@pytest.mark.asyncio
async def test_request_mismatch_fails_before_consuming_fixture() -> None:
    fixture = _load("generate.text_success")
    provider = FakeProvider(fixture)

    with pytest.raises(FixtureMismatchError, match="exactly match"):
        await provider.generate(ProviderRequest())

    assert provider.request_count == 0


@pytest.mark.asyncio
async def test_operation_mismatch_fails_before_consuming_fixture() -> None:
    fixture = _load("generate.text_success")
    provider = FakeProvider(fixture)

    with pytest.raises(FixtureMismatchError, match="scripts generate"):
        await provider.validate_connection(fixture.request)

    assert provider.request_count == 0


@pytest.mark.asyncio
async def test_fixture_is_one_shot() -> None:
    fixture = _load("generate.text_success")
    provider = FakeProvider(fixture)
    await provider.generate(fixture.request)

    with pytest.raises(FixtureExhaustedError):
        await provider.generate(fixture.request)

    assert provider.request_count == 1


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        (lambda value: value.update({"fixture_schema_version": 2}), "schema version"),
        (
            lambda value: value.update({"provenance": {"type": "live"}}),
            "synthetic fixtures only",
        ),
        (
            lambda value: value.update(
                {"redaction": {"contains_live_data": True, "status": "reviewed"}}
            ),
            "no live data",
        ),
        (
            lambda value: value["script"]["steps"][0].update({"sequence": 4}),
            "contiguous",
        ),
    ],
)
def test_runtime_rejects_unsafe_or_mismatched_fixture_metadata(
    mutation: Any, message: str
) -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "generate.text_success.json"))
    mutation(payload)

    with pytest.raises(FixtureValidationError, match=message):
        parse_fake_provider_fixture(payload)


def test_runtime_rejects_tools_even_when_fixture_shape_is_valid() -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "generate.text_success.json"))
    payload["request_match"]["tools"] = [
        {
            "name": "synthetic_tool",
            "description": "A tool that must remain unavailable in Phase 0.",
            "parameters": {"type": "object"},
        }
    ]

    with pytest.raises(FixtureValidationError, match="cannot expose tools"):
        parse_fake_provider_fixture(payload)


def test_runtime_rejects_script_expected_result_disagreement() -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "generate.text_success.json"))
    payload["expected"]["normalized_result"]["text"] = "Different synthetic text."

    with pytest.raises(FixtureValidationError, match="results differ"):
        parse_fake_provider_fixture(payload)


def test_runtime_rejects_fixture_id_filename_disagreement(tmp_path: Path) -> None:
    payload = _load_mapping(FIXTURE_DIR / "generate.text_success.json")
    mismatched_path = tmp_path / "different.fixture.json"
    mismatched_path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(FixtureValidationError, match="match its filename"):
        load_fake_provider_fixture(mismatched_path)


def test_runtime_rejects_early_terminal_step() -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "generate.text_success.json"))
    payload["script"]["steps"].append(deepcopy(payload["script"]["steps"][0]))
    payload["script"]["steps"][1]["sequence"] = 1

    with pytest.raises(FixtureValidationError, match="early terminal"):
        parse_fake_provider_fixture(payload)


def test_runtime_rejects_capability_record_disagreement() -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "capabilities.unknown.json"))
    payload["expected"]["normalized_result"]["capabilities"]["streaming"] = "supported"
    payload["script"]["steps"][0]["result"] = deepcopy(
        payload["expected"]["normalized_result"]
    )

    with pytest.raises(FixtureValidationError, match="capabilities differ"):
        parse_fake_provider_fixture(payload)


@pytest.mark.parametrize("message", ["", "   "])
def test_runtime_rejects_empty_normalized_error_messages(message: str) -> None:
    payload = deepcopy(_load_mapping(FIXTURE_DIR / "error.authentication.json"))
    payload["script"]["steps"][-1]["error"]["message"] = message
    payload["expected"]["normalized_error"]["message"] = message

    with pytest.raises(FixtureValidationError, match="message cannot be empty"):
        parse_fake_provider_fixture(payload)


@pytest.mark.asyncio
async def test_runtime_does_not_call_network_helpers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Trip known stdlib network entry points for the Phase 0 fake only."""

    async def fail_open_connection(*_args: object, **_kwargs: object) -> None:
        pytest.fail("The fake provider attempted to open a network connection")

    def fail_network_helper(*_args: object, **_kwargs: object) -> None:
        pytest.fail("The fake provider attempted to use a network helper")

    monkeypatch.setattr(asyncio, "open_connection", fail_open_connection)
    monkeypatch.setattr(socket, "create_connection", fail_network_helper)
    monkeypatch.setattr(urllib.request, "urlopen", fail_network_helper)
    monkeypatch.setattr(http.client.HTTPConnection, "connect", fail_network_helper)
    for path in _fixture_paths():
        fixture = load_fake_provider_fixture(path)
        await _exercise(FakeProvider(fixture), fixture)


def test_phase0_fake_provider_imports_are_explicitly_allowlisted() -> None:
    """Constrain this fake module; future live adapters need separate proofs."""

    tree = ast.parse(FAKE_PROVIDER_PATH.read_text(encoding="utf-8"))
    imports: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name.split(".", maxsplit=1)[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            imports.add(node.module.split(".", maxsplit=1)[0])

    assert imports <= FAKE_PROVIDER_IMPORT_ALLOWLIST
