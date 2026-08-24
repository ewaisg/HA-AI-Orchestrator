"""Tests for provider-neutral contract types."""

# ruff: noqa: E402 -- the uninstalled custom integration needs the repo root.

from __future__ import annotations

import sys
from collections.abc import Callable, Mapping
from dataclasses import FrozenInstanceError, fields
from pathlib import Path
from typing import cast

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from custom_components.ai_orchestrator.providers.contract import (
    PROVIDER_CONTRACT_VERSION,
    CapabilityRecord,
    CapabilityState,
    ConnectionValidationResult,
    ErrorCode,
    FinishReason,
    Message,
    MessageRole,
    ModelCatalog,
    NormalizedError,
    ProviderError,
    ProviderModel,
    ProviderRequest,
    StreamCompleted,
    StreamDelta,
    TextGenerationResult,
    ToolCall,
    ToolDefinition,
    Usage,
)


def test_provider_contract_has_a_stable_version() -> None:
    assert PROVIDER_CONTRACT_VERSION == "1"


def test_unproven_capabilities_remain_explicitly_unknown() -> None:
    capabilities = CapabilityRecord(
        text_generation=CapabilityState.UNKNOWN,
        model_discovery=CapabilityState.UNKNOWN,
        streaming=CapabilityState.UNKNOWN,
        structured_output=CapabilityState.UNKNOWN,
        tool_calling=CapabilityState.UNKNOWN,
        usage=CapabilityState.UNKNOWN,
    )

    assert all(
        getattr(capabilities, field.name) is CapabilityState.UNKNOWN
        for field in fields(capabilities)
    )


def test_request_and_messages_are_immutable() -> None:
    request = ProviderRequest(messages=(Message(MessageRole.USER, "Synthetic."),))

    with pytest.raises(FrozenInstanceError):
        request.messages = ()  # type: ignore[misc]


def test_request_detaches_caller_owned_sequences() -> None:
    messages = [Message(MessageRole.USER, "Synthetic.")]
    request = ProviderRequest(messages=messages)  # type: ignore[arg-type]

    messages.clear()

    assert request.messages == (Message(MessageRole.USER, "Synthetic."),)


def test_request_rejects_non_contract_message_data() -> None:
    with pytest.raises(TypeError, match="must use Message"):
        ProviderRequest(messages=({"role": "user"},))  # type: ignore[arg-type]


def test_provider_error_exposes_only_normalized_failure_data() -> None:
    error = NormalizedError(
        code=ErrorCode.RATE_LIMITED,
        message="Synthetic rate limit.",
        retry_hint_ms=250,
    )
    failure = ProviderError(error, retry_allowed=True, failover_allowed=False)

    assert failure.error == error
    assert str(failure) == "Synthetic rate limit."
    assert failure.retry_allowed is True
    assert failure.failover_allowed is False


@pytest.mark.parametrize("message", ["", "   "])
def test_normalized_error_rejects_empty_messages(message: str) -> None:
    with pytest.raises(ValueError, match="message cannot be empty"):
        NormalizedError(code=ErrorCode.INVALID_RESPONSE, message=message)


def test_connection_failure_must_use_normalized_error_channel() -> None:
    with pytest.raises(ValueError, match="normalized provider error"):
        ConnectionValidationResult(reachable=True, authenticated=False)


def test_contract_rejects_adapter_specific_string_enums() -> None:
    with pytest.raises(TypeError, match="must use ErrorCode"):
        NormalizedError(code="timeout", message="Synthetic.")  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("factory", "message"),
    [
        (lambda: Usage(input_tokens=-1, output_tokens=0), "cannot be negative"),
        (
            lambda: NormalizedError(
                code=ErrorCode.RATE_LIMITED,
                message="Synthetic rate limit.",
                retry_hint_ms=-1,
            ),
            "cannot be negative",
        ),
        (lambda: StreamDelta(sequence=-1, text="Synthetic."), "cannot be negative"),
        (
            lambda: StreamCompleted(sequence=-1, finish_reason=FinishReason.STOP),
            "cannot be negative",
        ),
    ],
)
def test_contract_rejects_negative_accounting_and_sequences(
    factory: Callable[[], object], message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        factory()


def test_retry_hint_requires_explicit_retry_permission() -> None:
    error = NormalizedError(
        code=ErrorCode.RATE_LIMITED,
        message="Synthetic rate limit.",
        retry_hint_ms=250,
    )

    with pytest.raises(ValueError, match="requires retry_allowed"):
        ProviderError(error, retry_allowed=False, failover_allowed=False)


def test_generation_rejects_duplicate_tool_call_ids() -> None:
    calls = (
        ToolCall(id="synthetic-call", name="synthetic_tool", arguments={}),
        ToolCall(id="synthetic-call", name="synthetic_tool", arguments={}),
    )

    with pytest.raises(ValueError, match="must be unique"):
        TextGenerationResult(text="", tool_calls=calls)


@pytest.mark.parametrize(
    "model",
    [
        ProviderModel(id="synthetic-one", display_name="Synthetic One"),
        ProviderModel(id="synthetic-two", display_name="Synthetic Two"),
    ],
)
def test_provider_model_accepts_nonempty_provider_identity(
    model: ProviderModel,
) -> None:
    assert model.id
    assert model.display_name


def test_model_catalog_rejects_duplicate_provider_ids() -> None:
    models = (
        ProviderModel(id="synthetic", display_name="Synthetic One"),
        ProviderModel(id="synthetic", display_name="Synthetic Two"),
    )

    with pytest.raises(ValueError, match="must be unique"):
        ModelCatalog(models=models)


@pytest.mark.parametrize(
    ("model_id", "display_name"),
    [("", "Synthetic"), ("   ", "Synthetic"), ("synthetic", "")],
)
def test_provider_model_rejects_empty_fields(model_id: str, display_name: str) -> None:
    with pytest.raises(ValueError, match="cannot be empty"):
        ProviderModel(id=model_id, display_name=display_name)


@pytest.mark.parametrize(
    ("name", "description"),
    [("Bad Name", "Synthetic."), ("synthetic_tool", "   ")],
)
def test_tool_definition_rejects_invalid_public_schema(
    name: str, description: str
) -> None:
    with pytest.raises(ValueError):
        ToolDefinition(name=name, description=description, parameters={})


@pytest.mark.parametrize("name", ["Bad Name", "", "synthetic-hyphen"])
def test_tool_call_rejects_invalid_public_name(name: str) -> None:
    with pytest.raises(ValueError, match="invalid format"):
        ToolCall(id="synthetic-call", name=name, arguments={})


def test_tool_definition_deep_freezes_caller_owned_parameters() -> None:
    enum_values = ["synthetic_one", "synthetic_two"]
    mode_schema: dict[str, object] = {"enum": enum_values}
    properties: dict[str, object] = {"mode": mode_schema}
    parameters: dict[str, object] = {
        "type": "object",
        "properties": properties,
    }

    tool = ToolDefinition(
        name="synthetic_tool",
        description="Synthetic contract test only.",
        parameters=parameters,
    )
    enum_values.append("caller_mutation")
    mode_schema["extra"] = True
    properties["new_property"] = {"type": "string"}

    frozen_properties = cast(Mapping[str, object], tool.parameters["properties"])
    frozen_mode = cast(Mapping[str, object], frozen_properties["mode"])
    assert frozen_mode == {"enum": ("synthetic_one", "synthetic_two")}
    assert "new_property" not in frozen_properties
    with pytest.raises(TypeError):
        frozen_mode["extra"] = True  # type: ignore[index]


def test_tool_call_deep_freezes_caller_owned_arguments() -> None:
    labels = ["synthetic_label"]
    nested: dict[str, object] = {"labels": labels}
    arguments: dict[str, object] = {"nested": nested}

    call = ToolCall(
        id="synthetic-call",
        name="synthetic_tool",
        arguments=arguments,
    )
    labels.append("caller_mutation")
    nested["added"] = "caller_mutation"

    frozen_nested = cast(Mapping[str, object], call.arguments["nested"])
    assert frozen_nested == {"labels": ("synthetic_label",)}
    with pytest.raises(TypeError):
        frozen_nested["added"] = "blocked"  # type: ignore[index]


def test_provider_contract_has_no_endpoint_or_credential_fields() -> None:
    field_names = {
        field.name
        for contract_type in (
            Message,
            ProviderRequest,
            CapabilityRecord,
            NormalizedError,
            ToolDefinition,
            ToolCall,
        )
        for field in fields(contract_type)
    }

    assert field_names.isdisjoint(
        {
            "api_key",
            "authorization",
            "credential",
            "endpoint",
            "model",
            "password",
            "token",
            "url",
        }
    )
