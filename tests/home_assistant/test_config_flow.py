"""Tests for the AI Orchestrator config flow."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.config_entries import SOURCE_REAUTH, SOURCE_RECONFIGURE, SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator.const import (
    DOMAIN,
    FOUNDATION_ENTRY_UNIQUE_ID,
    NAME,
)
from custom_components.ai_orchestrator.provider_entry import (
    CONF_CONNECTION_ID,
    CONF_ENTRY_KIND,
    CONF_PROVIDER_CONFIG,
    CONF_PROVIDER_TYPE,
    ENTRY_KIND_FOUNDATION,
    ENTRY_KIND_PROVIDER,
    async_register_provider_entry_adapter,
    build_provider_entry_data,
    provider_entry_unique_id,
)
from custom_components.ai_orchestrator.providers.contract import (
    SAFE_ERROR_MESSAGES,
    ConnectionValidationResult,
    ErrorCode,
    NormalizedError,
    ProviderError,
)
from custom_components.ai_orchestrator.providers.lm_studio import (
    CONF_API_TOKEN,
    CONF_BASE_URL,
    CONF_MODEL_ID,
    LMStudioProvider,
    LMStudioProviderEntryAdapter,
)
from custom_components.ai_orchestrator.providers.lm_studio import (
    PROVIDER_TYPE as LM_STUDIO_PROVIDER_TYPE,
)
from tests.home_assistant.provider_fakes import (
    SYNTHETIC_CONFIG_FIELD,
    SYNTHETIC_PROVIDER_TYPE,
    ExplodingCodeAccess,
    ExplodingHashCode,
    SyntheticProviderEntryAdapter,
    TypeSpoofingHashCode,
    UnhashableCode,
    forged_provider_error,
    forged_provider_error_payload,
    forged_uninitialized_normalized_error,
)


async def test_user_flow_creates_versioned_foundation_entry(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """The setup flow stores only the foundation entry discriminator."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == NAME
    assert result["data"] == {CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION}
    assert result["result"].unique_id == FOUNDATION_ENTRY_UNIQUE_ID
    assert result["result"].version == 2


async def test_user_flow_reports_no_provider_adapters_after_foundation_exists(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """A later user flow cannot invent an unavailable provider adapter."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    ).add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "no_provider_adapters"


async def test_lm_studio_flow_validates_and_stores_exact_backend_config(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """The built-in adapter exposes exact fields and stores validated values."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
        version=2,
    ).add_to_hass(hass)
    async_register_provider_entry_adapter(
        hass,
        LMStudioProviderEntryAdapter(Mock()),  # type: ignore[arg-type]
    )
    token = "synthetic-flow-token"  # noqa: S105 -- synthetic fixture value.
    provider_config = {
        CONF_BASE_URL: "http://10.255.255.254:1234/v1",
        CONF_API_TOKEN: token,
        CONF_MODEL_ID: "synthetic/model-one",
    }

    with patch.object(
        LMStudioProvider,
        "validate_connection",
        new=AsyncMock(
            return_value=ConnectionValidationResult(
                reachable=True,
                authenticated=True,
            )
        ),
    ) as validate:
        result = await hass.config_entries.flow.async_init(
            DOMAIN,
            context={"source": SOURCE_USER},
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_PROVIDER_TYPE: LM_STUDIO_PROVIDER_TYPE},
        )

        assert result["type"] is FlowResultType.FORM
        assert result["step_id"] == "provider"
        assert {key.schema for key in result["data_schema"].schema} == set(
            provider_config
        )

        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            provider_config,
        )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"][CONF_PROVIDER_TYPE] == LM_STUDIO_PROVIDER_TYPE
    assert result["data"][CONF_PROVIDER_CONFIG] == provider_config
    assert validate.await_count == 2
    assert all(
        call.args == () and call.kwargs == {} for call in validate.await_args_list
    )


async def test_provider_flow_validates_and_creates_separate_entry(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """A registered adapter owns its fields behind shared entry metadata."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
        version=2,
    ).add_to_hass(hass)
    adapter = SyntheticProviderEntryAdapter(mutate_config_on_create=True)
    async_register_provider_entry_adapter(hass, adapter)

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "provider_type"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_PROVIDER_TYPE: SYNTHETIC_PROVIDER_TYPE},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "provider"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"].startswith("Synthetic Provider ")
    assert result["data"][CONF_ENTRY_KIND] == ENTRY_KIND_PROVIDER
    assert result["data"][CONF_PROVIDER_TYPE] == SYNTHETIC_PROVIDER_TYPE
    assert result["data"][CONF_PROVIDER_CONFIG] == {
        SYNTHETIC_CONFIG_FIELD: "synthetic-value"
    }
    connection_id = result["data"][CONF_CONNECTION_ID]
    assert result["result"].unique_id == provider_entry_unique_id(connection_id)
    assert adapter.normalized_configs == [{SYNTHETIC_CONFIG_FIELD: "synthetic-value"}]
    assert adapter.created_config_snapshots == [
        {SYNTHETIC_CONFIG_FIELD: "synthetic-adapter-mutation"},
        {SYNTHETIC_CONFIG_FIELD: "synthetic-adapter-mutation"},
    ]


async def test_provider_schema_exception_is_safely_bounded(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Adapter form failures abort without reflecting their exception body."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
        version=2,
    ).add_to_hass(hass)
    synthetic_marker = "synthetic-schema-private-marker"
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(schema_error=RuntimeError(synthetic_marker)),
    )
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_PROVIDER_TYPE: SYNTHETIC_PROVIDER_TYPE},
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "provider_schema_error"
    assert synthetic_marker not in repr(result)


async def test_provider_flow_normalizes_auth_failure_without_secret_echo(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Provider error bodies cannot be reflected through config-flow errors."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
        version=2,
    ).add_to_hass(hass)
    adapter = SyntheticProviderEntryAdapter(
        error=ProviderError(
            NormalizedError(
                code=ErrorCode.AUTHENTICATION,
                message=SAFE_ERROR_MESSAGES[ErrorCode.AUTHENTICATION],
            ),
            retry_allowed=False,
            failover_allowed=False,
        )
    )
    async_register_provider_entry_adapter(hass, adapter)
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_PROVIDER_TYPE: SYNTHETIC_PROVIDER_TYPE},
    )
    synthetic_secret = "synthetic-secret-not-for-output"  # noqa: S105
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {SYNTHETIC_CONFIG_FIELD: synthetic_secret},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_auth"}
    assert synthetic_secret not in repr(result)


@pytest.mark.parametrize(
    "code_type", [ExplodingHashCode, TypeSpoofingHashCode, UnhashableCode]
)
async def test_provider_flow_bounds_malformed_error_code_without_hashing(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    code_type: type[ExplodingHashCode],
) -> None:
    """A hostile error-code object cannot bypass the config-flow boundary."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
        version=2,
    ).add_to_hass(hass)
    synthetic_marker = "synthetic-exploding-code-private-marker"
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(
            error=forged_provider_error(code_type(synthetic_marker), synthetic_marker)
        ),
    )
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_PROVIDER_TYPE: SYNTHETIC_PROVIDER_TYPE},
    )

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_config"}
    assert synthetic_marker not in repr(result)


async def test_provider_flow_does_not_dispatch_nested_error_code_property(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """A forged nested error property cannot run during initial setup."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
        version=2,
    ).add_to_hass(hass)
    synthetic_marker = "synthetic-nested-code-access-private-marker"
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(
            error=forged_provider_error_payload(
                ExplodingCodeAccess(synthetic_marker), synthetic_marker
            )
        ),
    )
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_PROVIDER_TYPE: SYNTHETIC_PROVIDER_TYPE},
    )

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_config"}
    assert synthetic_marker not in repr(result)


async def test_provider_flow_bounds_uninitialized_normalized_error(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """An exact nested error with an unset slot fails closed during setup."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
        version=2,
    ).add_to_hass(hass)
    synthetic_marker = "synthetic-uninitialized-normalized-private-marker"
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(
            error=forged_uninitialized_normalized_error(synthetic_marker)
        ),
    )
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_PROVIDER_TYPE: SYNTHETIC_PROVIDER_TYPE},
    )

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_config"}
    assert synthetic_marker not in repr(result)


async def test_reauth_replaces_adapter_config_and_preserves_identity(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Reauthentication validates before atomically updating and reloading."""
    connection_id = "00000000-0000-4000-8000-000000000001"
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Synthetic Provider 00000000",
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "old-synthetic-value"},
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    entry.add_to_hass(hass)
    adapter = SyntheticProviderEntryAdapter(mutate_config_on_create=True)
    async_register_provider_entry_adapter(hass, adapter)

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_REAUTH, "entry_id": entry.entry_id},
        data=dict(entry.data),
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "reauth_confirm"

    with patch.object(hass.config_entries, "async_schedule_reload") as reload_entry:
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {SYNTHETIC_CONFIG_FIELD: "new-synthetic-value"},
        )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert entry.unique_id == provider_entry_unique_id(connection_id)
    assert entry.data[CONF_PROVIDER_CONFIG] == {
        SYNTHETIC_CONFIG_FIELD: "new-synthetic-value"
    }
    assert adapter.created_config_snapshots == [
        {SYNTHETIC_CONFIG_FIELD: "synthetic-adapter-mutation"}
    ]
    reload_entry.assert_called_once_with(entry.entry_id)


async def test_reauth_failure_preserves_stored_config_without_secret_echo(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Failed replacement credentials neither overwrite nor appear in output."""
    connection_id = "00000000-0000-4000-8000-000000000003"
    original_config = {SYNTHETIC_CONFIG_FIELD: "old-synthetic-value"}
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config=original_config,
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    entry.add_to_hass(hass)
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(
            error=ProviderError(
                NormalizedError(
                    code=ErrorCode.AUTHENTICATION,
                    message=SAFE_ERROR_MESSAGES[ErrorCode.AUTHENTICATION],
                ),
                retry_allowed=False,
                failover_allowed=False,
            )
        ),
    )
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_REAUTH, "entry_id": entry.entry_id},
        data=dict(entry.data),
    )
    replacement = "synthetic-replacement-not-for-output"

    with patch.object(hass.config_entries, "async_schedule_reload") as reload_entry:
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {SYNTHETIC_CONFIG_FIELD: replacement},
        )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_auth"}
    assert replacement not in repr(result)
    assert entry.data[CONF_PROVIDER_CONFIG] == original_config
    reload_entry.assert_not_called()


async def test_reconfigure_replaces_complete_adapter_config(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Reconfigure validates and replaces, rather than partially merging, data."""
    connection_id = "00000000-0000-4000-8000-000000000002"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "old-synthetic-value"},
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    entry.add_to_hass(hass)
    adapter = SyntheticProviderEntryAdapter(mutate_config_on_create=True)
    async_register_provider_entry_adapter(hass, adapter)

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_RECONFIGURE, "entry_id": entry.entry_id},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "reconfigure"

    with patch.object(hass.config_entries, "async_schedule_reload"):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {SYNTHETIC_CONFIG_FIELD: "reconfigured-synthetic-value"},
        )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reconfigure_successful"
    assert entry.data[CONF_PROVIDER_CONFIG] == {
        SYNTHETIC_CONFIG_FIELD: "reconfigured-synthetic-value"
    }
    assert adapter.created_config_snapshots == [
        {SYNTHETIC_CONFIG_FIELD: "synthetic-adapter-mutation"}
    ]


@pytest.mark.parametrize("source", [SOURCE_REAUTH, SOURCE_RECONFIGURE])
async def test_update_schema_exception_is_safely_bounded(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    source: str,
) -> None:
    """Reauth and reconfigure schema failures cannot expose adapter details."""
    connection_id = "00000000-0000-4000-8000-000000000004"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "old-synthetic-value"},
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    entry.add_to_hass(hass)
    synthetic_marker = "synthetic-update-schema-private-marker"
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(schema_error=RuntimeError(synthetic_marker)),
    )

    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": source, "entry_id": entry.entry_id},
        data=dict(entry.data) if source == SOURCE_REAUTH else None,
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "provider_schema_error"
    assert synthetic_marker not in repr(result)


@pytest.mark.parametrize("source", [SOURCE_REAUTH, SOURCE_RECONFIGURE])
@pytest.mark.parametrize(
    "code_type", [ExplodingHashCode, TypeSpoofingHashCode, UnhashableCode]
)
async def test_update_bounds_malformed_error_code_without_hashing(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    source: str,
    code_type: type[ExplodingHashCode],
) -> None:
    """Update flows keep hostile error-code objects behind a fixed identifier."""
    connection_id = "00000000-0000-4000-8000-000000000005"
    original_config = {SYNTHETIC_CONFIG_FIELD: "old-synthetic-value"}
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config=original_config,
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    entry.add_to_hass(hass)
    synthetic_marker = "synthetic-update-exploding-code-private-marker"
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(
            error=forged_provider_error(code_type(synthetic_marker), synthetic_marker)
        ),
    )
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": source, "entry_id": entry.entry_id},
        data=dict(entry.data) if source == SOURCE_REAUTH else None,
    )

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {SYNTHETIC_CONFIG_FIELD: "replacement-synthetic-value"},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_config"}
    assert synthetic_marker not in repr(result)
    assert entry.data[CONF_PROVIDER_CONFIG] == original_config


@pytest.mark.parametrize("source", [SOURCE_REAUTH, SOURCE_RECONFIGURE])
async def test_update_does_not_dispatch_nested_error_code_property(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    source: str,
) -> None:
    """A forged nested error property stays behind the shared update boundary."""
    connection_id = "00000000-0000-4000-8000-000000000006"
    original_config = {SYNTHETIC_CONFIG_FIELD: "old-synthetic-value"}
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config=original_config,
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    entry.add_to_hass(hass)
    synthetic_marker = "synthetic-update-nested-code-access-private-marker"
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(
            error=forged_provider_error_payload(
                ExplodingCodeAccess(synthetic_marker), synthetic_marker
            )
        ),
    )
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": source, "entry_id": entry.entry_id},
        data=dict(entry.data) if source == SOURCE_REAUTH else None,
    )

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {SYNTHETIC_CONFIG_FIELD: "replacement-synthetic-value"},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_config"}
    assert synthetic_marker not in repr(result)
    assert entry.data[CONF_PROVIDER_CONFIG] == original_config


@pytest.mark.parametrize("source", [SOURCE_REAUTH, SOURCE_RECONFIGURE])
async def test_update_bounds_uninitialized_normalized_error(
    hass: HomeAssistant,
    enable_custom_integrations: None,
    source: str,
) -> None:
    """An exact nested error with an unset slot fails closed during updates."""
    connection_id = "00000000-0000-4000-8000-000000000007"
    original_config = {SYNTHETIC_CONFIG_FIELD: "old-synthetic-value"}
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config=original_config,
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    entry.add_to_hass(hass)
    synthetic_marker = "synthetic-update-uninitialized-normalized-private-marker"
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(
            error=forged_uninitialized_normalized_error(synthetic_marker)
        ),
    )
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": source, "entry_id": entry.entry_id},
        data=dict(entry.data) if source == SOURCE_REAUTH else None,
    )

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {SYNTHETIC_CONFIG_FIELD: "replacement-synthetic-value"},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_config"}
    assert synthetic_marker not in repr(result)
    assert entry.data[CONF_PROVIDER_CONFIG] == original_config
