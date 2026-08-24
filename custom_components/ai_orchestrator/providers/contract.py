"""Provider-neutral types used by adapters and deterministic test providers."""

from __future__ import annotations

import re
from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass
from enum import StrEnum
from types import MappingProxyType
from typing import Final, Protocol, cast

PROVIDER_CONTRACT_VERSION: Final = "1"
_IDENTIFIER_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


class MessageRole(StrEnum):
    """Roles accepted by the provider-neutral message contract."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class CapabilityState(StrEnum):
    """Evidence state for an individual provider capability."""

    SUPPORTED = "supported"
    UNSUPPORTED = "unsupported"
    UNKNOWN = "unknown"


class ProviderHealthState(StrEnum):
    """Successful provider health states returned by an adapter."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"


class FinishReason(StrEnum):
    """Normalized provider completion reasons."""

    STOP = "stop"
    LENGTH = "length"
    TOOL_CALL = "tool_call"
    REFUSAL = "refusal"


class ErrorCode(StrEnum):
    """Provider-neutral error categories recorded by the fixture schema."""

    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    NOT_FOUND = "not_found"
    RATE_LIMITED = "rate_limited"
    CONTEXT_OVERFLOW = "context_overflow"
    SAFETY_REFUSAL = "safety_refusal"
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    INVALID_RESPONSE = "invalid_response"
    TIMEOUT = "timeout"
    CONNECTION = "connection"
    TLS = "tls"
    DNS = "dns"
    CANCELLED = "cancelled"
    UNSUPPORTED = "unsupported"


SAFE_ERROR_MESSAGES: Final[Mapping[ErrorCode, str]] = MappingProxyType(
    {
        ErrorCode.AUTHENTICATION: "Provider authentication failed.",
        ErrorCode.AUTHORIZATION: "Provider authorization failed.",
        ErrorCode.NOT_FOUND: "Provider model or deployment was not found.",
        ErrorCode.RATE_LIMITED: "Provider rate limit was reached.",
        ErrorCode.CONTEXT_OVERFLOW: "Provider context limit was exceeded.",
        ErrorCode.SAFETY_REFUSAL: "Provider refused the request for safety reasons.",
        ErrorCode.PROVIDER_UNAVAILABLE: "Provider is unavailable.",
        ErrorCode.INVALID_RESPONSE: "Provider returned an invalid response.",
        ErrorCode.TIMEOUT: "Provider request timed out.",
        ErrorCode.CONNECTION: "Provider connection failed.",
        ErrorCode.TLS: "Provider TLS validation failed.",
        ErrorCode.DNS: "Provider name resolution failed.",
        ErrorCode.CANCELLED: "Provider request was cancelled.",
        ErrorCode.UNSUPPORTED: "Provider does not support the requested capability.",
    }
)


@dataclass(frozen=True, slots=True)
class Message:
    """One provider-neutral chat message."""

    role: MessageRole
    content: str
    tool_calls: tuple[ToolCall, ...] = ()
    tool_call_id: str | None = None

    def __post_init__(self) -> None:
        """Reject non-normalized message data."""
        _require_instance(self.role, MessageRole, "message role")
        _require_instance(self.content, str, "message content")
        object.__setattr__(self, "tool_calls", tuple(self.tool_calls))
        if any(not isinstance(call, ToolCall) for call in self.tool_calls):
            raise TypeError("Assistant tool calls must use ToolCall")
        if self.role is MessageRole.ASSISTANT:
            if self.tool_call_id is not None:
                raise ValueError("Assistant message cannot carry a tool-call result ID")
        elif self.role is MessageRole.TOOL:
            if self.tool_calls:
                raise ValueError("Tool-result message cannot request tool calls")
            if self.tool_call_id is None or not self.tool_call_id.strip():
                raise ValueError("Tool-result message requires a tool-call ID")
        elif self.tool_calls or self.tool_call_id is not None:
            raise ValueError(
                "Only assistant and tool-result messages may carry tool metadata"
            )


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    """A typed tool schema; execution remains outside provider adapters."""

    name: str
    description: str
    parameters: Mapping[str, object]

    def __post_init__(self) -> None:
        """Validate the public tool identity and freeze its parameter schema."""
        _validate_identifier(self.name, "tool name")
        if not self.description.strip():
            raise ValueError("Tool description cannot be empty")
        _validate_schema(self.parameters, "tool parameter schema")
        if self.parameters.get("type") != "object":
            raise ValueError("Tool parameter schema must have an object root")
        object.__setattr__(self, "parameters", _freeze_mapping(self.parameters))


@dataclass(frozen=True, slots=True)
class StructuredOutputDefinition:
    """Closed provider-neutral object schema requested from an adapter."""

    name: str
    schema: Mapping[str, object]

    def __post_init__(self) -> None:
        """Validate and freeze the closed output schema."""
        _validate_identifier(self.name, "structured output name")
        _validate_schema(self.schema, "structured output schema")
        if self.schema.get("type") != "object":
            raise ValueError("Structured output schema must have an object root")
        object.__setattr__(self, "schema", _freeze_mapping(self.schema))


@dataclass(frozen=True, slots=True)
class ProviderRequest:
    """Provider-neutral request matched exactly by the fake provider."""

    messages: tuple[Message, ...] = ()
    tools: tuple[ToolDefinition, ...] = ()
    output_schema: StructuredOutputDefinition | None = None

    def __post_init__(self) -> None:
        """Detach caller-owned request sequences."""
        object.__setattr__(self, "messages", tuple(self.messages))
        object.__setattr__(self, "tools", tuple(self.tools))
        if any(not isinstance(message, Message) for message in self.messages):
            raise TypeError("Provider request messages must use Message")
        if any(not isinstance(tool, ToolDefinition) for tool in self.tools):
            raise TypeError("Provider request tools must use ToolDefinition")
        tool_names = [tool.name for tool in self.tools]
        if len(tool_names) != len(set(tool_names)):
            raise ValueError("Provider request tool names must be unique")
        if self.output_schema is not None and not isinstance(
            self.output_schema, StructuredOutputDefinition
        ):
            raise TypeError(
                "Provider output schema must use StructuredOutputDefinition"
            )
        _validate_tool_continuation(
            self.messages,
            {tool.name: tool for tool in self.tools},
        )


@dataclass(frozen=True, slots=True)
class Usage:
    """Normalized usage reported only when fixture or provider evidence supplies it."""

    input_tokens: int
    output_tokens: int

    def __post_init__(self) -> None:
        """Reject invalid accounting rather than normalizing it silently."""
        if self.input_tokens < 0 or self.output_tokens < 0:
            raise ValueError("Usage token counts cannot be negative")


@dataclass(frozen=True, slots=True)
class ToolCall:
    """A provider-requested tool call; this type does not execute it."""

    id: str
    name: str
    arguments: Mapping[str, object]

    def __post_init__(self) -> None:
        """Validate the requested tool identity and freeze its arguments."""
        if not self.id.strip():
            raise ValueError("Tool call ID cannot be empty")
        _validate_identifier(self.name, "tool call name")
        object.__setattr__(self, "arguments", _freeze_mapping(self.arguments))


@dataclass(frozen=True, slots=True)
class TextGenerationResult:
    """Normalized visible provider response."""

    text: str
    tool_calls: tuple[ToolCall, ...] = ()
    usage: Usage | None = None
    structured_output: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        """Detach caller-owned tool-call sequences."""
        object.__setattr__(self, "tool_calls", tuple(self.tool_calls))
        if any(not isinstance(call, ToolCall) for call in self.tool_calls):
            raise TypeError("Generation tool calls must use ToolCall")
        call_ids = [call.id for call in self.tool_calls]
        if len(call_ids) != len(set(call_ids)):
            raise ValueError("Tool call IDs must be unique")
        if self.usage is not None and not isinstance(self.usage, Usage):
            raise TypeError("Generation usage must use Usage")
        if self.structured_output is not None:
            if not isinstance(self.structured_output, Mapping):
                raise TypeError("Generation structured output must be a mapping")
            object.__setattr__(
                self,
                "structured_output",
                _freeze_mapping(self.structured_output),
            )


@dataclass(frozen=True, slots=True)
class ConnectionValidationResult:
    """Successful reachability and authentication validation."""

    reachable: bool
    authenticated: bool

    def __post_init__(self) -> None:
        """Require failures to use the normalized error channel."""
        if not self.reachable or not self.authenticated:
            raise ValueError(
                "Connection validation failures must use a normalized provider error"
            )


@dataclass(frozen=True, slots=True)
class ProviderModel:
    """One provider-supplied model identity, with no inferred capability claim."""

    id: str
    display_name: str

    def __post_init__(self) -> None:
        """Reject unusable model records."""
        if not self.id.strip():
            raise ValueError("Provider model ID cannot be empty")
        if not self.display_name.strip():
            raise ValueError("Provider model display name cannot be empty")


@dataclass(frozen=True, slots=True)
class ModelCatalog:
    """Immutable discovered model list with stable, unique provider IDs."""

    models: tuple[ProviderModel, ...]

    def __post_init__(self) -> None:
        """Reject ambiguous duplicate model identities."""
        object.__setattr__(self, "models", tuple(self.models))
        model_ids = [model.id for model in self.models]
        if len(model_ids) != len(set(model_ids)):
            raise ValueError("Provider model IDs must be unique")


@dataclass(frozen=True, slots=True)
class HealthCheckResult:
    """Successful provider health observation."""

    state: ProviderHealthState

    def __post_init__(self) -> None:
        """Reject adapter-specific health values at the contract boundary."""
        _require_instance(self.state, ProviderHealthState, "provider health state")


@dataclass(frozen=True, slots=True)
class CapabilityRecord:
    """Explicit capability states; an unproven capability remains unknown."""

    text_generation: CapabilityState
    model_discovery: CapabilityState
    streaming: CapabilityState
    structured_output: CapabilityState
    tool_calling: CapabilityState
    usage: CapabilityState

    def __post_init__(self) -> None:
        """Require every capability to use the explicit evidence-state enum."""
        for value in (
            self.text_generation,
            self.model_discovery,
            self.streaming,
            self.structured_output,
            self.tool_calling,
            self.usage,
        ):
            _require_instance(value, CapabilityState, "capability state")


@dataclass(frozen=True, slots=True)
class StreamDelta:
    """One deterministic visible-text stream delta."""

    sequence: int
    text: str

    def __post_init__(self) -> None:
        """Reject invalid stream ordering metadata."""
        if self.sequence < 0:
            raise ValueError("Stream sequence cannot be negative")


@dataclass(frozen=True, slots=True)
class StreamCompleted:
    """Deterministic terminal stream event."""

    sequence: int
    finish_reason: FinishReason
    usage: Usage | None = None

    def __post_init__(self) -> None:
        """Reject invalid terminal ordering metadata."""
        if self.sequence < 0:
            raise ValueError("Stream sequence cannot be negative")
        _require_instance(self.finish_reason, FinishReason, "finish reason")
        if self.usage is not None and not isinstance(self.usage, Usage):
            raise TypeError("Stream usage must use Usage")


@dataclass(frozen=True, slots=True)
class NormalizedError:
    """Safe provider error representation."""

    code: ErrorCode
    message: str
    retry_hint_ms: int | None = None

    def __post_init__(self) -> None:
        """Reject unusable errors at the provider-neutral boundary."""
        _require_instance(self.code, ErrorCode, "error code")
        if self.message != SAFE_ERROR_MESSAGES[self.code]:
            raise ValueError("Normalized error message must use the safe contract text")
        if self.retry_hint_ms is not None and self.retry_hint_ms < 0:
            raise ValueError("Retry hint cannot be negative")


class ProviderError(Exception):
    """Provider failure with explicit retry and failover decisions."""

    def __init__(
        self,
        error: NormalizedError,
        *,
        retry_allowed: bool,
        failover_allowed: bool,
    ) -> None:
        """Initialize a normalized provider failure."""
        _require_instance(error, NormalizedError, "normalized provider error")
        super().__init__(error.message)
        if error.retry_hint_ms is not None and not retry_allowed:
            raise ValueError("A retry hint requires retry_allowed")
        self.error = error
        self.retry_allowed = retry_allowed
        self.failover_allowed = failover_allowed


def safe_provider_error_code(error: object) -> ErrorCode | None:
    """Read only an exact normalized error without invoking forged properties."""
    if type(error) is not ProviderError:
        return None
    state = object.__getattribute__(error, "__dict__")
    normalized = state.get("error")
    if type(normalized) is not NormalizedError:
        return None
    try:
        raw_code = object.__getattribute__(normalized, "code")
    except AttributeError:
        return None
    return raw_code if type(raw_code) is ErrorCode else None


type ProviderResult = (
    TextGenerationResult
    | ConnectionValidationResult
    | ModelCatalog
    | HealthCheckResult
    | CapabilityRecord
)
type StreamEvent = StreamDelta | StreamCompleted


def _validate_tool_continuation(
    messages: tuple[Message, ...], exposed_tools: Mapping[str, ToolDefinition]
) -> None:
    pending: dict[str, str] = {}
    seen: set[str] = set()
    for message in messages:
        if message.role is MessageRole.ASSISTANT:
            for call in message.tool_calls:
                tool = exposed_tools.get(call.name)
                if tool is None:
                    raise ValueError(
                        "Historical assistant tool call was not exposed by the request"
                    )
                validate_schema_value(tool.parameters, call.arguments)
                if call.id in seen:
                    raise ValueError("Tool call IDs must be unique across the request")
                seen.add(call.id)
                pending[call.id] = call.name
        elif message.role is MessageRole.TOOL:
            tool_call_id = message.tool_call_id
            if tool_call_id not in pending:
                raise ValueError(
                    "Tool-result message references an unknown tool-call ID"
                )
            del pending[tool_call_id]
    if pending:
        raise ValueError(
            "Every assistant tool call requires one correlated tool result"
        )


EMPTY_REQUEST = ProviderRequest()


class Provider(Protocol):
    """Provider contract implemented by offline and future live adapters."""

    async def validate_connection(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ConnectionValidationResult:
        """Validate a provider connection without claiming model capabilities."""
        ...

    async def discover_capabilities(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> CapabilityRecord:
        """Return capability states supported by evidence."""
        ...

    async def discover_models(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ModelCatalog:
        """Return discovered model identities without inferring capabilities."""
        ...

    async def check_health(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> HealthCheckResult:
        """Return a successful health observation or raise a normalized error."""
        ...

    async def generate(self, request: ProviderRequest) -> TextGenerationResult:
        """Return one normalized, non-streaming response."""
        ...

    def stream(self, request: ProviderRequest) -> AsyncIterator[StreamEvent]:
        """Yield normalized stream events without performing side effects."""
        ...


def _freeze_mapping(value: Mapping[str, object]) -> Mapping[str, object]:
    return MappingProxyType({key: _freeze_value(item) for key, item in value.items()})


def _freeze_value(value: object) -> object:
    if isinstance(value, Mapping):
        return _freeze_mapping(value)
    if isinstance(value, list | tuple):
        return tuple(_freeze_value(item) for item in value)
    if isinstance(value, set | frozenset):
        return frozenset(_freeze_value(item) for item in value)
    return value


def _validate_identifier(value: str, label: str) -> None:
    if _IDENTIFIER_PATTERN.fullmatch(value) is None:
        raise ValueError(f"{label.capitalize()} has an invalid format")


def _require_instance(value: object, expected: type, label: str) -> None:
    if not isinstance(value, expected):
        raise TypeError(f"{label.capitalize()} must use {expected.__name__}")


def validate_schema_value(schema: Mapping[str, object], value: object) -> None:
    """Validate one value against the deliberately small internal schema dialect."""
    _validate_schema_value(schema, value, "value")


def validate_generation_result(
    request: ProviderRequest, result: TextGenerationResult
) -> None:
    """Validate provider output against only the tools and schema in its request."""
    exposed_tools = {tool.name: tool for tool in request.tools}
    for call in result.tool_calls:
        tool = exposed_tools.get(call.name)
        if tool is None:
            raise ValueError("Provider tool call was not exposed by the request")
        validate_schema_value(tool.parameters, call.arguments)
    if request.output_schema is None:
        if result.structured_output is not None:
            raise ValueError("Provider returned unrequested structured output")
    else:
        if result.structured_output is None:
            raise ValueError("Provider omitted requested structured output")
        validate_schema_value(request.output_schema.schema, result.structured_output)


def _validate_schema(schema: Mapping[str, object], label: str) -> None:
    if not isinstance(schema, Mapping):
        raise TypeError(f"{label.capitalize()} must be a mapping")
    allowed = {
        "type",
        "properties",
        "required",
        "additionalProperties",
        "items",
        "enum",
    }
    unknown = set(schema) - allowed
    if unknown:
        raise ValueError(f"{label.capitalize()} contains unsupported keywords")
    schema_type = schema.get("type")
    if schema_type not in {"object", "array", "string", "integer", "number", "boolean"}:
        raise ValueError(f"{label.capitalize()} has an unsupported type")
    if "enum" in schema:
        enum_values = schema["enum"]
        if not isinstance(enum_values, list | tuple) or not enum_values:
            raise ValueError(f"{label.capitalize()} enum must be a nonempty sequence")
    if schema_type == "object":
        properties = schema.get("properties")
        if not isinstance(properties, Mapping):
            raise ValueError(f"{label.capitalize()} object requires properties")
        if schema.get("additionalProperties") is not False:
            raise ValueError(
                f"{label.capitalize()} object must reject additional properties"
            )
        required = schema.get("required", ())
        if not isinstance(required, list | tuple) or any(
            not isinstance(item, str) for item in required
        ):
            raise ValueError(f"{label.capitalize()} required must be a string sequence")
        if len(required) != len(set(required)) or not set(required) <= set(properties):
            raise ValueError(f"{label.capitalize()} required fields are invalid")
        for name, child in properties.items():
            if not isinstance(name, str) or not isinstance(child, Mapping):
                raise ValueError(f"{label.capitalize()} properties are invalid")
            _validate_schema(child, f"{label} property")
    elif schema_type == "array":
        items = schema.get("items")
        if not isinstance(items, Mapping):
            raise ValueError(f"{label.capitalize()} array requires an item schema")
        _validate_schema(items, f"{label} item")
    elif any(
        key in schema
        for key in ("properties", "required", "additionalProperties", "items")
    ):
        raise ValueError(
            f"{label.capitalize()} has keywords incompatible with its type"
        )


def _validate_schema_value(
    schema: Mapping[str, object], value: object, label: str
) -> None:
    _validate_schema(schema, f"{label} schema")
    schema_type = schema["type"]
    valid_type = {
        "object": lambda item: isinstance(item, Mapping),
        "array": lambda item: isinstance(item, list | tuple),
        "string": lambda item: isinstance(item, str),
        "integer": lambda item: isinstance(item, int) and not isinstance(item, bool),
        "number": lambda item: (
            isinstance(item, int | float) and not isinstance(item, bool)
        ),
        "boolean": lambda item: isinstance(item, bool),
    }[schema_type]
    if not valid_type(value):
        raise ValueError(f"{label.capitalize()} has the wrong type")
    if "enum" in schema and value not in schema["enum"]:
        raise ValueError(f"{label.capitalize()} is not an allowed enum value")
    if schema_type == "object":
        mapping_value = cast(Mapping[str, object], value)
        properties = cast(Mapping[str, Mapping[str, object]], schema["properties"])
        required = cast(list[str] | tuple[str, ...], schema.get("required", ()))
        missing = set(required) - set(mapping_value)
        extra = set(mapping_value) - set(properties)
        if missing:
            raise ValueError(f"{label.capitalize()} is missing required fields")
        if extra:
            raise ValueError(f"{label.capitalize()} has additional fields")
        for name, item in mapping_value.items():
            child = properties[name]
            _validate_schema_value(child, item, f"{label} field {name}")
    elif schema_type == "array":
        sequence_value = cast(list[object] | tuple[object, ...], value)
        items = cast(Mapping[str, object], schema["items"])
        for item in sequence_value:
            _validate_schema_value(items, item, f"{label} item")
