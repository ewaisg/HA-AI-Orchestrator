"""Authenticated LM Studio provider over its OpenAI-compatible HTTP API."""

from __future__ import annotations

import ipaddress
from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass, field
from typing import Final

import aiohttp
import voluptuous as vol
from homeassistant.helpers.selector import (
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)
from yarl import URL

from ..provider_entry import ChatDestination, ProviderConfigMode
from .contract import (
    EMPTY_REQUEST,
    CapabilityRecord,
    CapabilityState,
    ConnectionValidationResult,
    ErrorCode,
    HealthCheckResult,
    ModelCatalog,
    ProviderHealthState,
    ProviderModel,
    ProviderRequest,
    StreamEvent,
    TextGenerationResult,
    validate_generation_result,
)
from .openai_compatible import (
    _build_chat_request,
    _parse_chat_response,
    _raise_provider_error,
    _require_empty_probe_request,
    async_request_json,
)

PROVIDER_TYPE: Final = "lm_studio"
DISPLAY_NAME: Final = "LM Studio"

CONF_BASE_URL: Final = "base_url"
CONF_API_TOKEN: Final = "api_token"  # noqa: S105 -- configuration key, not a token.
CONF_MODEL_ID: Final = "model_id"

_CONFIG_KEYS: Final = {CONF_BASE_URL, CONF_API_TOKEN, CONF_MODEL_ID}
_ALLOWED_LAN_NETWORKS: Final = (
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("fc00::/7"),
)


@dataclass(frozen=True, slots=True)
class LMStudioConfig:
    """Validated backend-only LM Studio configuration."""

    base_url: str
    api_token: str = field(repr=False)
    model_id: str


@dataclass(frozen=True, slots=True)
class LMStudioProviderEntryAdapter:
    """Home Assistant config-entry adapter for LM Studio."""

    session: aiohttp.ClientSession = field(repr=False)
    provider_type: str = PROVIDER_TYPE
    display_name: str = DISPLAY_NAME
    chat_destination: ChatDestination = ChatDestination.LOCAL

    def config_schema(self, mode: ProviderConfigMode) -> vol.Schema:
        """Return fields without receiving or exposing stored values."""
        token_field = TextSelector(TextSelectorConfig(type=TextSelectorType.PASSWORD))
        if mode is ProviderConfigMode.REAUTH:
            return vol.Schema({vol.Required(CONF_API_TOKEN): token_field})
        return vol.Schema(
            {
                vol.Required(CONF_BASE_URL): TextSelector(
                    TextSelectorConfig(type=TextSelectorType.URL)
                ),
                vol.Required(CONF_API_TOKEN): token_field,
                vol.Required(CONF_MODEL_ID): TextSelector(
                    TextSelectorConfig(type=TextSelectorType.TEXT)
                ),
            }
        )

    def normalize_config(
        self,
        mode: ProviderConfigMode,
        current_config: Mapping[str, object] | None,
        user_input: Mapping[str, object],
    ) -> Mapping[str, object]:
        """Return one complete canonical config without echoing stored secrets."""
        if mode is ProviderConfigMode.REAUTH:
            if current_config is None or set(current_config) != _CONFIG_KEYS:
                raise ValueError("Current LM Studio configuration is invalid")
            candidate = dict(current_config)
            if set(user_input) != {CONF_API_TOKEN}:
                raise ValueError("LM Studio reauthentication input is invalid")
            candidate[CONF_API_TOKEN] = user_input[CONF_API_TOKEN]
        else:
            if set(user_input) != _CONFIG_KEYS:
                raise ValueError("LM Studio configuration fields are invalid")
            candidate = dict(user_input)

        config = parse_lm_studio_config(candidate)
        return {
            CONF_BASE_URL: config.base_url,
            CONF_API_TOKEN: config.api_token,
            CONF_MODEL_ID: config.model_id,
        }

    async def async_create_provider(
        self, config: Mapping[str, object]
    ) -> LMStudioProvider:
        """Create one provider that reuses Home Assistant's shared session."""
        return LMStudioProvider(self.session, parse_lm_studio_config(config))


@dataclass(frozen=True, slots=True)
class LMStudioProvider:
    """Provider-contract implementation for one authenticated LM Studio server."""

    session: aiohttp.ClientSession = field(repr=False)
    config: LMStudioConfig = field(repr=False)

    async def validate_connection(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ConnectionValidationResult:
        """Validate authentication, model discovery, and configured model identity."""
        _require_empty_probe_request(request)
        catalog = await self.discover_models()
        if self.config.model_id not in {model.id for model in catalog.models}:
            _raise_provider_error(ErrorCode.NOT_FOUND)
        return ConnectionValidationResult(reachable=True, authenticated=True)

    async def discover_capabilities(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> CapabilityRecord:
        """Claim only model discovery; generation features require live probes."""
        _require_empty_probe_request(request)
        return CapabilityRecord(
            text_generation=CapabilityState.UNKNOWN,
            model_discovery=CapabilityState.SUPPORTED,
            streaming=CapabilityState.UNKNOWN,
            structured_output=CapabilityState.UNKNOWN,
            tool_calling=CapabilityState.UNKNOWN,
            usage=CapabilityState.UNKNOWN,
        )

    async def discover_models(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ModelCatalog:
        """Read the server model catalog without inferring model capabilities."""
        _require_empty_probe_request(request)
        payload = await self._async_request_json("GET", "/models")
        data = payload.get("data")
        if type(data) is not list:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        models: list[ProviderModel] = []
        for item in data:
            if type(item) is not dict:
                _raise_provider_error(ErrorCode.INVALID_RESPONSE)
            model_id = item.get("id")
            if type(model_id) is not str or not model_id.strip():
                _raise_provider_error(ErrorCode.INVALID_RESPONSE)
            models.append(ProviderModel(id=model_id, display_name=model_id))
        try:
            return ModelCatalog(models=tuple(models))
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)

    async def check_health(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> HealthCheckResult:
        """Treat a validated configured-model lookup as a healthy observation."""
        await self.validate_connection(request)
        return HealthCheckResult(state=ProviderHealthState.HEALTHY)

    async def generate(self, request: ProviderRequest) -> TextGenerationResult:
        """Generate one bounded response without executing requested tools."""
        if any(
            self.config.api_token in message.content for message in request.messages
        ):
            _raise_provider_error(ErrorCode.UNSUPPORTED)
        body = _build_chat_request(self.config.model_id, request)
        payload = await self._async_request_json(
            "POST", "/chat/completions", json_body=body
        )
        result = _parse_chat_response(payload, request)
        if self.config.api_token in result.text:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        try:
            validate_generation_result(request, result)
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        return result

    async def stream(self, request: ProviderRequest) -> AsyncIterator[StreamEvent]:
        """Fail closed until streaming is separately implemented and proven."""
        del request
        _raise_provider_error(ErrorCode.UNSUPPORTED)
        if False:  # pragma: no cover - keeps the protocol's async-iterator shape.
            yield

    async def _async_request_json(
        self,
        method: str,
        path: str,
        *,
        json_body: Mapping[str, object] | None = None,
    ) -> dict[str, object]:
        return await async_request_json(
            self.session,
            self.config.base_url,
            {"Authorization": f"Bearer {self.config.api_token}"},
            method,
            path,
            json_body=json_body,
        )


def parse_lm_studio_config(config: Mapping[str, object]) -> LMStudioConfig:
    """Validate the exact stored config shape and return backend-only values."""
    if set(config) != _CONFIG_KEYS:
        raise ValueError("LM Studio configuration fields are invalid")
    base_url = config[CONF_BASE_URL]
    api_token = config[CONF_API_TOKEN]
    model_id = config[CONF_MODEL_ID]
    if type(base_url) is not str:
        raise TypeError("LM Studio base URL must be a string")
    if type(api_token) is not str:
        raise TypeError("LM Studio API token must be a string")
    if type(model_id) is not str:
        raise TypeError("LM Studio model ID must be a string")
    normalized_url = _normalize_base_url(base_url)
    normalized_token = api_token.strip()
    normalized_model = model_id.strip()
    if (
        not normalized_token
        or len(normalized_token) > 4096
        or not normalized_token.isprintable()
        or normalized_token.lower().startswith("bearer ")
    ):
        raise ValueError("Enter the API token value without an authorization scheme")
    if any(character.isspace() for character in normalized_token):
        raise ValueError("LM Studio API token cannot contain whitespace")
    if not normalized_model or len(normalized_model) > 512:
        raise ValueError("LM Studio model ID is invalid")
    return LMStudioConfig(
        base_url=normalized_url,
        api_token=normalized_token,
        model_id=normalized_model,
    )


def _normalize_base_url(value: str) -> str:
    stripped = value.strip()
    if not stripped or len(stripped) > 2048:
        raise ValueError("LM Studio base URL is invalid")
    try:
        url = URL(stripped)
        port = url.port
    except TypeError, ValueError:
        raise ValueError("LM Studio base URL is invalid") from None
    if (
        not url.is_absolute()
        or url.scheme not in {"http", "https"}
        or url.raw_host is None
        or url.user is not None
        or url.password is not None
        or url.query_string
        or url.fragment
        or url.path not in {"", "/", "/v1", "/v1/"}
    ):
        raise ValueError("LM Studio base URL is invalid")
    try:
        address = ipaddress.ip_address(url.raw_host)
    except ValueError:
        raise ValueError(
            "LM Studio base URL must use a private LAN IP address"
        ) from None
    if not any(address in network for network in _ALLOWED_LAN_NETWORKS):
        raise ValueError("LM Studio base URL must use a private LAN IP address")
    if port is not None and not 1 <= port <= 65535:
        raise ValueError("LM Studio base URL is invalid")
    return str(url.with_path("/v1").with_query(None).with_fragment(None)).rstrip("/")
