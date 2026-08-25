"""Authenticated LM Studio provider over its OpenAI-compatible HTTP API."""

from __future__ import annotations

import asyncio
import ipaddress
import json
import math
import ssl
from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass, field
from typing import Final, NoReturn, cast

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
    SAFE_ERROR_MESSAGES,
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
    StreamEvent,
    TextGenerationResult,
    ToolCall,
    Usage,
    validate_generation_result,
)

PROVIDER_TYPE: Final = "lm_studio"
DISPLAY_NAME: Final = "LM Studio"

CONF_BASE_URL: Final = "base_url"
CONF_API_TOKEN: Final = "api_token"  # noqa: S105 -- configuration key, not a token.
CONF_MODEL_ID: Final = "model_id"

_CONFIG_KEYS: Final = {CONF_BASE_URL, CONF_API_TOKEN, CONF_MODEL_ID}
_REQUEST_TIMEOUT_SECONDS: Final = 60
_MAX_RESPONSE_BYTES: Final = 2 * 1024 * 1024
_READ_CHUNK_BYTES: Final = 64 * 1024
_MAX_JSON_DEPTH: Final = 64
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
        body = _build_chat_request(self.config.model_id, request)
        payload = await self._async_request_json(
            "POST", "/chat/completions", json_body=body
        )
        result = _parse_chat_response(payload, request)
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
        url = f"{self.config.base_url}{path}"
        headers = {"Authorization": f"Bearer {self.config.api_token}"}
        try:
            async with asyncio.timeout(_REQUEST_TIMEOUT_SECONDS):
                async with self.session.request(
                    method,
                    url,
                    headers=headers,
                    json=json_body,
                    allow_redirects=False,
                ) as response:
                    if response.status != 200:
                        _raise_for_http_status(response.status)
                    raw = await _async_read_bounded(response.content)
        except asyncio.CancelledError:
            raise
        except ProviderError:
            raise
        except TimeoutError:
            _raise_provider_error(ErrorCode.TIMEOUT)
        except (
            aiohttp.ClientConnectorCertificateError,
            aiohttp.ClientSSLError,
            ssl.SSLError,
        ):
            _raise_provider_error(ErrorCode.TLS)
        except aiohttp.ClientConnectorDNSError:
            _raise_provider_error(ErrorCode.DNS)
        except aiohttp.ClientConnectionError, aiohttp.ServerDisconnectedError, OSError:
            _raise_provider_error(ErrorCode.CONNECTION)
        except aiohttp.ClientError:
            _raise_provider_error(ErrorCode.CONNECTION)

        try:
            decoded = _loads_json(raw)
        except UnicodeDecodeError, json.JSONDecodeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        if type(decoded) is not dict:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        return cast(dict[str, object], decoded)


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


async def _async_read_bounded(content: aiohttp.StreamReader) -> bytes:
    chunks: list[bytes] = []
    size = 0
    async for chunk in content.iter_chunked(_READ_CHUNK_BYTES):
        size += len(chunk)
        if size > _MAX_RESPONSE_BYTES:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        chunks.append(chunk)
    return b"".join(chunks)


def _require_empty_probe_request(request: ProviderRequest) -> None:
    if request != EMPTY_REQUEST:
        _raise_provider_error(ErrorCode.UNSUPPORTED)


def _raise_for_http_status(status: int) -> NoReturn:
    code = {
        401: ErrorCode.AUTHENTICATION,
        403: ErrorCode.AUTHORIZATION,
        404: ErrorCode.NOT_FOUND,
        408: ErrorCode.TIMEOUT,
        429: ErrorCode.RATE_LIMITED,
    }.get(status)
    if code is None:
        if 300 <= status < 400:
            code = ErrorCode.CONNECTION
        elif 500 <= status < 600:
            code = ErrorCode.PROVIDER_UNAVAILABLE
        else:
            code = ErrorCode.INVALID_RESPONSE
    _raise_provider_error(code)


def _raise_provider_error(code: ErrorCode) -> NoReturn:
    retry_allowed = code in {
        ErrorCode.CONNECTION,
        ErrorCode.DNS,
        ErrorCode.PROVIDER_UNAVAILABLE,
        ErrorCode.RATE_LIMITED,
        ErrorCode.TIMEOUT,
        ErrorCode.TLS,
    }
    raise ProviderError(
        NormalizedError(code=code, message=SAFE_ERROR_MESSAGES[code]),
        retry_allowed=retry_allowed,
        failover_allowed=False,
    )


def _build_chat_request(model_id: str, request: ProviderRequest) -> dict[str, object]:
    body: dict[str, object] = {
        "model": model_id,
        "messages": [_message_to_openai(message) for message in request.messages],
        "stream": False,
    }
    if request.tools:
        body["tools"] = [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": _to_json_value(tool.parameters),
                },
            }
            for tool in request.tools
        ]
    if request.output_schema is not None:
        body["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": request.output_schema.name,
                "strict": True,
                "schema": _to_json_value(request.output_schema.schema),
            },
        }
    return body


def _message_to_openai(message: Message) -> dict[str, object]:
    result: dict[str, object] = {
        "role": message.role.value,
        "content": message.content,
    }
    if message.role is MessageRole.ASSISTANT and message.tool_calls:
        result["tool_calls"] = [
            {
                "id": call.id,
                "type": "function",
                "function": {
                    "name": call.name,
                    "arguments": json.dumps(
                        _to_json_value(call.arguments), separators=(",", ":")
                    ),
                },
            }
            for call in message.tool_calls
        ]
    elif message.role is MessageRole.TOOL:
        result["tool_call_id"] = message.tool_call_id
    return result


def _parse_chat_response(
    payload: Mapping[str, object], request: ProviderRequest
) -> TextGenerationResult:
    choices = payload.get("choices")
    if type(choices) is not list or len(choices) != 1 or type(choices[0]) is not dict:
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    choice = choices[0]
    message = choice.get("message")
    if type(message) is not dict:
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    content = message.get("content")
    if content is None:
        content = ""
    if type(content) is not str:
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    tool_calls = _parse_tool_calls(message.get("tool_calls", []))
    _parse_finish_reason(choice.get("finish_reason"), bool(tool_calls))
    usage = _parse_usage(payload.get("usage"))
    structured_output = None
    if request.output_schema is not None:
        try:
            parsed_output = _loads_json(content)
        except json.JSONDecodeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        if type(parsed_output) is not dict:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        structured_output = parsed_output
    try:
        return TextGenerationResult(
            text=content,
            tool_calls=tool_calls,
            usage=usage,
            structured_output=structured_output,
        )
    except TypeError, ValueError:
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)


def _parse_tool_calls(value: object) -> tuple[ToolCall, ...]:
    if type(value) is not list:
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    parsed: list[ToolCall] = []
    for item in value:
        if type(item) is not dict or item.get("type") != "function":
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        call_id = item.get("id")
        function = item.get("function")
        if type(call_id) is not str or type(function) is not dict:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        name = function.get("name")
        arguments_text = function.get("arguments")
        if type(name) is not str or type(arguments_text) is not str:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        try:
            arguments = _loads_json(arguments_text)
        except json.JSONDecodeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        if type(arguments) is not dict:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
        try:
            parsed.append(ToolCall(id=call_id, name=name, arguments=arguments))
        except TypeError, ValueError:
            _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    return tuple(parsed)


def _parse_finish_reason(value: object, has_tool_calls: bool) -> FinishReason:
    mapped = (
        {
            "stop": FinishReason.STOP,
            "length": FinishReason.LENGTH,
            "tool_calls": FinishReason.TOOL_CALL,
            "content_filter": FinishReason.REFUSAL,
        }.get(value)
        if type(value) is str
        else None
    )
    if mapped is None or (has_tool_calls != (mapped is FinishReason.TOOL_CALL)):
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    return mapped


def _parse_usage(value: object) -> Usage | None:
    if value is None:
        return None
    if type(value) is not dict:
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    input_tokens = value.get("prompt_tokens")
    output_tokens = value.get("completion_tokens")
    if (
        type(input_tokens) is not int
        or type(output_tokens) is not int
        or input_tokens < 0
        or output_tokens < 0
    ):
        _raise_provider_error(ErrorCode.INVALID_RESPONSE)
    return Usage(input_tokens=input_tokens, output_tokens=output_tokens)


def _to_json_value(value: object) -> object:
    if isinstance(value, Mapping):
        return {cast(str, key): _to_json_value(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_to_json_value(item) for item in value]
    return value


def _loads_json(value: str | bytes) -> object:
    try:
        parsed = json.loads(
            value,
            parse_constant=_reject_json_constant,
            parse_float=_parse_json_float,
            object_pairs_hook=_reject_duplicate_json_keys,
        )
    except RecursionError:
        raise ValueError("JSON nesting is too deep") from None
    _validate_json_depth(parsed)
    return parsed


def _reject_json_constant(value: str) -> NoReturn:
    del value
    raise ValueError("Nonfinite JSON number")


def _parse_json_float(value: str) -> float:
    parsed = float(value)
    if not math.isfinite(parsed):
        raise ValueError("Nonfinite JSON number")
    return parsed


def _reject_duplicate_json_keys(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON object key")
        result[key] = value
    return result


def _validate_json_depth(value: object) -> None:
    pending = [(value, 0)]
    while pending:
        item, depth = pending.pop()
        if depth > _MAX_JSON_DEPTH:
            raise ValueError("JSON nesting is too deep")
        if type(item) is dict:
            pending.extend((child, depth + 1) for child in item.values())
        elif type(item) is list:
            pending.extend((child, depth + 1) for child in item)
