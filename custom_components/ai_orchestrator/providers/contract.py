"""Provider-neutral types used by adapters and deterministic test providers."""

from __future__ import annotations

import re
from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass
from enum import StrEnum
from types import MappingProxyType
from typing import Final, Protocol

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


@dataclass(frozen=True, slots=True)
class Message:
    """One provider-neutral chat message."""

    role: MessageRole
    content: str

    def __post_init__(self) -> None:
        """Reject non-normalized message data."""
        _require_instance(self.role, MessageRole, "message role")
        _require_instance(self.content, str, "message content")


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
        object.__setattr__(self, "parameters", _freeze_mapping(self.parameters))


@dataclass(frozen=True, slots=True)
class ProviderRequest:
    """Provider-neutral request matched exactly by the fake provider."""

    messages: tuple[Message, ...] = ()
    tools: tuple[ToolDefinition, ...] = ()

    def __post_init__(self) -> None:
        """Detach caller-owned request sequences."""
        object.__setattr__(self, "messages", tuple(self.messages))
        object.__setattr__(self, "tools", tuple(self.tools))
        if any(not isinstance(message, Message) for message in self.messages):
            raise TypeError("Provider request messages must use Message")
        if any(not isinstance(tool, ToolDefinition) for tool in self.tools):
            raise TypeError("Provider request tools must use ToolDefinition")


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
        if not self.message.strip():
            raise ValueError("Normalized error message cannot be empty")
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
        super().__init__(error.message)
        if error.retry_hint_ms is not None and not retry_allowed:
            raise ValueError("A retry hint requires retry_allowed")
        self.error = error
        self.retry_allowed = retry_allowed
        self.failover_allowed = failover_allowed


type ProviderResult = (
    TextGenerationResult
    | ConnectionValidationResult
    | ModelCatalog
    | HealthCheckResult
    | CapabilityRecord
)
type StreamEvent = StreamDelta | StreamCompleted
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
