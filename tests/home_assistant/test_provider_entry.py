"""Tests for provider config-entry data and adapter registration."""

from __future__ import annotations

from copy import deepcopy

import pytest
from homeassistant.core import HomeAssistant

from custom_components.ai_orchestrator.provider_entry import (
    CONF_PROVIDER_CONFIG,
    LoadedProviderConnection,
    async_register_provider_entry_adapter,
    build_provider_entry_data,
    parse_provider_entry_data,
    provider_entry_unique_id,
    validate_provider_entry_identity,
)
from custom_components.ai_orchestrator.providers.contract import (
    ConnectionValidationResult,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.provider_fakes import (
    SYNTHETIC_CONFIG_FIELD,
    SYNTHETIC_PROVIDER_TYPE,
    SyntheticLifecycleProvider,
    SyntheticProviderEntryAdapter,
)

CONNECTION_ID = "00000000-0000-4000-8000-000000000020"


def test_provider_entry_data_detaches_and_validates_identity() -> None:
    """Caller mutations and a mismatched unique ID cannot alter identity."""
    nested = {"labels": ["synthetic"]}
    config = {SYNTHETIC_CONFIG_FIELD: nested}
    data = build_provider_entry_data(
        connection_id=CONNECTION_ID,
        provider_type=SYNTHETIC_PROVIDER_TYPE,
        provider_config=config,
    )
    nested["labels"].append("caller-mutation")

    parsed = parse_provider_entry_data(data)
    validate_provider_entry_identity(provider_entry_unique_id(CONNECTION_ID), parsed)
    assert parsed.provider_config == {SYNTHETIC_CONFIG_FIELD: {"labels": ["synthetic"]}}
    with pytest.raises(ValueError, match="does not match"):
        validate_provider_entry_identity(
            provider_entry_unique_id("00000000-0000-4000-8000-000000000021"),
            parsed,
        )


@pytest.mark.parametrize(
    "mutation",
    [
        lambda data: data.update({"extra": True}),
        lambda data: data.update({"entry_kind": "unknown"}),
        lambda data: data.update({CONF_PROVIDER_CONFIG: []}),
    ],
)
def test_provider_entry_parser_rejects_ambiguous_shapes(mutation: object) -> None:
    """Unknown, extra, and mistyped entry fields fail closed."""
    data = build_provider_entry_data(
        connection_id=CONNECTION_ID,
        provider_type=SYNTHETIC_PROVIDER_TYPE,
        provider_config={},
    )
    mutation(data)  # type: ignore[operator]

    with pytest.raises((TypeError, ValueError)):
        parse_provider_entry_data(data)


@pytest.mark.parametrize(
    ("connection_id", "provider_type", "provider_config"),
    [
        ("not-a-uuid", SYNTHETIC_PROVIDER_TYPE, {}),
        ("AAAAAAAA-0000-4000-8000-000000000020", SYNTHETIC_PROVIDER_TYPE, {}),
        (CONNECTION_ID, "Invalid Provider", {}),
        (CONNECTION_ID, SYNTHETIC_PROVIDER_TYPE, {1: "invalid-key"}),
        (CONNECTION_ID, SYNTHETIC_PROVIDER_TYPE, {"nested": {1: "invalid-key"}}),
        (CONNECTION_ID, SYNTHETIC_PROVIDER_TYPE, {"items": ("one", "two")}),
        (CONNECTION_ID, SYNTHETIC_PROVIDER_TYPE, {"value": float("nan")}),
        (CONNECTION_ID, SYNTHETIC_PROVIDER_TYPE, {"value": float("inf")}),
    ],
)
def test_provider_entry_builder_rejects_noncanonical_or_non_json_data(
    connection_id: str,
    provider_type: str,
    provider_config: object,
) -> None:
    """Only canonical IDs, adapter types, and JSON mappings reach storage."""
    with pytest.raises((TypeError, ValueError)):
        build_provider_entry_data(
            connection_id=connection_id,
            provider_type=provider_type,
            provider_config=provider_config,  # type: ignore[arg-type]
        )


def test_provider_entry_builder_rejects_circular_json_data() -> None:
    """Circular containers cannot be persisted as canonical JSON."""
    circular: dict[str, object] = {}
    circular["self"] = circular

    with pytest.raises(ValueError, match="circular"):
        build_provider_entry_data(
            connection_id=CONNECTION_ID,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config=circular,
        )


def test_provider_runtime_representations_hide_configuration_and_provider() -> None:
    """Ordinary repr output cannot include provider configuration or internals."""
    synthetic_marker = "synthetic-sensitive-marker"
    parsed = parse_provider_entry_data(
        build_provider_entry_data(
            connection_id=CONNECTION_ID,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: synthetic_marker},
        )
    )
    loaded = LoadedProviderConnection(
        connection_id=CONNECTION_ID,
        provider_type=SYNTHETIC_PROVIDER_TYPE,
        provider=SyntheticLifecycleProvider(error=RuntimeError(synthetic_marker)),
        validation=ConnectionValidationResult(reachable=True, authenticated=True),
    )

    assert synthetic_marker not in repr(parsed)
    assert synthetic_marker not in repr(loaded)


def test_adapter_registration_is_unique_and_reversible(hass: HomeAssistant) -> None:
    """An adapter type has one owner and unregister cannot remove a replacement."""
    adapter = SyntheticProviderEntryAdapter()
    unregister = async_register_provider_entry_adapter(hass, adapter)
    assert async_get_runtime(hass).provider_entry_adapters == {
        SYNTHETIC_PROVIDER_TYPE: adapter
    }
    with pytest.raises(ValueError, match="already registered"):
        async_register_provider_entry_adapter(
            hass,
            deepcopy(adapter),
        )

    unregister()
    assert async_get_runtime(hass).provider_entry_adapters == {}
