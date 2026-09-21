"""Azure OpenAI v1 adapter; account/deployment acceptance requires a live probe.

The model catalogue authenticates the endpoint, not a deployment alias. No
generation capability is inferred, and this adapter is excluded from local-only
chat, Assist and workflow routes. No Foundry project/agent APIs are used.
"""

from __future__ import annotations

import re
from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass, field, fields, is_dataclass
from typing import Final, cast

import aiohttp
import voluptuous as vol
from homeassistant.helpers.selector import (
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)
from yarl import URL

from ..provider_entry import ProviderConfigMode
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

PROVIDER_TYPE: Final = "azure_openai_v1"
DISPLAY_NAME: Final = "Azure OpenAI v1 (cloud; endpoint test only)"
CONF_BASE_URL: Final = "base_url"
CONF_API_KEY: Final = "api_key"  # noqa: S105 -- configuration key.
CONF_DEPLOYMENT_ID: Final = "deployment_id"
_CONFIG_KEYS: Final = {CONF_BASE_URL, CONF_API_KEY, CONF_DEPLOYMENT_ID}
_HOST_PATTERN: Final = re.compile(
    r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:openai\.azure\.com|services\.ai\.azure\.com)"
)


@dataclass(frozen=True, slots=True)
class AzureOpenAIV1Config:
    """Validated account configuration kept exclusively in the backend."""

    base_url: str
    api_key: str = field(repr=False)
    deployment_id: str


def parse_azure_openai_v1_config(config: Mapping[str, object]) -> AzureOpenAIV1Config:
    """Accept only public Azure HTTPS origins and an explicit deployment alias."""
    if set(config) != _CONFIG_KEYS:
        raise ValueError("Azure configuration fields are invalid")
    base_url, api_key, deployment_id = (
        config[key] for key in (CONF_BASE_URL, CONF_API_KEY, CONF_DEPLOYMENT_ID)
    )
    if any(type(value) is not str for value in (base_url, api_key, deployment_id)):
        raise ValueError("Azure configuration values must be strings")
    base_url = cast(str, base_url)
    api_key = cast(str, api_key)
    deployment_id = cast(str, deployment_id)
    if (
        not base_url.strip()
        or len(base_url) > 2048
        or not base_url.isascii()
        or any(char.isspace() for char in base_url.strip())
        or any(char in base_url for char in "%?#\\")
    ):
        raise ValueError("Azure endpoint is invalid")
    try:
        url = URL(base_url.strip())
        valid = (
            url.scheme == "https"
            and url.raw_host is not None
            and _HOST_PATTERN.fullmatch(url.raw_host) is not None
            and url.port == 443
            and url.user is None
            and url.password is None
            and not url.query_string
            and not url.fragment
            and url.raw_path in {"", "/", "/openai/v1", "/openai/v1/"}
        )
    except TypeError, ValueError:
        raise ValueError("Azure endpoint is invalid") from None
    if not valid:
        raise ValueError("Azure endpoint is invalid")
    api_key, deployment_id = api_key.strip(), deployment_id.strip()
    if (
        not api_key
        or len(api_key) > 4096
        or not api_key.isascii()
        or not api_key.isprintable()
        or any(char.isspace() for char in api_key)
    ):
        raise ValueError("Azure API key is invalid")
    if not deployment_id or len(deployment_id) > 512 or not deployment_id.isprintable():
        raise ValueError("Azure deployment alias is invalid")
    if api_key in deployment_id or api_key in str(url):
        raise ValueError("Azure configuration contains credential material")
    return AzureOpenAIV1Config(str(url.with_path("/openai/v1")), api_key, deployment_id)


@dataclass(frozen=True, slots=True)
class AzureOpenAIV1ProviderEntryAdapter:
    """Configure Azure without enabling disclosure through local-only routes."""

    session: aiohttp.ClientSession = field(repr=False)
    provider_type: str = PROVIDER_TYPE
    display_name: str = DISPLAY_NAME
    chat_destination: None = None

    def config_schema(self, mode: ProviderConfigMode) -> vol.Schema:
        """Return empty password controls, never existing secret values."""
        fields = {
            vol.Required(CONF_API_KEY): TextSelector(
                TextSelectorConfig(type=TextSelectorType.PASSWORD)
            )
        }
        if mode is not ProviderConfigMode.REAUTH:
            fields[vol.Required(CONF_BASE_URL)] = TextSelector(
                TextSelectorConfig(type=TextSelectorType.URL)
            )
            fields[vol.Required(CONF_DEPLOYMENT_ID)] = TextSelector(
                TextSelectorConfig(type=TextSelectorType.TEXT)
            )
        return vol.Schema(fields)

    def normalize_config(
        self,
        mode: ProviderConfigMode,
        current_config: Mapping[str, object] | None,
        user_input: Mapping[str, object],
    ) -> Mapping[str, object]:
        """Validate complete setup/reconfiguration or a key-only reauthentication."""
        if mode is ProviderConfigMode.REAUTH:
            if (
                current_config is None
                or set(current_config) != _CONFIG_KEYS
                or set(user_input) != {CONF_API_KEY}
            ):
                raise ValueError("Azure reauthentication input is invalid")
            candidate = {**current_config, **user_input}
        else:
            candidate = dict(user_input)
        config = parse_azure_openai_v1_config(candidate)
        return {
            CONF_BASE_URL: config.base_url,
            CONF_API_KEY: config.api_key,
            CONF_DEPLOYMENT_ID: config.deployment_id,
        }

    async def async_create_provider(
        self, config: Mapping[str, object]
    ) -> AzureOpenAIV1Provider:
        """Reuse Home Assistant's shared asynchronous session."""
        return AzureOpenAIV1Provider(self.session, parse_azure_openai_v1_config(config))


@dataclass(frozen=True, slots=True)
class AzureOpenAIV1Provider:
    """Bounded nonstreaming Azure contract implementation with no automatic retries."""

    session: aiohttp.ClientSession = field(repr=False)
    config: AzureOpenAIV1Config = field(repr=False)

    async def validate_connection(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ConnectionValidationResult:
        """Validate endpoint authentication only; never assert deployment readiness."""
        _require_empty_probe_request(request)
        await self.discover_models()
        return ConnectionValidationResult(reachable=True, authenticated=True)

    async def discover_models(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> ModelCatalog:
        """Return service-reported model offerings, which are not deployment aliases."""
        _require_empty_probe_request(request)
        payload = await self._request("GET", "/models")
        data = payload.get("data")
        if type(data) is not list:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        models = []
        for item in data:
            if (
                type(item) is not dict
                or type(item.get("id")) is not str
                or not item["id"].strip()
            ):
                _raise_provider_error(ErrorCode.INVALID_RESPONSE)
            models.append(ProviderModel(id=item["id"], display_name=item["id"]))
        try:
            return ModelCatalog(models=tuple(models))
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)

    async def discover_capabilities(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> CapabilityRecord:
        """Keep generation capabilities unknown until separately probed and reviewed."""
        _require_empty_probe_request(request)
        return CapabilityRecord(
            text_generation=CapabilityState.UNKNOWN,
            model_discovery=CapabilityState.SUPPORTED,
            streaming=CapabilityState.UNKNOWN,
            structured_output=CapabilityState.UNKNOWN,
            tool_calling=CapabilityState.UNKNOWN,
            usage=CapabilityState.UNKNOWN,
        )

    async def check_health(
        self, request: ProviderRequest = EMPTY_REQUEST
    ) -> HealthCheckResult:
        """Report authenticated endpoint health only, not successful inference."""
        await self.validate_connection(request)
        return HealthCheckResult(state=ProviderHealthState.HEALTHY)

    async def generate(self, request: ProviderRequest) -> TextGenerationResult:
        """Use the configured deployment name in a v1 chat completion request."""
        if _contains_secret(request, self.config.api_key):
            _raise_provider_error(ErrorCode.UNSUPPORTED)
        body = _build_chat_request(self.config.deployment_id, request)
        body["max_completion_tokens"] = 2048
        body["store"] = False
        if _contains_secret(body, self.config.api_key):
            _raise_provider_error(ErrorCode.UNSUPPORTED)
        payload = await self._request("POST", "/chat/completions", body)
        result = _parse_chat_response(payload, request)
        if _contains_secret(result, self.config.api_key):
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        try:
            validate_generation_result(request, result)
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        return result

    async def stream(self, request: ProviderRequest) -> AsyncIterator[StreamEvent]:
        """Fail closed until streaming is implemented and validated separately."""
        del request
        _raise_provider_error(ErrorCode.UNSUPPORTED)
        if False:  # pragma: no cover
            yield

    async def _request(
        self, method: str, path: str, body: Mapping[str, object] | None = None
    ) -> dict[str, object]:
        payload = await async_request_json(
            self.session,
            self.config.base_url,
            {"api-key": self.config.api_key},
            method,
            path,
            json_body=body,
        )
        if _contains_secret(payload, self.config.api_key):
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        return payload


def _contains_secret(value: object, secret: str) -> bool:
    if is_dataclass(value) and not isinstance(value, type):
        return any(
            _contains_secret(getattr(value, item.name), secret)
            for item in fields(value)
        )
    if isinstance(value, str):
        return secret in value
    if isinstance(value, Mapping):
        return any(
            _contains_secret(key, secret) or _contains_secret(item, secret)
            for key, item in value.items()
        )
    if isinstance(value, (tuple, list)):
        return any(_contains_secret(item, secret) for item in value)
    return False
