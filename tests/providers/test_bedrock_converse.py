"""Offline Bedrock SDK/codec tests; synthetic credentials and no AWS requests."""

import asyncio
import threading
from unittest.mock import patch

import pytest

from custom_components.ai_orchestrator.provider_entry import ProviderConfigMode
from custom_components.ai_orchestrator.providers.bedrock_converse import (
    BedrockConverseProvider,
    BedrockConverseProviderEntryAdapter,
    _build_request,
    _sdk_call,
    parse_bedrock_config,
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

CONFIG = {
    "region": "us-east-1",
    "model_id": "synthetic.model-v1",
    "access_key_id": "SYNTHETICACCESSKEY123",
    "secret_access_key": "synthetic-secret-key",
    "session_token": "synthetic-session-token",
}
REQUEST = ProviderRequest(messages=(Message(MessageRole.USER, "Synthetic prompt"),))
TOOL = ToolDefinition(
    name="synthetic_tool",
    description="Synthetic tool",
    parameters={
        "type": "object",
        "properties": {"value": {"type": "string"}},
        "required": ["value"],
        "additionalProperties": False,
    },
)


def answer(text="Synthetic answer", stop="end_turn", blocks=None):
    return {
        "output": {
            "message": {"role": "assistant", "content": blocks or [{"text": text}]}
        },
        "stopReason": stop,
        "usage": {"inputTokens": 3, "outputTokens": 2},
    }


def provider(hass, config=None):
    return BedrockConverseProvider(hass, parse_bedrock_config(config or CONFIG))


@pytest.mark.parametrize(
    "extra",
    [
        {"endpoint_url": "https://evil.test"},
        {"profile": "ambient"},
        {"region": "https://evil.test"},
        {"region": "us-east-1.evil.test"},
        {"access_key_id": ""},
        {"secret_access_key": ""},
        {"session_token": None},
        {"secret_access_key": "a\nb"},
        {"access_key_id": "é"},
        {"model_id": "https://evil.test"},
        {"model_id": "synthetic-secret-key"},
    ],
)
def test_invalid_configuration(extra):
    with pytest.raises(ValueError):
        parse_bedrock_config({**CONFIG, **extra})


def test_credentials_hidden_and_optional_token_empty():
    config = parse_bedrock_config(CONFIG)
    for secret in config.secrets:
        assert secret not in repr(config)
    assert (
        parse_bedrock_config(
            {key: value for key, value in CONFIG.items() if key != "session_token"}
        ).session_token
        == ""
    )


async def test_create_does_not_discover_credentials_or_make_clients(hass):
    adapter = BedrockConverseProviderEntryAdapter(hass)
    assert adapter.chat_destination is None
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call"
    ) as sdk:
        created = await adapter.async_create_provider(CONFIG)
    sdk.assert_not_called()
    assert isinstance(created, BedrockConverseProvider)
    assert set(adapter.config_schema(ProviderConfigMode.REAUTH).schema) == {
        "access_key_id",
        "secret_access_key",
        "session_token",
    }
    updated = adapter.normalize_config(
        ProviderConfigMode.REAUTH,
        CONFIG,
        {"access_key_id": "new-access", "secret_access_key": "new-secret"},
    )
    assert updated["session_token"] == ""
    assert updated["model_id"] == CONFIG["model_id"]
    with pytest.raises(ValueError):
        adapter.normalize_config(
            ProviderConfigMode.REAUTH, CONFIG, {"secret_access_key": "new"}
        )


async def test_catalogue_authentication_does_not_claim_model_access(hass):
    instance = provider(hass)
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value={
            "modelSummaries": [
                {"modelId": "different-model", "modelName": "Different model"}
            ]
        },
    ) as sdk:
        result = await instance.validate_connection()
    assert result.reachable and result.authenticated
    assert sdk.call_args.args[1:] == ("list_foundation_models", {})
    capabilities = await instance.discover_capabilities()
    assert capabilities.tool_calling is CapabilityState.UNKNOWN
    assert capabilities.text_generation is CapabilityState.UNKNOWN
    with pytest.raises(ProviderError) as error:
        await anext(instance.stream(REQUEST))
    assert error.value.error.code is ErrorCode.UNSUPPORTED


async def test_converse_text_request_and_usage(hass):
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value=answer(),
    ) as sdk:
        result = await provider(hass).generate(REQUEST)
    assert result.text == "Synthetic answer"
    assert result.usage.input_tokens == 3 and result.usage.output_tokens == 2
    assert sdk.call_args.args[1] == "converse"
    assert sdk.call_args.args[2] == {
        "modelId": CONFIG["model_id"],
        "messages": [{"role": "user", "content": [{"text": "Synthetic prompt"}]}],
        "inferenceConfig": {"maxTokens": 2048},
    }


async def test_tool_result_continuation_and_normalization(hass):
    call = ToolCall("call1", "synthetic_tool", {"value": "safe"})
    request = ProviderRequest(
        messages=(
            Message(MessageRole.SYSTEM, "Synthetic system"),
            Message(MessageRole.USER, "Synthetic prompt"),
            Message(MessageRole.ASSISTANT, "", tool_calls=(call,)),
            Message(MessageRole.TOOL, "Synthetic tool result", tool_call_id="call1"),
        ),
        tools=(TOOL,),
    )
    body = _build_request(parse_bedrock_config(CONFIG), request)
    assert body["messages"][1]["content"] == [
        {
            "toolUse": {
                "toolUseId": "call1",
                "name": "synthetic_tool",
                "input": {"value": "safe"},
            }
        }
    ]
    assert body["messages"][2]["content"] == [
        {
            "toolResult": {
                "toolUseId": "call1",
                "content": [{"text": "Synthetic tool result"}],
            }
        }
    ]
    initial = ProviderRequest(messages=REQUEST.messages, tools=(TOOL,))
    response = answer(
        stop="tool_use",
        blocks=[
            {
                "toolUse": {
                    "toolUseId": "call2",
                    "name": "synthetic_tool",
                    "input": {"value": "safe"},
                }
            }
        ],
    )
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value=response,
    ):
        result = await provider(hass).generate(initial)
    assert result.tool_calls[0].arguments == {"value": "safe"}


async def test_structured_output_with_pinned_sdk_shape(hass):
    request = ProviderRequest(
        messages=REQUEST.messages,
        output_schema=StructuredOutputDefinition(
            "synthetic",
            {
                "type": "object",
                "properties": {"ok": {"type": "boolean"}},
                "required": ["ok"],
                "additionalProperties": False,
            },
        ),
    )
    body = _build_request(parse_bedrock_config(CONFIG), request)
    assert body["outputConfig"]["textFormat"]["type"] == "json_schema"
    import botocore.session
    from botocore.validate import validate_parameters

    model = botocore.session.Session().get_service_model("bedrock-runtime")
    validate_parameters(body, model.operation_model("Converse").input_shape)
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value=answer('{"ok":true}'),
    ):
        result = await provider(hass).generate(request)
    assert result.structured_output == {"ok": True}


@pytest.mark.parametrize(
    "secret_key", ["access_key_id", "secret_access_key", "session_token"]
)
async def test_all_credentials_blocked_in_prompts_and_output(hass, secret_key):
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call"
    ) as sdk:
        with pytest.raises(ProviderError) as error:
            await provider(hass).generate(
                ProviderRequest(
                    messages=(Message(MessageRole.USER, CONFIG[secret_key]),)
                )
            )
        assert error.value.error.code is ErrorCode.UNSUPPORTED
        sdk.assert_not_called()
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value=answer(CONFIG[secret_key]),
    ):
        with pytest.raises(ProviderError) as error:
            await provider(hass).generate(REQUEST)
    assert error.value.error.code is ErrorCode.INVALID_RESPONSE
    assert CONFIG[secret_key] not in str(error.value)


@pytest.mark.parametrize(
    "response",
    [
        {},
        {"stopReason": "end_turn", "output": {}},
        answer(stop="max_tokens"),
        answer(blocks=[{"reasoningContent": {"text": "hidden reasoning"}}]),
        {**answer(), "usage": {"inputTokens": True, "outputTokens": 1}},
        answer(text="x" * (2 * 1024 * 1024)),
        answer(stop="tool_use"),
    ],
)
async def test_malformed_truncated_or_oversized_output_rejected(hass, response):
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value=response,
    ):
        with pytest.raises(ProviderError) as error:
            await provider(hass).generate(REQUEST)
    assert error.value.error.code is ErrorCode.INVALID_RESPONSE


@pytest.mark.parametrize("stop", ["guardrail_intervened", "content_filtered"])
async def test_refusal_normalized(hass, stop):
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value=answer(stop=stop),
    ):
        with pytest.raises(ProviderError) as error:
            await provider(hass).generate(REQUEST)
    assert error.value.error.code is ErrorCode.SAFETY_REFUSAL


@pytest.mark.parametrize("cancel", [True, False])
@pytest.mark.parametrize("worker_fails", [True, False])
async def test_executor_is_off_loop_and_cancellation_retains_slot(
    hass, cancel, worker_fails
):
    adapter = BedrockConverseProviderEntryAdapter(hass)
    instance = await adapter.async_create_provider(CONFIG)
    entered, release = asyncio.Event(), threading.Event()
    loop = asyncio.get_running_loop()
    thread_ids = []

    def worker(*_):
        thread_ids.append(threading.get_ident())
        loop.call_soon_threadsafe(entered.set)
        assert release.wait(5)
        if worker_fails:
            raise RuntimeError("Synthetic worker failure after cancellation")
        return answer()

    with (
        patch(
            "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
            side_effect=worker,
        ),
        patch.object(
            hass,
            "async_add_executor_job",
            side_effect=lambda func, *args: loop.run_in_executor(None, func, *args),
        ),
        patch(
            "custom_components.ai_orchestrator.providers.bedrock_converse.TIMEOUT_SECONDS",
            2 if cancel else 0.05,
        ),
    ):
        task = asyncio.create_task(instance.generate(REQUEST))
        try:
            await asyncio.wait_for(entered.wait(), 2)
            pending = instance._worker_gate.pending
            if cancel:
                task.cancel()
                with pytest.raises(asyncio.CancelledError):
                    await task
            else:
                with pytest.raises(ProviderError) as timeout:
                    await task
                assert timeout.value.error.code is ErrorCode.TIMEOUT
            with pytest.raises(ProviderError) as error:
                await instance.generate(REQUEST)
            assert error.value.error.code is ErrorCode.PROVIDER_UNAVAILABLE
            # Setup validation, reauthentication and reload create replacements.
            # Even a changed account must not bypass the adapter-wide worker slot.
            for suffix in ("-replacement-1", "-replacement-2"):
                replacement = await adapter.async_create_provider(
                    {**CONFIG, "access_key_id": CONFIG["access_key_id"] + suffix}
                )
                with pytest.raises(ProviderError) as replacement_error:
                    await replacement.validate_connection()
                assert (
                    replacement_error.value.error.code is ErrorCode.PROVIDER_UNAVAILABLE
                )
            assert len(thread_ids) == 1 and thread_ids[0] != threading.get_ident()
        finally:
            release.set()
        if worker_fails:
            with pytest.raises(RuntimeError, match="Synthetic worker failure"):
                await asyncio.wait_for(asyncio.shield(pending), 2)
        else:
            await asyncio.wait_for(asyncio.shield(pending), 2)
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value=answer(),
    ):
        assert (await instance.generate(REQUEST)).text == "Synthetic answer"
    with patch(
        "custom_components.ai_orchestrator.providers.bedrock_converse._sdk_call",
        return_value={"modelSummaries": []},
    ):
        replacement = await adapter.async_create_provider(CONFIG)
        assert (await replacement.validate_connection()).authenticated


def test_sdk_identity_endpoint_retries_and_no_ambient_credentials(monkeypatch):
    import botocore.credentials
    from botocore.client import BaseClient

    monkeypatch.setenv("AWS_PROFILE", "nonexistent-ambient-profile")
    monkeypatch.setenv("AWS_ENDPOINT_URL", "https://evil.test")
    monkeypatch.setenv("AWS_BEARER_TOKEN_BEDROCK", "ambient-bearer-credential")
    seen = []

    def invoke(client, operation, payload):
        seen.append(operation)
        assert (
            client.meta.endpoint_url
            == "https://bedrock-runtime.us-east-1.amazonaws.com"
        )
        assert client.meta.config.signature_version == "v4"
        assert client.meta.config.retries["total_max_attempts"] == 1
        assert (
            client.meta.config.connect_timeout == 5
            and client.meta.config.read_timeout == 45
        )
        assert client.meta.config.proxies == {}
        assert client._request_signer._credentials.access_key == CONFIG["access_key_id"]
        assert (
            client._request_signer._credentials.secret_key
            == CONFIG["secret_access_key"]
        )
        assert client._request_signer._credentials.token == CONFIG["session_token"]
        return answer()

    with (
        patch.object(
            botocore.credentials.CredentialResolver,
            "load_credentials",
            side_effect=AssertionError("ambient lookup"),
        ),
        patch.object(BaseClient, "_make_api_call", invoke),
        patch.object(BaseClient, "close", autospec=True) as close,
    ):
        assert _sdk_call(parse_bedrock_config(CONFIG), "converse", {}) == answer()
    assert seen == ["Converse"]
    close.assert_called_once()


@pytest.mark.parametrize("region", ["us-gov-west-1", "cn-north-1", "zz-fake-1"])
def test_sdk_rejects_unapproved_regions_before_call(region):
    from botocore.client import BaseClient

    with patch.object(BaseClient, "_make_api_call") as call:
        with pytest.raises(ProviderError) as error:
            _sdk_call(
                parse_bedrock_config({**CONFIG, "region": region}), "converse", {}
            )
    assert error.value.error.code is ErrorCode.UNSUPPORTED
    call.assert_not_called()


@pytest.mark.parametrize(
    "aws_code,expected",
    [
        ("AccessDeniedException", ErrorCode.AUTHORIZATION),
        ("ExpiredTokenException", ErrorCode.AUTHENTICATION),
        ("ThrottlingException", ErrorCode.RATE_LIMITED),
        ("ModelTimeoutException", ErrorCode.TIMEOUT),
        ("ValidationException", ErrorCode.UNSUPPORTED),
        ("ResourceNotFoundException", ErrorCode.NOT_FOUND),
    ],
)
def test_sdk_errors_static_and_no_retry(aws_code, expected):
    from botocore.client import BaseClient
    from botocore.exceptions import ClientError

    with (
        patch.object(
            BaseClient,
            "_make_api_call",
            side_effect=ClientError(
                {"Error": {"Code": aws_code, "Message": CONFIG["secret_access_key"]}},
                "Converse",
            ),
        ) as call,
        patch.object(BaseClient, "close", autospec=True) as close,
    ):
        with pytest.raises(ProviderError) as error:
            _sdk_call(parse_bedrock_config(CONFIG), "converse", {})
    assert error.value.error.code is expected
    assert not error.value.failover_allowed
    assert CONFIG["secret_access_key"] not in str(error.value)
    assert call.call_count == 1
    close.assert_called_once()
