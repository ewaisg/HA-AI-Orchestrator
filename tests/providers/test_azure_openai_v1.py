"""Synthetic Azure REST contract tests; no Azure account or network is used."""

from __future__ import annotations

import asyncio
import json

import pytest

from custom_components.ai_orchestrator.provider_entry import ProviderConfigMode
from custom_components.ai_orchestrator.providers.azure_openai_v1 import (
    AzureOpenAIV1Provider,
    AzureOpenAIV1ProviderEntryAdapter,
    parse_azure_openai_v1_config,
)
from custom_components.ai_orchestrator.providers.contract import (
    CapabilityState,
    ErrorCode,
    Message,
    MessageRole,
    ProviderError,
    ProviderRequest,
    StructuredOutputDefinition,
    ToolCall,
    ToolDefinition,
)
from tests.providers.test_lm_studio import (
    FakeContent,
    FakeResponse,
    FakeSession,
    json_response,
)

CONFIG = {
    "base_url": "https://synthetic-test-resource.openai.azure.com/openai/v1",
    "api_key": "synthetic-unit-api-key",
    "deployment_id": "synthetic-deployment-alias",
}
REQUEST = ProviderRequest(messages=(Message(MessageRole.USER, "Synthetic test"),))


def make_provider(*outcomes):
    session = FakeSession(*outcomes)
    return AzureOpenAIV1Provider(session, parse_azure_openai_v1_config(CONFIG)), session


def completion(text="Synthetic response", **message_fields):
    return {
        "choices": [
            {"message": {"content": text, **message_fields}, "finish_reason": "stop"}
        ],
        "usage": {"prompt_tokens": 3, "completion_tokens": 2},
    }


@pytest.mark.parametrize(
    "host",
    [
        "synthetic-test-resource.openai.azure.com",
        "synthetic-test-resource.services.ai.azure.com",
    ],
)
@pytest.mark.parametrize("path", ["", "/", "/openai/v1", "/openai/v1/"])
def test_canonical_public_azure_endpoint(host, path):
    parsed = parse_azure_openai_v1_config(
        {**CONFIG, "base_url": f"https://{host}{path}"}
    )
    assert parsed.base_url == f"https://{host}/openai/v1"
    assert CONFIG["api_key"] not in repr(parsed)


@pytest.mark.parametrize(
    "url",
    [
        "http://synthetic.openai.azure.com",
        "https://127.0.0.1",
        "https://169.254.169.254",
        "https://openai.azure.com",
        "https://synthetic.openai.azure.com.evil.test",
        "https://evilopenai.azure.com",
        "https://nested.synthetic.openai.azure.com",
        "https://synthetic.openai.azure.com:8080",
        "https://user:secret@synthetic.openai.azure.com",
        "https://synthetic.openai.azure.com?api-key=value",
        "https://synthetic.openai.azure.com#x",
        "https://synthetic.openai.azure.com/openai/deployments/x",
        "https://synthetic.openai.azure.com/%6fpenai/v1",
        "https://synthetic.openai.azure.com:invalid",
        "https://synthetic.openai.azure.us",
    ],
)
def test_invalid_endpoint_rejected_without_network(url):
    with pytest.raises(ValueError, match="endpoint"):
        parse_azure_openai_v1_config({**CONFIG, "base_url": url})


@pytest.mark.parametrize(
    ("key", "value"),
    [
        ("api_key", ""),
        ("api_key", "secret\nheader"),
        ("api_key", "bearer secret"),
        ("api_key", "é"),
        ("api_key", 7),
        ("deployment_id", ""),
        ("deployment_id", "x\n" + "y"),
        ("deployment_id", "synthetic-unit-api-key"),
    ],
)
def test_invalid_configuration(key, value):
    with pytest.raises(ValueError):
        parse_azure_openai_v1_config({**CONFIG, key: value})


async def test_model_catalogue_is_not_a_deployment_catalogue():
    provider, session = make_provider(
        json_response({"data": [{"id": "synthetic-base-model"}]})
    )
    validation = await provider.validate_connection()
    assert validation.reachable and validation.authenticated
    assert session.requests == [
        {
            "method": "GET",
            "url": CONFIG["base_url"] + "/models",
            "headers": {"api-key": CONFIG["api_key"]},
            "json": None,
            "allow_redirects": False,
        }
    ]


async def test_generation_uses_deployment_and_bounded_nonstored_request():
    provider, session = make_provider(json_response(completion()))
    result = await provider.generate(REQUEST)
    assert result.text == "Synthetic response"
    assert result.usage.input_tokens == 3
    assert session.requests[0]["url"] == CONFIG["base_url"] + "/chat/completions"
    body = session.requests[0]["json"]
    assert body["model"] == CONFIG["deployment_id"]
    assert body["max_completion_tokens"] == 2048
    assert body["store"] is False and body["stream"] is False
    assert "api-version" not in session.requests[0]["url"]


async def test_capabilities_are_not_inferred_and_streaming_is_closed():
    provider, session = make_provider()
    capabilities = await provider.discover_capabilities()
    assert capabilities.model_discovery is CapabilityState.SUPPORTED
    for field in (
        "text_generation",
        "structured_output",
        "tool_calling",
        "streaming",
        "usage",
    ):
        assert getattr(capabilities, field) is CapabilityState.UNKNOWN
    with pytest.raises(ProviderError) as error:
        await anext(provider.stream(REQUEST))
    assert error.value.error.code is ErrorCode.UNSUPPORTED
    assert session.requests == []


@pytest.mark.parametrize(
    ("status", "code"),
    [
        (301, ErrorCode.CONNECTION),
        (401, ErrorCode.AUTHENTICATION),
        (403, ErrorCode.AUTHORIZATION),
        (404, ErrorCode.NOT_FOUND),
        (429, ErrorCode.RATE_LIMITED),
        (500, ErrorCode.PROVIDER_UNAVAILABLE),
    ],
)
async def test_http_errors_are_static_and_not_retried(status, code):
    provider, session = make_provider(
        json_response({"error": CONFIG["api_key"]}, status)
    )
    with pytest.raises(ProviderError) as error:
        await provider.generate(REQUEST)
    assert error.value.error.code is code
    assert CONFIG["api_key"] not in str(error.value)
    assert not error.value.failover_allowed
    assert len(session.requests) == 1


async def test_timeout_normalized_and_cancellation_propagates():
    provider, _ = make_provider(TimeoutError())
    with pytest.raises(ProviderError) as error:
        await provider.generate(REQUEST)
    assert error.value.error.code is ErrorCode.TIMEOUT
    provider, _ = make_provider(asyncio.CancelledError())
    with pytest.raises(asyncio.CancelledError):
        await provider.generate(REQUEST)


@pytest.mark.parametrize(
    "raw",
    [b'{"choices":[],"choices":[]}', b"NaN", b"[]", b"{", b" " * (2 * 1024 * 1024 + 1)],
    ids=["duplicate-keys", "nonfinite", "array", "malformed", "oversized"],
)
async def test_malformed_or_oversize_response_rejected(raw):
    provider, _ = make_provider(FakeResponse(200, FakeContent(raw)))
    with pytest.raises(ProviderError) as error:
        await provider.generate(REQUEST)
    assert error.value.error.code is ErrorCode.INVALID_RESPONSE


@pytest.mark.parametrize(
    "payload",
    [
        {"data": [{"id": "synthetic-unit-api-key"}]},
        {"data": [{"id": 1}]},
        {"data": {}},
        {"data": [{"id": "same"}, {"id": "same"}]},
    ],
)
async def test_invalid_or_secret_model_catalogue_rejected(payload):
    provider, _ = make_provider(json_response(payload))
    with pytest.raises(ProviderError):
        await provider.discover_models()


async def test_credential_rejected_in_prompt_tool_schema_and_response():
    for request in (
        ProviderRequest(messages=(Message(MessageRole.USER, CONFIG["api_key"]),)),
        ProviderRequest(
            messages=REQUEST.messages,
            tools=(
                ToolDefinition(
                    name="synthetic",
                    description=CONFIG["api_key"],
                    parameters={
                        "type": "object",
                        "properties": {},
                        "additionalProperties": False,
                    },
                ),
            ),
        ),
    ):
        provider, session = make_provider()
        with pytest.raises(ProviderError) as error:
            await provider.generate(request)
        assert error.value.error.code is ErrorCode.UNSUPPORTED
        assert session.requests == []
    provider, _ = make_provider(json_response(completion(CONFIG["api_key"])))
    with pytest.raises(ProviderError) as error:
        await provider.generate(REQUEST)
    assert error.value.error.code is ErrorCode.INVALID_RESPONSE


async def test_structured_output_normalization():
    request = ProviderRequest(
        messages=REQUEST.messages,
        output_schema=StructuredOutputDefinition(
            name="synthetic",
            schema={
                "type": "object",
                "properties": {"ok": {"type": "boolean"}},
                "required": ["ok"],
                "additionalProperties": False,
            },
        ),
    )
    provider, session = make_provider(json_response(completion('{"ok": true}')))
    result = await provider.generate(request)
    assert result.structured_output == {"ok": True}
    assert (
        session.requests[0]["json"]["response_format"]["json_schema"]["strict"] is True
    )


async def test_secret_in_escaped_historical_tool_arguments_never_leaves_backend():
    secret = 'synthetic-"quoted-key'  # noqa: S105 -- synthetic fixture.
    tool = ToolDefinition(
        name="synthetic",
        description="Synthetic",
        parameters={
            "type": "object",
            "properties": {"value": {"type": "string"}},
            "required": ["value"],
            "additionalProperties": False,
        },
    )
    request = ProviderRequest(
        messages=(
            Message(MessageRole.USER, "Synthetic"),
            Message(
                MessageRole.ASSISTANT,
                "",
                tool_calls=(
                    ToolCall(
                        id="synthetic_call",
                        name="synthetic",
                        arguments={"value": secret},
                    ),
                ),
            ),
            Message(
                MessageRole.TOOL, "Synthetic result", tool_call_id="synthetic_call"
            ),
        ),
        tools=(tool,),
    )
    provider = AzureOpenAIV1Provider(
        FakeSession(), parse_azure_openai_v1_config({**CONFIG, "api_key": secret})
    )
    with pytest.raises(ProviderError) as error:
        await provider.generate(request)
    assert error.value.error.code is ErrorCode.UNSUPPORTED
    assert provider.session.requests == []


async def test_tool_call_normalized_and_escaped_returned_secret_rejected():
    tool = ToolDefinition(
        name="synthetic",
        description="Synthetic",
        parameters={
            "type": "object",
            "properties": {"value": {"type": "string"}},
            "required": ["value"],
            "additionalProperties": False,
        },
    )
    request = ProviderRequest(messages=REQUEST.messages, tools=(tool,))
    secret = 'synthetic-"quoted-key'  # noqa: S105 -- synthetic fixture.
    for value in ("safe", secret):
        payload = {
            "choices": [
                {
                    "message": {
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "synthetic_call",
                                "type": "function",
                                "function": {
                                    "name": "synthetic",
                                    "arguments": json.dumps({"value": value}),
                                },
                            }
                        ],
                    },
                    "finish_reason": "tool_calls",
                }
            ]
        }
        provider = AzureOpenAIV1Provider(
            FakeSession(json_response(payload)),
            parse_azure_openai_v1_config({**CONFIG, "api_key": secret}),
        )
        if value == "safe":
            result = await provider.generate(request)
            assert result.tool_calls[0].arguments == {"value": "safe"}
        else:
            with pytest.raises(ProviderError) as error:
                await provider.generate(request)
            assert error.value.error.code is ErrorCode.INVALID_RESPONSE


async def test_adapter_schema_reauth_and_no_local_route():
    adapter = AzureOpenAIV1ProviderEntryAdapter(FakeSession())
    assert adapter.chat_destination is None
    assert set(adapter.config_schema(ProviderConfigMode.SETUP).schema) == set(CONFIG)
    assert set(adapter.config_schema(ProviderConfigMode.REAUTH).schema) == {"api_key"}
    normalized = adapter.normalize_config(
        ProviderConfigMode.REAUTH, CONFIG, {"api_key": "synthetic-replacement-key"}
    )
    assert normalized["deployment_id"] == CONFIG["deployment_id"]
    assert normalized["api_key"] == "synthetic-replacement-key"
    assert CONFIG["api_key"] == "synthetic-unit-api-key"
    created = await adapter.async_create_provider(normalized)
    assert isinstance(created, AzureOpenAIV1Provider)
    assert normalized["api_key"] not in repr(created)
    with pytest.raises(ValueError):
        adapter.normalize_config(
            ProviderConfigMode.REAUTH,
            CONFIG,
            {"api_key": "new", "deployment_id": "changed"},
        )
