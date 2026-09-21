"""Shared bounded transport and codecs for OpenAI-compatible provider adapters."""

from __future__ import annotations

import asyncio
import json
import math
import ssl
from collections.abc import Mapping
from typing import Final, NoReturn, cast

import aiohttp

from .contract import (
    EMPTY_REQUEST,
    SAFE_ERROR_MESSAGES,
    ErrorCode,
    FinishReason,
    Message,
    MessageRole,
    NormalizedError,
    ProviderError,
    ProviderRequest,
    TextGenerationResult,
    ToolCall,
    Usage,
)

_REQUEST_TIMEOUT_SECONDS: Final = 60
_MAX_RESPONSE_BYTES: Final = 2 * 1024 * 1024
_READ_CHUNK_BYTES: Final = 64 * 1024
_MAX_JSON_DEPTH: Final = 64


async def async_request_json(
    session: aiohttp.ClientSession,
    base_url: str,
    headers: Mapping[str, str],
    method: str,
    path: str,
    *,
    json_body: Mapping[str, object] | None = None,
) -> dict[str, object]:
    """Send one bounded request without redirects, retries, or raw error content."""
    url = f"{base_url}{path}"
    try:
        async with asyncio.timeout(_REQUEST_TIMEOUT_SECONDS):
            async with session.request(
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
    try:
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
        _validate_json_value(body)
    except TypeError, ValueError:
        _raise_provider_error(ErrorCode.UNSUPPORTED)
    return body


def _message_to_openai(message: Message) -> dict[str, object]:
    result: dict[str, object] = {
        "role": message.role.value,
        "content": message.content,
    }
    if message.role is MessageRole.ASSISTANT and message.tool_calls:
        tool_calls: list[dict[str, object]] = []
        for call in message.tool_calls:
            arguments = _to_json_value(call.arguments)
            _validate_json_value(arguments)
            tool_calls.append(
                {
                    "id": call.id,
                    "type": "function",
                    "function": {
                        "name": call.name,
                        "arguments": json.dumps(
                            arguments, separators=(",", ":"), allow_nan=False
                        ),
                    },
                }
            )
        result["tool_calls"] = tool_calls
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
    _validate_json_value(parsed)
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


def _validate_json_value(value: object) -> None:
    pending = [(value, 0)]
    while pending:
        item, depth = pending.pop()
        if depth > _MAX_JSON_DEPTH:
            raise ValueError("JSON nesting is too deep")
        if type(item) is dict:
            if any(type(key) is not str for key in item):
                raise ValueError("JSON object keys must be strings")
            pending.extend((child, depth + 1) for child in item.values())
        elif type(item) is list:
            pending.extend((child, depth + 1) for child in item)
        elif type(item) is float:
            if not math.isfinite(item):
                raise ValueError("Nonfinite JSON number")
        elif item is not None and type(item) not in {str, bool, int}:
            raise ValueError("Unsupported JSON value")
