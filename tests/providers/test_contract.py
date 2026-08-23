"""Tests for provider-neutral contract types."""

# ruff: noqa: E402 -- the uninstalled custom integration needs the repo root.

from __future__ import annotations

import sys
from collections.abc import Mapping
from dataclasses import FrozenInstanceError, fields
from pathlib import Path
from typing import cast

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from custom_components.ai_orchestrator.providers.contract import (
    CapabilityRecord,
    CapabilityState,
    ErrorCode,
    Message,
    MessageRole,
    NormalizedError,
    ProviderError,
    ProviderRequest,
    ToolCall,
    ToolDefinition,
)


def test_unproven_capabilities_remain_explicitly_unknown() -> None:
    capabilities = CapabilityRecord(
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


def test_phase0_contract_has_no_endpoint_or_credential_fields() -> None:
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
