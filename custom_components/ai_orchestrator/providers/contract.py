"""Provider-neutral types used by adapters and deterministic test providers."""

from __future__ import annotations

from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass
from enum import StrEnum
from types import MappingProxyType
from typing import Protocol


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


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    """A typed tool schema; execution remains outside provider adapters."""

    name: str
    description: str
    parameters: Mapping[str, object]

    def __post_init__(self) -> None:
        """Detach and deeply freeze the caller-owned parameter schema."""
        object.__setattr__(self, "parameters", _freeze_mapping(self.parameters))


@dataclass(frozen=True, slots=True)
class ProviderRequest:
    """Provider-neutral request matched exactly by the fake provider."""

    messages: tuple[Message, ...] = ()
    tools: tuple[ToolDefinition, ...] = ()


@dataclass(frozen=True, slots=True)
class Usage:
    """Normalized usage reported only when fixture or provider evidence supplies it."""

    input_tokens: int
    output_tokens: int


@dataclass(frozen=True, slots=True)
class ToolCall:
    """A provider-requested tool call; this type does not execute it."""

    id: str
    name: str
    arguments: Mapping[str, object]

    def __post_init__(self) -> None:
        """Detach and deeply freeze the caller-owned argument object."""
        object.__setattr__(self, "arguments", _freeze_mapping(self.arguments))


@dataclass(frozen=True, slots=True)
class TextGenerationResult:
    """Normalized visible provider response."""

    text: str
    tool_calls: tuple[ToolCall, ...] = ()
    usage: Usage | None = None


@dataclass(frozen=True, slots=True)
class ConnectionValidationResult:
    """Synthetic connection validation outcome."""

    reachable: bool


@dataclass(frozen=True, slots=True)
class CapabilityRecord:
    """Explicit capability states; an unproven capability remains unknown."""

    streaming: CapabilityState
    structured_output: CapabilityState
    tool_calling: CapabilityState
    usage: CapabilityState


@dataclass(frozen=True, slots=True)
class StreamDelta:
    """One deterministic visible-text stream delta."""

    sequence: int
    text: str


@dataclass(frozen=True, slots=True)
class StreamCompleted:
    """Deterministic terminal stream event."""

    sequence: int
    finish_reason: FinishReason
    usage: Usage | None = None


@dataclass(frozen=True, slots=True)
class NormalizedError:
    """Safe provider error representation."""

    code: ErrorCode
    message: str
    retry_hint_ms: int | None = None

    def __post_init__(self) -> None:
        """Reject unusable errors at the provider-neutral boundary."""
        if not self.message.strip():
            raise ValueError("Normalized error message cannot be empty")


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
        self.error = error
        self.retry_allowed = retry_allowed
        self.failover_allowed = failover_allowed


type ProviderResult = (
    TextGenerationResult | ConnectionValidationResult | CapabilityRecord
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
