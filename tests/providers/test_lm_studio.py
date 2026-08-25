"""Tests for the authenticated LM Studio/OpenAI-compatible adapter."""

# ruff: noqa: E402 -- the uninstalled custom integration needs the repo root.

from __future__ import annotations

import asyncio
import json
import sys
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from custom_components.ai_orchestrator.provider_entry import ProviderConfigMode
from custom_components.ai_orchestrator.providers.contract import (
    CapabilityState,
    ErrorCode,
    Message,
    MessageRole,
    ProviderError,
    ProviderRequest,
    StructuredOutputDefinition,
    ToolDefinition,
)
from custom_components.ai_orchestrator.providers.lm_studio import (
    CONF_API_TOKEN,
    CONF_BASE_URL,
    CONF_MODEL_ID,
    LMStudioProvider,
    LMStudioProviderEntryAdapter,
    parse_lm_studio_config,
)

BASE_URL = "http://10.255.255.254:1234/v1"
API_TOKEN = "synthetic-unit-token"  # noqa: S105 -- synthetic fixture value.
MODEL_ID = "synthetic/model-one"


class FakeContent:
    """Yield deterministic response bytes without opening a socket."""

    def __init__(self, payload: bytes, *, chunk_size: int | None = None) -> None:
        self.payload = payload
        self.chunk_size = chunk_size or max(1, len(payload))

    async def iter_chunked(self, size: int) -> AsyncIterator[bytes]:
        del size
        for offset in range(0, len(self.payload), self.chunk_size):
            yield self.payload[offset : offset + self.chunk_size]


@dataclass(slots=True)
class FakeResponse:
    """Minimal aiohttp response surface consumed by the provider."""

    status: int
    content: FakeContent


class FakeRequestContext:
    """Async request context that can return or raise deterministically."""

    def __init__(
        self,
        response: FakeResponse | None = None,
        error: BaseException | None = None,
    ) -> None:
        self.response = response
        self.error = error

    async def __aenter__(self) -> FakeResponse:
        if self.error is not None:
            raise self.error
        assert self.response is not None
        return self.response

    async def __aexit__(self, *args: object) -> None:
        del args


class FakeSession:
    """Capture exact outbound request metadata and supply queued outcomes."""

    def __init__(self, *outcomes: FakeResponse | BaseException) -> None:
        self.outcomes = list(outcomes)
        self.requests: list[dict[str, object]] = []

    def request(self, method: str, url: str, **kwargs: object) -> FakeRequestContext:
        self.requests.append({"method": method, "url": url, **kwargs})
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, BaseException):
            return FakeRequestContext(error=outcome)
        return FakeRequestContext(response=outcome)


def json_response(payload: object, status: int = 200) -> FakeResponse:
    return FakeResponse(status, FakeContent(json.dumps(payload).encode()))


def provider_with(
    *outcomes: FakeResponse | BaseException,
) -> tuple[LMStudioProvider, FakeSession]:
    session = FakeSession(*outcomes)
    config = parse_lm_studio_config(
        {
            CONF_BASE_URL: BASE_URL,
            CONF_API_TOKEN: API_TOKEN,
            CONF_MODEL_ID: MODEL_ID,
        }
    )
    return LMStudioProvider(session, config), session  # type: ignore[arg-type]


def error_code(error: ProviderError) -> ErrorCode:
    return error.error.code


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("http://10.255.255.254:1234", BASE_URL),
        ("http://10.255.255.254:1234/", BASE_URL),
        ("http://10.255.255.254:1234/v1/", BASE_URL),
        (" https://[fd00::10]:1234/v1 ", "https://[fd00::10]:1234/v1"),
    ],
)
def test_config_normalizes_only_supported_api_roots(value: str, expected: str) -> None:
    parsed = parse_lm_studio_config(
        {
            CONF_BASE_URL: value,
            CONF_API_TOKEN: f" {API_TOKEN} ",
            CONF_MODEL_ID: f" {MODEL_ID} ",
        }
    )

    assert parsed.base_url == expected
    assert parsed.api_token == API_TOKEN
    assert parsed.model_id == MODEL_ID
    assert API_TOKEN not in repr(parsed)


@pytest.mark.parametrize(
    "value",
    [
        "",
        "/v1",
        "ftp://lm.internal/v1",
        "http://user:password@lm.internal/v1",
        "http://lm.internal/v1?query=1",
        "http://lm.internal/v1#fragment",
        "http://lm.internal/not-v1",
        "http://lm.internal/v1/chat/completions",
        "http://lm.internal/v1",
        "http://127.0.0.1:1234/v1",
        "http://169.254.169.254/v1",
        "http://192.0.2.10:1234/v1",
        "https://203.0.113.10/v1",
    ],
)
def test_config_rejects_ambiguous_or_credential_bearing_urls(value: str) -> None:
    with pytest.raises(ValueError, match="base URL"):
        parse_lm_studio_config(
            {
                CONF_BASE_URL: value,
                CONF_API_TOKEN: API_TOKEN,
                CONF_MODEL_ID: MODEL_ID,
            }
        )


@pytest.mark.parametrize(
    "value",
    ["", "Bearer value", "bearer value", "two words", "control\x00value", "x" * 4097],
)
def test_config_rejects_noncanonical_token_values(value: str) -> None:
    with pytest.raises(ValueError, match="token"):
        parse_lm_studio_config(
            {
                CONF_BASE_URL: BASE_URL,
                CONF_API_TOKEN: value,
                CONF_MODEL_ID: MODEL_ID,
            }
        )


def test_entry_adapter_reauth_replaces_only_token() -> None:
    session = FakeSession()
    adapter = LMStudioProviderEntryAdapter(session)  # type: ignore[arg-type]
    current = {
        CONF_BASE_URL: BASE_URL,
        CONF_API_TOKEN: API_TOKEN,
        CONF_MODEL_ID: MODEL_ID,
    }

    normalized = adapter.normalize_config(
        ProviderConfigMode.REAUTH,
        current,
        {CONF_API_TOKEN: "synthetic-replacement-token"},
    )

    assert normalized == {
        **current,
        CONF_API_TOKEN: "synthetic-replacement-token",
    }
    assert current[CONF_API_TOKEN] == API_TOKEN


def test_entry_adapter_schema_never_contains_stored_config() -> None:
    adapter = LMStudioProviderEntryAdapter(FakeSession())  # type: ignore[arg-type]

    setup = adapter.config_schema(ProviderConfigMode.SETUP)
    reauth = adapter.config_schema(ProviderConfigMode.REAUTH)

    assert {key.schema for key in setup.schema} == {
        CONF_BASE_URL,
        CONF_API_TOKEN,
        CONF_MODEL_ID,
    }
    assert {key.schema for key in reauth.schema} == {CONF_API_TOKEN}
    assert API_TOKEN not in repr(setup)
    assert API_TOKEN not in repr(reauth)


async def test_validate_connection_uses_exact_authorized_models_endpoint() -> None:
    provider, session = provider_with(
        json_response({"object": "list", "data": [{"id": MODEL_ID}]})
    )

    validation = await provider.validate_connection()

    assert validation.reachable is True
    assert validation.authenticated is True
    assert session.requests == [
        {
            "method": "GET",
            "url": f"{BASE_URL}/models",
            "headers": {"Authorization": f"Bearer {API_TOKEN}"},
            "json": None,
            "allow_redirects": False,
        }
    ]
    assert API_TOKEN not in repr(provider)


async def test_validate_connection_requires_configured_model_in_catalog() -> None:
    provider, _ = provider_with(
        json_response({"object": "list", "data": [{"id": "synthetic/other"}]})
    )

    with pytest.raises(ProviderError) as caught:
        await provider.validate_connection()

    assert error_code(caught.value) is ErrorCode.NOT_FOUND
    assert API_TOKEN not in str(caught.value)


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (301, ErrorCode.CONNECTION),
        (401, ErrorCode.AUTHENTICATION),
        (403, ErrorCode.AUTHORIZATION),
        (404, ErrorCode.NOT_FOUND),
        (408, ErrorCode.TIMEOUT),
        (429, ErrorCode.RATE_LIMITED),
        (503, ErrorCode.PROVIDER_UNAVAILABLE),
        (422, ErrorCode.INVALID_RESPONSE),
    ],
)
async def test_http_statuses_are_normalized_without_reading_error_body(
    status: int, expected: ErrorCode
) -> None:
    marker = "synthetic-private-error-body"
    provider, _ = provider_with(FakeResponse(status, FakeContent(marker.encode())))

    with pytest.raises(ProviderError) as caught:
        await provider.discover_models()

    assert error_code(caught.value) is expected
    assert marker not in str(caught.value)


async def test_timeout_is_bounded_and_cancellation_propagates() -> None:
    timed_out, _ = provider_with(TimeoutError("synthetic-private-timeout"))
    with pytest.raises(ProviderError) as caught:
        await timed_out.discover_models()
    assert error_code(caught.value) is ErrorCode.TIMEOUT

    cancelled, _ = provider_with(asyncio.CancelledError())
    with pytest.raises(asyncio.CancelledError):
        await cancelled.discover_models()


@pytest.mark.parametrize(
    "payload",
    [
        b"not-json",
        b"[]",
        b'{"data":[],"data":[]}',
        b'{"data":[{"id":"model","score":NaN}]}',
        b'{"data":[{"id":"model","score":1e1000000}]}',
        (b'{"data":' + b"[" * 1000 + b"]" * 1000 + b"}"),
        b'{"data":"not-a-list"}',
        b'{"data":[{}]}',
        b'{"data":[{"id":"duplicate"},{"id":"duplicate"}]}',
    ],
)
async def test_model_catalog_rejects_malformed_responses(payload: bytes) -> None:
    provider, _ = provider_with(FakeResponse(200, FakeContent(payload)))

    with pytest.raises(ProviderError) as caught:
        await provider.discover_models()

    assert error_code(caught.value) is ErrorCode.INVALID_RESPONSE


async def test_oversized_response_fails_closed() -> None:
    provider, _ = provider_with(
        FakeResponse(200, FakeContent(b"x" * (2 * 1024 * 1024 + 1), chunk_size=65536))
    )

    with pytest.raises(ProviderError) as caught:
        await provider.discover_models()

    assert error_code(caught.value) is ErrorCode.INVALID_RESPONSE


async def test_generate_normalizes_text_and_usage() -> None:
    provider, session = provider_with(
        json_response(
            {
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {"role": "assistant", "content": "Synthetic reply"},
                    }
                ],
                "usage": {"prompt_tokens": 4, "completion_tokens": 2},
            }
        )
    )
    request = ProviderRequest(
        messages=(Message(role=MessageRole.USER, content="Synthetic prompt"),)
    )

    result = await provider.generate(request)

    assert result.text == "Synthetic reply"
    assert result.usage is not None
    assert (result.usage.input_tokens, result.usage.output_tokens) == (4, 2)
    sent = session.requests[0]
    assert sent["method"] == "POST"
    assert sent["url"] == f"{BASE_URL}/chat/completions"
    assert sent["allow_redirects"] is False
    assert cast_json(sent["json"])["stream"] is False


async def test_generate_returns_tool_request_without_executing_it() -> None:
    provider, session = provider_with(
        json_response(
            {
                "choices": [
                    {
                        "finish_reason": "tool_calls",
                        "message": {
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": "synthetic-call-1",
                                    "type": "function",
                                    "function": {
                                        "name": "lookup_value",
                                        "arguments": '{"key":"alpha"}',
                                    },
                                }
                            ],
                        },
                    }
                ]
            }
        )
    )
    tool = ToolDefinition(
        name="lookup_value",
        description="Return a synthetic value.",
        parameters={
            "type": "object",
            "properties": {"key": {"type": "string"}},
            "required": ["key"],
            "additionalProperties": False,
        },
    )
    request = ProviderRequest(
        messages=(Message(role=MessageRole.USER, content="Synthetic prompt"),),
        tools=(tool,),
    )

    result = await provider.generate(request)

    assert len(result.tool_calls) == 1
    assert result.tool_calls[0].name == "lookup_value"
    assert dict(result.tool_calls[0].arguments) == {"key": "alpha"}
    body = cast_json(session.requests[0]["json"])
    assert body["tools"][0]["function"]["name"] == "lookup_value"


async def test_generate_rejects_nonfinite_tool_arguments() -> None:
    provider, _ = provider_with(
        json_response(
            {
                "choices": [
                    {
                        "finish_reason": "tool_calls",
                        "message": {
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": "synthetic-call-2",
                                    "type": "function",
                                    "function": {
                                        "name": "use_number",
                                        "arguments": '{"value":1e1000000}',
                                    },
                                }
                            ],
                        },
                    }
                ]
            }
        )
    )
    tool = ToolDefinition(
        name="use_number",
        description="Accept a synthetic number.",
        parameters={
            "type": "object",
            "properties": {"value": {"type": "number"}},
            "required": ["value"],
            "additionalProperties": False,
        },
    )

    with pytest.raises(ProviderError) as caught:
        await provider.generate(ProviderRequest(tools=(tool,)))

    assert error_code(caught.value) is ErrorCode.INVALID_RESPONSE


@pytest.mark.parametrize(
    "provider_request",
    [
        ProviderRequest(
            tools=(
                ToolDefinition(
                    name="outbound_number",
                    description="Synthetic outbound schema.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "value": {"type": "number", "enum": [float("inf")]}
                        },
                        "additionalProperties": False,
                    },
                ),
            )
        ),
        ProviderRequest(
            output_schema=StructuredOutputDefinition(
                name="outbound_schema",
                schema={
                    "type": "object",
                    "properties": {"value": {"type": "number", "enum": [float("inf")]}},
                    "additionalProperties": False,
                },
            )
        ),
    ],
)
async def test_generate_rejects_noncanonical_outbound_json(
    provider_request: ProviderRequest,
) -> None:
    provider, session = provider_with()

    with pytest.raises(ProviderError) as caught:
        await provider.generate(provider_request)

    assert error_code(caught.value) is ErrorCode.UNSUPPORTED
    assert session.requests == []


async def test_generate_parses_and_validates_structured_output() -> None:
    provider, session = provider_with(
        json_response(
            {
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {
                            "role": "assistant",
                            "content": '{"value":"BLUE"}',
                        },
                    }
                ]
            }
        )
    )
    output = StructuredOutputDefinition(
        name="synthetic_output",
        schema={
            "type": "object",
            "properties": {"value": {"type": "string"}},
            "required": ["value"],
            "additionalProperties": False,
        },
    )
    request = ProviderRequest(
        messages=(Message(role=MessageRole.USER, content="Synthetic prompt"),),
        output_schema=output,
    )

    result = await provider.generate(request)

    assert dict(result.structured_output or {}) == {"value": "BLUE"}
    response_format = cast_json(session.requests[0]["json"])["response_format"]
    assert response_format["json_schema"]["strict"] is True


async def test_generate_rejects_nonfinite_structured_number() -> None:
    provider, _ = provider_with(
        json_response(
            {
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {
                            "role": "assistant",
                            "content": '{"value":1e1000000}',
                        },
                    }
                ]
            }
        )
    )
    output = StructuredOutputDefinition(
        name="synthetic_number",
        schema={
            "type": "object",
            "properties": {"value": {"type": "number"}},
            "required": ["value"],
            "additionalProperties": False,
        },
    )

    with pytest.raises(ProviderError) as caught:
        await provider.generate(ProviderRequest(output_schema=output))

    assert error_code(caught.value) is ErrorCode.INVALID_RESPONSE


@pytest.mark.parametrize(
    "payload",
    [
        {"choices": []},
        {"choices": [{"finish_reason": "stop", "message": {"content": 1}}]},
        {"choices": [{"finish_reason": "tool_calls", "message": {"content": ""}}]},
        {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"content": "ok", "tool_calls": "invalid"},
                }
            ]
        },
        {
            "choices": [{"finish_reason": "stop", "message": {"content": "ok"}}],
            "usage": {"prompt_tokens": True, "completion_tokens": 1},
        },
    ],
)
async def test_generate_rejects_malformed_envelopes(payload: object) -> None:
    provider, _ = provider_with(json_response(payload))
    request = ProviderRequest(
        messages=(Message(role=MessageRole.USER, content="Synthetic prompt"),)
    )

    with pytest.raises(ProviderError) as caught:
        await provider.generate(request)

    assert error_code(caught.value) is ErrorCode.INVALID_RESPONSE


async def test_capabilities_do_not_infer_unproven_model_features() -> None:
    provider, _ = provider_with()

    capabilities = await provider.discover_capabilities()

    assert capabilities.model_discovery is CapabilityState.SUPPORTED
    assert capabilities.text_generation is CapabilityState.UNKNOWN
    assert capabilities.streaming is CapabilityState.UNKNOWN
    assert capabilities.structured_output is CapabilityState.UNKNOWN
    assert capabilities.tool_calling is CapabilityState.UNKNOWN
    assert capabilities.usage is CapabilityState.UNKNOWN


async def test_streaming_fails_closed_until_separately_proven() -> None:
    provider, _ = provider_with()
    stream = provider.stream(ProviderRequest())

    with pytest.raises(ProviderError) as caught:
        await anext(stream)

    assert error_code(caught.value) is ErrorCode.UNSUPPORTED


def cast_json(value: object) -> dict[str, Any]:
    assert isinstance(value, dict)
    return value
