"""Synthetic provider-entry adapters for Home Assistant lifecycle tests."""

from __future__ import annotations

from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass, field
from types import SimpleNamespace

import voluptuous as vol

from custom_components.ai_orchestrator.provider_entry import ProviderConfigMode
from custom_components.ai_orchestrator.providers.contract import (
    EMPTY_REQUEST,
    CapabilityRecord,
    CapabilityState,
    ConnectionValidationResult,
    ErrorCode,
    HealthCheckResult,
    ModelCatalog,
    NormalizedError,
    ProviderError,
    ProviderHealthState,
    ProviderRequest,
    StreamEvent,
    TextGenerationResult,
)

SYNTHETIC_PROVIDER_TYPE = "synthetic_provider"
SYNTHETIC_CONFIG_FIELD = "synthetic_credential"


@dataclass(slots=True)
class SyntheticLifecycleProvider:
    """Provider contract implementation limited to lifecycle validation."""

    error: BaseException | None = None

    async def validate_connection(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ConnectionValidationResult:
        del request
        if self.error is not None:
            raise self.error
        return ConnectionValidationResult(reachable=True, authenticated=True)

    async def discover_capabilities(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> CapabilityRecord:
        del request
        return CapabilityRecord(
            text_generation=CapabilityState.UNKNOWN,
            model_discovery=CapabilityState.UNKNOWN,
            streaming=CapabilityState.UNKNOWN,
            structured_output=CapabilityState.UNKNOWN,
            tool_calling=CapabilityState.UNKNOWN,
            usage=CapabilityState.UNKNOWN,
        )

    async def discover_models(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ModelCatalog:
        del request
        return ModelCatalog(models=())

    async def check_health(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> HealthCheckResult:
        del request
        return HealthCheckResult(state=ProviderHealthState.HEALTHY)

    async def generate(self, request: ProviderRequest) -> TextGenerationResult:
        del request
        return TextGenerationResult(text="Synthetic lifecycle provider.")

    async def stream(self, request: ProviderRequest) -> AsyncIterator[StreamEvent]:
        del request
        if False:
            yield


@dataclass(slots=True)
class SyntheticProviderEntryAdapter:
    """Adapter whose configuration and outcomes contain synthetic data only."""

    provider_type: str = SYNTHETIC_PROVIDER_TYPE
    display_name: str = "Synthetic Provider"
    error: BaseException | None = None
    schema_error: BaseException | None = None
    mutate_config_on_create: bool = False
    normalized_configs: list[dict[str, object]] = field(default_factory=list)
    created_config_snapshots: list[dict[str, object]] = field(default_factory=list)

    def config_schema(
        self,
        mode: ProviderConfigMode,
    ) -> vol.Schema:
        del mode
        if self.schema_error is not None:
            raise self.schema_error
        return vol.Schema({vol.Required(SYNTHETIC_CONFIG_FIELD): str})

    def normalize_config(
        self,
        mode: ProviderConfigMode,
        current_config: Mapping[str, object] | None,
        user_input: Mapping[str, object],
    ) -> Mapping[str, object]:
        if mode is ProviderConfigMode.REAUTH and current_config is not None:
            config = dict(current_config)
            config.update(user_input)
        else:
            config = dict(user_input)
        self.normalized_configs.append(config)
        return config

    async def async_create_provider(
        self, config: Mapping[str, object]
    ) -> SyntheticLifecycleProvider:
        if self.mutate_config_on_create and isinstance(config, dict):
            config[SYNTHETIC_CONFIG_FIELD] = "synthetic-adapter-mutation"
        self.created_config_snapshots.append(dict(config))
        return SyntheticLifecycleProvider(error=self.error)


def provider_error(error: ProviderError) -> BaseException:
    """Retain a narrow return type for parameterized lifecycle outcomes."""
    return error


class ExplodingHashCode:
    """Malformed error code that raises if lifecycle code tries to hash it."""

    def __init__(self, marker: str) -> None:
        self.marker = marker

    def __hash__(self) -> int:
        raise RuntimeError(self.marker)


class TypeSpoofingHashCode(ExplodingHashCode):
    """Malformed code that spoofs isinstance before raising from hashing."""

    @property
    def __class__(self) -> type[ErrorCode]:
        return ErrorCode


class UnhashableCode(ExplodingHashCode):
    """Malformed error code with hashing explicitly unavailable."""

    __hash__ = None  # type: ignore[assignment]


class ExplodingCodeAccess:
    """Malformed nested error whose code property must never be dispatched."""

    def __init__(self, marker: str) -> None:
        self.marker = marker

    @property
    def code(self) -> object:
        raise RuntimeError(self.marker)


def forged_provider_error(code: object, marker: str) -> ProviderError:
    """Bypass construction only to exercise a hostile adapter exception object."""
    return forged_provider_error_payload(
        SimpleNamespace(code=code, message=marker, retry_hint_ms=None), marker
    )


def forged_provider_error_payload(payload: object, marker: str) -> ProviderError:
    """Attach a hostile nested object without invoking ProviderError validation."""
    forged = ProviderError.__new__(ProviderError)
    Exception.__init__(forged, marker)
    forged.error = payload  # type: ignore[assignment]
    forged.retry_allowed = False
    forged.failover_allowed = False
    return forged


def forged_uninitialized_normalized_error(marker: str) -> ProviderError:
    """Attach an exact NormalizedError whose required slots were never initialized."""
    return forged_provider_error_payload(object.__new__(NormalizedError), marker)
