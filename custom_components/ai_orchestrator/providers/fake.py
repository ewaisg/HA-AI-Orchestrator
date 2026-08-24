"""Deterministic zero-network provider driven by reviewed synthetic fixtures."""

from __future__ import annotations

import asyncio
import json
import re
from collections.abc import AsyncIterator, Mapping, Sequence
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from types import MappingProxyType

from .contract import (
    EMPTY_REQUEST,
    PROVIDER_CONTRACT_VERSION,
    CapabilityRecord,
    CapabilityState,
    ConnectionValidationResult,
    ErrorCode,
    FinishReason,
    HealthCheckResult,
    Message,
    MessageRole,
    ModelCatalog,
    NormalizedError,
    ProviderError,
    ProviderHealthState,
    ProviderModel,
    ProviderRequest,
    ProviderResult,
    StreamCompleted,
    StreamDelta,
    StreamEvent,
    StructuredOutputDefinition,
    TextGenerationResult,
    ToolCall,
    ToolDefinition,
    Usage,
    validate_generation_result,
)

FIXTURE_SCHEMA_VERSION = 1


class FixtureOperation(StrEnum):
    """Operations admitted by provider contract version 1 fixtures."""

    VALIDATE_CONNECTION = "validate_connection"
    DISCOVER_MODELS = "discover_models"
    DISCOVER_CAPABILITIES = "discover_capabilities"
    CHECK_HEALTH = "check_health"
    GENERATE = "generate"
    STREAM = "stream"


class ExpectedOutcome(StrEnum):
    """Normalized fixture outcomes."""

    SUCCESS = "success"
    ERROR = "error"
    CANCELLED = "cancelled"


class FixtureValidationError(ValueError):
    """Raised when a fixture violates the runtime's fail-closed contract."""


class FixtureMismatchError(ValueError):
    """Raised when a call does not exactly match its scripted fixture."""


class FixtureExhaustedError(RuntimeError):
    """Raised when a one-shot fixture is invoked more than scripted."""


@dataclass(frozen=True, slots=True)
class ReturnStep:
    """Return one normalized result."""

    sequence: int
    result: ProviderResult


@dataclass(frozen=True, slots=True)
class EmitDeltaStep:
    """Emit one visible stream delta."""

    sequence: int
    text: str


@dataclass(frozen=True, slots=True)
class CompleteStreamStep:
    """Complete a deterministic stream."""

    sequence: int
    finish_reason: FinishReason
    usage: Usage | None


@dataclass(frozen=True, slots=True)
class RaiseErrorStep:
    """Raise one already-normalized synthetic error."""

    sequence: int
    error: NormalizedError


@dataclass(frozen=True, slots=True)
class MalformedStep:
    """Represent malformed provider data without exposing it as a result."""

    sequence: int


@dataclass(frozen=True, slots=True)
class AwaitCancellationStep:
    """Wait until the test-controlled cancellation token is signaled."""

    sequence: int


type ScriptStep = (
    ReturnStep
    | EmitDeltaStep
    | CompleteStreamStep
    | RaiseErrorStep
    | MalformedStep
    | AwaitCancellationStep
)


@dataclass(frozen=True, slots=True)
class FixtureExpectation:
    """Expected normalized result and routing decisions for one fixture."""

    outcome: ExpectedOutcome
    result: ProviderResult | None
    error: NormalizedError | None
    retry_allowed: bool
    failover_allowed: bool
    request_count: int


@dataclass(frozen=True, slots=True)
class FakeProviderFixture:
    """Validated, typed representation of one committed synthetic fixture."""

    fixture_id: str
    operation: FixtureOperation
    capabilities: CapabilityRecord
    request: ProviderRequest
    steps: tuple[ScriptStep, ...]
    expected: FixtureExpectation
    required_capabilities: tuple[str, ...]


class ManualCancellationToken:
    """Cancellation signal controlled by a test rather than wall-clock time."""

    def __init__(self) -> None:
        """Create an unsignaled manual cancellation token."""
        self._event = asyncio.Event()

    @property
    def is_cancelled(self) -> bool:
        """Return whether cancellation has been signaled."""
        return self._event.is_set()

    def cancel(self) -> None:
        """Signal cancellation deterministically."""
        self._event.set()

    async def wait(self) -> None:
        """Wait for a test to signal cancellation."""
        await self._event.wait()


class FakeProvider:
    """One-shot offline provider with no endpoint, session, or credential surface."""

    def __init__(
        self,
        fixture: FakeProviderFixture,
        *,
        cancellation: ManualCancellationToken | None = None,
    ) -> None:
        """Create a one-shot fake provider from validated fixture data."""
        self._fixture = fixture
        self._cancellation = cancellation or ManualCancellationToken()
        self._request_count = 0

    @classmethod
    def from_fixture_mapping(cls, fixture: Mapping[str, object]) -> FakeProvider:
        """Build a provider from a strict synthetic fixture mapping."""
        return cls(parse_fake_provider_fixture(fixture))

    @classmethod
    def from_fixture_path(cls, path: Path) -> FakeProvider:
        """Build a provider from a local JSON fixture file."""
        return cls(load_fake_provider_fixture(path))

    @property
    def fixture_id(self) -> str:
        """Return the non-sensitive fixture identifier."""
        return self._fixture.fixture_id

    @property
    def request_count(self) -> int:
        """Return how many requests this one-shot provider consumed."""
        return self._request_count

    @property
    def cancellation(self) -> ManualCancellationToken:
        """Expose only the manual test cancellation control."""
        return self._cancellation

    async def validate_connection(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ConnectionValidationResult:
        """Execute a synthetic connection-validation fixture."""
        result = await self._execute_single(
            FixtureOperation.VALIDATE_CONNECTION, request
        )
        if not isinstance(result, ConnectionValidationResult):
            raise FixtureValidationError(
                "Connection fixture returned the wrong result type"
            )
        return result

    async def discover_capabilities(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> CapabilityRecord:
        """Execute a synthetic capability-discovery fixture."""
        result = await self._execute_single(
            FixtureOperation.DISCOVER_CAPABILITIES, request
        )
        if not isinstance(result, CapabilityRecord):
            raise FixtureValidationError(
                "Capability fixture returned the wrong result type"
            )
        return result

    async def discover_models(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ModelCatalog:
        """Execute a synthetic model-discovery fixture."""
        result = await self._execute_single(FixtureOperation.DISCOVER_MODELS, request)
        if not isinstance(result, ModelCatalog):
            raise FixtureValidationError(
                "Model-discovery fixture returned the wrong result type"
            )
        return result

    async def check_health(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> HealthCheckResult:
        """Execute a synthetic provider-health fixture."""
        result = await self._execute_single(FixtureOperation.CHECK_HEALTH, request)
        if not isinstance(result, HealthCheckResult):
            raise FixtureValidationError(
                "Health fixture returned the wrong result type"
            )
        return result

    async def generate(self, request: ProviderRequest) -> TextGenerationResult:
        """Execute a deterministic non-streaming generation fixture."""
        result = await self._execute_single(FixtureOperation.GENERATE, request)
        if not isinstance(result, TextGenerationResult):
            raise FixtureValidationError(
                "Generation fixture returned the wrong result type"
            )
        return result

    async def stream(self, request: ProviderRequest) -> AsyncIterator[StreamEvent]:
        """Yield deterministic stream events in their recorded sequence."""
        self._begin(FixtureOperation.STREAM, request)
        for step in self._fixture.steps:
            if isinstance(step, EmitDeltaStep):
                yield StreamDelta(sequence=step.sequence, text=step.text)
            elif isinstance(step, CompleteStreamStep):
                yield StreamCompleted(
                    sequence=step.sequence,
                    finish_reason=step.finish_reason,
                    usage=step.usage,
                )
            elif isinstance(step, RaiseErrorStep):
                self._raise_provider_error(step.error)
            elif isinstance(step, AwaitCancellationStep):
                await self._cancellation.wait()
                self._raise_expected_error()
            else:
                raise FixtureValidationError(
                    "Stream fixture contains a non-stream script step"
                )

    def _begin(self, operation: FixtureOperation, request: ProviderRequest) -> None:
        if self._request_count >= self._fixture.expected.request_count:
            raise FixtureExhaustedError(
                f"Fixture {self.fixture_id!r} has no scripted requests remaining"
            )
        if operation is not self._fixture.operation:
            raise FixtureMismatchError(
                f"Fixture {self.fixture_id!r} scripts {self._fixture.operation.value}, "
                f"not {operation.value}"
            )
        if request != self._fixture.request:
            raise FixtureMismatchError(
                f"Request did not exactly match fixture {self.fixture_id!r}"
            )
        self._request_count += 1

    async def _execute_single(
        self, operation: FixtureOperation, request: ProviderRequest
    ) -> ProviderResult:
        self._begin(operation, request)
        terminal = self._fixture.steps[-1]
        if isinstance(terminal, ReturnStep):
            return terminal.result
        if isinstance(terminal, RaiseErrorStep):
            self._raise_provider_error(terminal.error)
        if isinstance(terminal, MalformedStep):
            self._raise_expected_error()
        if isinstance(terminal, AwaitCancellationStep):
            await self._cancellation.wait()
            self._raise_expected_error()
        raise FixtureValidationError("Non-stream fixture has no valid terminal step")

    def _raise_provider_error(self, error: NormalizedError) -> None:
        raise ProviderError(
            error,
            retry_allowed=self._fixture.expected.retry_allowed,
            failover_allowed=self._fixture.expected.failover_allowed,
        )

    def _raise_expected_error(self) -> None:
        error = self._fixture.expected.error
        if error is None:
            raise FixtureValidationError("Fixture did not define an expected error")
        self._raise_provider_error(error)


def load_fake_provider_fixture(path: Path) -> FakeProviderFixture:
    """Load and strictly parse one local JSON fixture."""
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as err:
        raise FixtureValidationError(f"Unable to load fixture {path.name!r}") from err
    fixture = parse_fake_provider_fixture(_mapping(payload, "fixture"))
    if path.stem != fixture.fixture_id:
        raise FixtureValidationError("Fixture ID must match its filename")
    return fixture


def parse_fake_provider_fixture(
    payload: Mapping[str, object],
) -> FakeProviderFixture:
    """Parse a fixture without any provider SDK or network-capable dependency."""
    _exact_keys(
        payload,
        required={
            "fixture_schema_version",
            "fixture_id",
            "provider_contract_version",
            "provenance",
            "redaction",
            "operation",
            "capabilities",
            "request_match",
            "script",
            "expected",
            "required_capabilities",
        },
        context="fixture",
    )
    if _integer(payload["fixture_schema_version"], "fixture schema version") != 1:
        raise FixtureValidationError("Unsupported fixture schema version")
    if _string(payload["provider_contract_version"], "contract version") != (
        PROVIDER_CONTRACT_VERSION
    ):
        raise FixtureValidationError("Unsupported provider contract version")

    provenance = _mapping(payload["provenance"], "provenance")
    _exact_keys(provenance, required={"type"}, context="provenance")
    if provenance["type"] != "synthetic":
        raise FixtureValidationError("Fake provider accepts synthetic fixtures only")

    redaction = _mapping(payload["redaction"], "redaction")
    _exact_keys(
        redaction,
        required={"contains_live_data", "status"},
        context="redaction",
    )
    if redaction != {"contains_live_data": False, "status": "reviewed"}:
        raise FixtureValidationError(
            "Fixture must be reviewed and contain no live data"
        )

    fixture_id = _string(payload["fixture_id"], "fixture ID")
    if re.fullmatch(r"[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+", fixture_id) is None:
        raise FixtureValidationError("Fixture ID has an invalid format")
    operation = _enum(FixtureOperation, payload["operation"], "operation")
    capabilities = _parse_capabilities(payload["capabilities"])
    request = _parse_request(payload["request_match"])
    script = _mapping(payload["script"], "script")
    _exact_keys(script, required={"clock", "steps"}, context="script")
    if script["clock"] != "manual":
        raise FixtureValidationError("Fake provider requires a manual script clock")
    steps = tuple(
        _parse_step(value, index)
        for index, value in enumerate(_sequence(script["steps"], "script steps"))
    )
    if not steps:
        raise FixtureValidationError("Fixture must contain at least one script step")
    if [step.sequence for step in steps] != list(range(len(steps))):
        raise FixtureValidationError("Script sequences must be contiguous from zero")

    expected = _parse_expectation(payload["expected"])
    if expected.request_count != 1:
        raise FixtureValidationError("Fake-provider fixtures must script one request")
    if (
        expected.error is not None
        and expected.error.retry_hint_ms is not None
        and not expected.retry_allowed
    ):
        raise FixtureValidationError("A retry hint requires retry_allowed")

    required_capabilities = tuple(
        _string(value, "required capability")
        for value in _sequence(
            payload["required_capabilities"], "required capabilities"
        )
    )
    if len(required_capabilities) != len(set(required_capabilities)):
        raise FixtureValidationError("Required capabilities must be unique")
    for capability in required_capabilities:
        if capability not in {
            "text_generation",
            "model_discovery",
            "streaming",
            "structured_output",
            "tool_calling",
            "usage",
        }:
            raise FixtureValidationError(f"Unknown required capability {capability!r}")
        if getattr(capabilities, capability) is not CapabilityState.SUPPORTED:
            raise FixtureValidationError(
                f"Required capability {capability!r} is not supported by the fixture"
            )

    fixture = FakeProviderFixture(
        fixture_id=fixture_id,
        operation=operation,
        capabilities=capabilities,
        request=request,
        steps=steps,
        expected=expected,
        required_capabilities=required_capabilities,
    )
    _validate_fixture_semantics(fixture)
    return fixture


def _parse_capabilities(value: object) -> CapabilityRecord:
    mapping = _mapping(value, "capabilities")
    names = {
        "text_generation",
        "model_discovery",
        "streaming",
        "structured_output",
        "tool_calling",
        "usage",
    }
    _exact_keys(mapping, required=names, context="capabilities")
    return CapabilityRecord(
        text_generation=_enum(
            CapabilityState, mapping["text_generation"], "text generation"
        ),
        model_discovery=_enum(
            CapabilityState, mapping["model_discovery"], "model discovery"
        ),
        streaming=_enum(CapabilityState, mapping["streaming"], "streaming"),
        structured_output=_enum(
            CapabilityState, mapping["structured_output"], "structured output"
        ),
        tool_calling=_enum(CapabilityState, mapping["tool_calling"], "tool calling"),
        usage=_enum(CapabilityState, mapping["usage"], "usage"),
    )


def _parse_request(value: object) -> ProviderRequest:
    mapping = _mapping(value, "request")
    _exact_keys(
        mapping,
        required={"messages", "tools"},
        optional={"output_schema"},
        context="request",
    )
    messages = tuple(
        _parse_message(item) for item in _sequence(mapping["messages"], "messages")
    )
    tools = tuple(_parse_tool(item) for item in _sequence(mapping["tools"], "tools"))
    output_schema = (
        _parse_output_schema(mapping["output_schema"])
        if "output_schema" in mapping
        else None
    )
    try:
        return ProviderRequest(
            messages=messages,
            tools=tools,
            output_schema=output_schema,
        )
    except (TypeError, ValueError) as err:
        raise FixtureValidationError(str(err)) from err


def _parse_message(value: object) -> Message:
    mapping = _mapping(value, "message")
    _exact_keys(
        mapping,
        required={"role", "content"},
        optional={"tool_calls", "tool_call_id"},
        context="message",
    )
    calls = tuple(
        _parse_tool_call(item)
        for item in _sequence(mapping.get("tool_calls", ()), "message tool calls")
    )
    tool_call_id = (
        _string(mapping["tool_call_id"], "message tool-call ID")
        if "tool_call_id" in mapping
        else None
    )
    try:
        return Message(
            role=_enum(MessageRole, mapping["role"], "message role"),
            content=_string(mapping["content"], "message content"),
            tool_calls=calls,
            tool_call_id=tool_call_id,
        )
    except (TypeError, ValueError) as err:
        raise FixtureValidationError(str(err)) from err


def _parse_output_schema(value: object) -> StructuredOutputDefinition:
    mapping = _mapping(value, "output schema")
    _exact_keys(
        mapping,
        required={"name", "schema"},
        context="output schema",
    )
    try:
        return StructuredOutputDefinition(
            name=_string(mapping["name"], "output schema name"),
            schema=_mapping(mapping["schema"], "output schema value"),
        )
    except (TypeError, ValueError) as err:
        raise FixtureValidationError(str(err)) from err


def _parse_tool(value: object) -> ToolDefinition:
    mapping = _mapping(value, "tool")
    _exact_keys(
        mapping,
        required={"name", "description", "parameters"},
        context="tool",
    )
    try:
        return ToolDefinition(
            name=_string(mapping["name"], "tool name"),
            description=_string(mapping["description"], "tool description"),
            parameters=_freeze_mapping(
                _mapping(mapping["parameters"], "tool parameters")
            ),
        )
    except ValueError as err:
        raise FixtureValidationError(str(err)) from err


def _parse_step(value: object, expected_sequence: int) -> ScriptStep:
    mapping = _mapping(value, f"script step {expected_sequence}")
    sequence = _integer(mapping.get("sequence"), "script sequence")
    step_type = _string(mapping.get("type"), "script step type")
    if step_type == "return":
        _exact_keys(mapping, required={"sequence", "type", "result"}, context=step_type)
        return ReturnStep(sequence, _parse_result(mapping["result"]))
    if step_type == "emit_delta":
        _exact_keys(mapping, required={"sequence", "type", "text"}, context=step_type)
        return EmitDeltaStep(sequence, _string(mapping["text"], "stream delta"))
    if step_type == "complete_stream":
        _exact_keys(
            mapping,
            required={"sequence", "type", "finish_reason"},
            optional={"usage"},
            context=step_type,
        )
        usage = _parse_usage(mapping["usage"]) if "usage" in mapping else None
        return CompleteStreamStep(
            sequence,
            _enum(FinishReason, mapping["finish_reason"], "finish reason"),
            usage,
        )
    if step_type == "raise_normalized_error":
        _exact_keys(mapping, required={"sequence", "type", "error"}, context=step_type)
        return RaiseErrorStep(sequence, _parse_error(mapping["error"]))
    if step_type == "return_malformed":
        _exact_keys(
            mapping, required={"sequence", "type", "payload"}, context=step_type
        )
        return MalformedStep(sequence)
    if step_type == "await_cancellation":
        _exact_keys(mapping, required={"sequence", "type"}, context=step_type)
        return AwaitCancellationStep(sequence)
    raise FixtureValidationError(f"Unknown script step {step_type!r}")


def _parse_result(value: object) -> ProviderResult:
    mapping = _mapping(value, "normalized result")
    kind = _string(mapping.get("kind"), "result kind")
    if kind == "message":
        _exact_keys(
            mapping,
            required={"kind", "text", "tool_calls"},
            optional={"usage", "structured_output"},
            context="message result",
        )
        calls = tuple(
            _parse_tool_call(item)
            for item in _sequence(mapping["tool_calls"], "tool calls")
        )
        usage = _parse_usage(mapping["usage"]) if "usage" in mapping else None
        structured_output = (
            _freeze_mapping(
                _mapping(mapping["structured_output"], "structured output result")
            )
            if "structured_output" in mapping
            else None
        )
        try:
            return TextGenerationResult(
                text=_string(mapping["text"], "result text"),
                tool_calls=calls,
                usage=usage,
                structured_output=structured_output,
            )
        except (TypeError, ValueError) as err:
            raise FixtureValidationError(str(err)) from err
    if kind == "connection_validation":
        _exact_keys(
            mapping,
            required={"kind", "reachable", "authenticated"},
            context="connection validation result",
        )
        try:
            return ConnectionValidationResult(
                reachable=_boolean(mapping["reachable"], "reachable"),
                authenticated=_boolean(mapping["authenticated"], "authenticated"),
            )
        except ValueError as err:
            raise FixtureValidationError(str(err)) from err
    if kind == "model_catalog":
        _exact_keys(
            mapping,
            required={"kind", "models"},
            context="model catalog result",
        )
        models = tuple(
            _parse_model(item)
            for item in _sequence(mapping["models"], "provider models")
        )
        try:
            return ModelCatalog(models=models)
        except ValueError as err:
            raise FixtureValidationError(str(err)) from err
    if kind == "health":
        _exact_keys(
            mapping,
            required={"kind", "state"},
            context="health result",
        )
        return HealthCheckResult(
            state=_enum(ProviderHealthState, mapping["state"], "health state")
        )
    if kind == "capability_record":
        _exact_keys(
            mapping,
            required={"kind", "capabilities"},
            context="capability result",
        )
        return _parse_capabilities(mapping["capabilities"])
    raise FixtureValidationError(f"Unknown result kind {kind!r}")


def _parse_model(value: object) -> ProviderModel:
    mapping = _mapping(value, "provider model")
    _exact_keys(
        mapping,
        required={"id", "display_name"},
        context="provider model",
    )
    try:
        return ProviderModel(
            id=_string(mapping["id"], "provider model ID"),
            display_name=_string(
                mapping["display_name"], "provider model display name"
            ),
        )
    except ValueError as err:
        raise FixtureValidationError(str(err)) from err


def _parse_tool_call(value: object) -> ToolCall:
    mapping = _mapping(value, "tool call")
    _exact_keys(
        mapping,
        required={"id", "name", "arguments"},
        context="tool call",
    )
    try:
        return ToolCall(
            id=_string(mapping["id"], "tool call ID"),
            name=_string(mapping["name"], "tool call name"),
            arguments=_freeze_mapping(_mapping(mapping["arguments"], "tool arguments")),
        )
    except ValueError as err:
        raise FixtureValidationError(str(err)) from err


def _parse_usage(value: object) -> Usage:
    mapping = _mapping(value, "usage")
    _exact_keys(
        mapping,
        required={"input_tokens", "output_tokens"},
        context="usage",
    )
    input_tokens = _integer(mapping["input_tokens"], "input tokens")
    output_tokens = _integer(mapping["output_tokens"], "output tokens")
    if input_tokens < 0 or output_tokens < 0:
        raise FixtureValidationError("Usage token counts cannot be negative")
    return Usage(input_tokens=input_tokens, output_tokens=output_tokens)


def _parse_error(value: object) -> NormalizedError:
    mapping = _mapping(value, "normalized error")
    _exact_keys(
        mapping,
        required={"code", "message"},
        optional={"retry_hint_ms"},
        context="normalized error",
    )
    retry_hint = None
    if "retry_hint_ms" in mapping:
        retry_hint = _integer(mapping["retry_hint_ms"], "retry hint")
        if retry_hint < 0:
            raise FixtureValidationError("Retry hint cannot be negative")
    message = _string(mapping["message"], "error message")
    try:
        return NormalizedError(
            code=_enum(ErrorCode, mapping["code"], "error code"),
            message=message,
            retry_hint_ms=retry_hint,
        )
    except (TypeError, ValueError) as err:
        raise FixtureValidationError(str(err)) from err


def _parse_expectation(value: object) -> FixtureExpectation:
    mapping = _mapping(value, "expected")
    outcome = _enum(ExpectedOutcome, mapping.get("outcome"), "expected outcome")
    common = {
        "outcome",
        "retry_allowed",
        "failover_allowed",
        "request_count",
    }
    if outcome is ExpectedOutcome.SUCCESS:
        _exact_keys(
            mapping,
            required=common | {"normalized_result"},
            context="successful expectation",
        )
        result = _parse_result(mapping["normalized_result"])
        error = None
    else:
        _exact_keys(
            mapping,
            required=common | {"normalized_error"},
            context="error expectation",
        )
        result = None
        error = _parse_error(mapping["normalized_error"])
    return FixtureExpectation(
        outcome=outcome,
        result=result,
        error=error,
        retry_allowed=_boolean(mapping["retry_allowed"], "retry allowed"),
        failover_allowed=_boolean(mapping["failover_allowed"], "failover allowed"),
        request_count=_integer(mapping["request_count"], "request count"),
    )


def _validate_fixture_semantics(fixture: FakeProviderFixture) -> None:
    steps = fixture.steps
    terminal = steps[-1]
    expected = fixture.expected
    terminal_types = (
        ReturnStep,
        CompleteStreamStep,
        RaiseErrorStep,
        MalformedStep,
        AwaitCancellationStep,
    )
    if any(isinstance(step, terminal_types) for step in steps[:-1]):
        raise FixtureValidationError("Fixture contains an early terminal step")

    if fixture.operation is FixtureOperation.STREAM:
        if fixture.capabilities.streaming is not CapabilityState.SUPPORTED:
            raise FixtureValidationError("Stream fixture must support streaming")
        if not isinstance(
            terminal, CompleteStreamStep | RaiseErrorStep | AwaitCancellationStep
        ):
            raise FixtureValidationError(
                "Stream fixture requires a terminal stream event"
            )
        if any(isinstance(step, ReturnStep | MalformedStep) for step in steps):
            raise FixtureValidationError("Stream fixture contains a non-stream step")
    elif any(isinstance(step, EmitDeltaStep | CompleteStreamStep) for step in steps):
        raise FixtureValidationError("Non-stream fixture contains a stream step")

    if fixture.operation is FixtureOperation.VALIDATE_CONNECTION and not isinstance(
        terminal, ReturnStep | RaiseErrorStep
    ):
        raise FixtureValidationError(
            "Connection operation requires a result or normalized error"
        )
    if fixture.operation is FixtureOperation.DISCOVER_CAPABILITIES and not isinstance(
        terminal, ReturnStep | RaiseErrorStep
    ):
        raise FixtureValidationError(
            "Capability operation requires a result or normalized error"
        )
    if fixture.operation is FixtureOperation.DISCOVER_MODELS and not isinstance(
        terminal, ReturnStep | RaiseErrorStep
    ):
        raise FixtureValidationError(
            "Model discovery operation requires a result or normalized error"
        )
    if fixture.operation is FixtureOperation.CHECK_HEALTH and not isinstance(
        terminal, ReturnStep | RaiseErrorStep
    ):
        raise FixtureValidationError(
            "Health operation requires a result or normalized error"
        )
    if fixture.operation is FixtureOperation.GENERATE and not isinstance(
        terminal, ReturnStep | RaiseErrorStep | MalformedStep | AwaitCancellationStep
    ):
        raise FixtureValidationError("Generate operation has an invalid terminal step")

    if isinstance(terminal, ReturnStep):
        if expected.outcome is not ExpectedOutcome.SUCCESS:
            raise FixtureValidationError(
                "Return step requires a successful expectation"
            )
        if terminal.result != expected.result:
            raise FixtureValidationError("Scripted and expected results differ")
    elif isinstance(terminal, RaiseErrorStep):
        if expected.outcome is not ExpectedOutcome.ERROR:
            raise FixtureValidationError("Error step requires an error expectation")
        if terminal.error != expected.error:
            raise FixtureValidationError("Scripted and expected errors differ")
    elif isinstance(terminal, MalformedStep):
        if (
            expected.outcome is not ExpectedOutcome.ERROR
            or expected.error is None
            or expected.error.code is not ErrorCode.INVALID_RESPONSE
        ):
            raise FixtureValidationError(
                "Malformed step requires error outcome with invalid_response"
            )
    elif isinstance(terminal, AwaitCancellationStep):
        if (
            expected.outcome is not ExpectedOutcome.CANCELLED
            or expected.error is None
            or expected.error.code is not ErrorCode.CANCELLED
        ):
            raise FixtureValidationError("Cancellation step requires cancelled outcome")
    elif isinstance(terminal, CompleteStreamStep):
        _validate_stream_result(fixture, terminal)

    if (
        fixture.operation is FixtureOperation.VALIDATE_CONNECTION
        and isinstance(terminal, ReturnStep)
        and not isinstance(expected.result, ConnectionValidationResult)
    ):
        raise FixtureValidationError("Connection operation requires connection result")
    if (
        fixture.operation is FixtureOperation.DISCOVER_CAPABILITIES
        and isinstance(terminal, ReturnStep)
        and not isinstance(expected.result, CapabilityRecord)
    ):
        raise FixtureValidationError("Capability operation requires capability record")
    if (
        fixture.operation is FixtureOperation.DISCOVER_MODELS
        and isinstance(terminal, ReturnStep)
        and not isinstance(expected.result, ModelCatalog)
    ):
        raise FixtureValidationError("Model discovery operation requires model catalog")
    if (
        fixture.operation is FixtureOperation.CHECK_HEALTH
        and isinstance(terminal, ReturnStep)
        and not isinstance(expected.result, HealthCheckResult)
    ):
        raise FixtureValidationError("Health operation requires health result")
    if (
        fixture.operation is FixtureOperation.DISCOVER_CAPABILITIES
        and isinstance(terminal, ReturnStep)
        and expected.result != fixture.capabilities
    ):
        raise FixtureValidationError(
            "Discovered capabilities differ from the fixture capability record"
        )
    if (
        fixture.operation
        in {
            FixtureOperation.VALIDATE_CONNECTION,
            FixtureOperation.DISCOVER_MODELS,
            FixtureOperation.DISCOVER_CAPABILITIES,
            FixtureOperation.CHECK_HEALTH,
        }
        and fixture.request != ProviderRequest()
    ):
        raise FixtureValidationError(
            "Validation, discovery, and health fixtures require an empty request"
        )
    if fixture.operation is FixtureOperation.GENERATE and expected.result is not None:
        if not isinstance(expected.result, TextGenerationResult):
            raise FixtureValidationError("Generate operation requires message result")
        if fixture.capabilities.text_generation is not CapabilityState.SUPPORTED:
            raise FixtureValidationError(
                "Successful generate fixture must support text generation"
            )
    if fixture.operation is FixtureOperation.STREAM:
        if fixture.capabilities.text_generation is not CapabilityState.SUPPORTED:
            raise FixtureValidationError(
                "Successful stream fixture must support text generation"
            )
    if fixture.request.tools:
        if fixture.capabilities.tool_calling is not CapabilityState.SUPPORTED:
            raise FixtureValidationError(
                "Fixture exposing tools must support tool calling"
            )
        if fixture.capabilities.structured_output is not CapabilityState.SUPPORTED:
            raise FixtureValidationError(
                "Fixture exposing tools must support structured output"
            )
    if isinstance(expected.result, TextGenerationResult):
        try:
            validate_generation_result(fixture.request, expected.result)
        except ValueError as err:
            raise FixtureValidationError(
                f"Provider generation result is invalid: {err}"
            ) from err


def _validate_stream_result(
    fixture: FakeProviderFixture, terminal: CompleteStreamStep
) -> None:
    expected = fixture.expected
    if expected.outcome is not ExpectedOutcome.SUCCESS or not isinstance(
        expected.result, TextGenerationResult
    ):
        raise FixtureValidationError("Completed stream requires a message result")
    text = "".join(
        step.text for step in fixture.steps if isinstance(step, EmitDeltaStep)
    )
    if text != expected.result.text or terminal.usage != expected.result.usage:
        raise FixtureValidationError("Stream events and expected message differ")
    if expected.result.tool_calls:
        raise FixtureValidationError("Stream fixture cannot return tool calls")


def _mapping(value: object, context: str) -> Mapping[str, object]:
    if not isinstance(value, Mapping) or not all(isinstance(key, str) for key in value):
        raise FixtureValidationError(f"{context} must be an object")
    return value


def _sequence(value: object, context: str) -> Sequence[object]:
    if isinstance(value, str) or not isinstance(value, Sequence):
        raise FixtureValidationError(f"{context} must be an array")
    return value


def _exact_keys(
    mapping: Mapping[str, object],
    *,
    required: set[str],
    context: str,
    optional: set[str] | None = None,
) -> None:
    optional = optional or set()
    actual = set(mapping)
    if missing := required - actual:
        raise FixtureValidationError(f"{context} is missing fields {sorted(missing)}")
    if extra := actual - required - optional:
        raise FixtureValidationError(f"{context} has unknown fields {sorted(extra)}")


def _string(value: object, context: str) -> str:
    if not isinstance(value, str):
        raise FixtureValidationError(f"{context} must be a string")
    return value


def _integer(value: object, context: str) -> int:
    if type(value) is not int:
        raise FixtureValidationError(f"{context} must be an integer")
    return value


def _boolean(value: object, context: str) -> bool:
    if type(value) is not bool:
        raise FixtureValidationError(f"{context} must be a boolean")
    return value


def _enum[T: StrEnum](enum_type: type[T], value: object, context: str) -> T:
    try:
        return enum_type(_string(value, context))
    except ValueError as err:
        raise FixtureValidationError(f"Unknown {context} {value!r}") from err


def _freeze_mapping(value: Mapping[str, object]) -> Mapping[str, object]:
    return MappingProxyType({key: _freeze_value(item) for key, item in value.items()})


def _freeze_value(value: object) -> object:
    if isinstance(value, Mapping):
        return _freeze_mapping(_mapping(value, "nested object"))
    if isinstance(value, list):
        return tuple(_freeze_value(item) for item in value)
    return value
