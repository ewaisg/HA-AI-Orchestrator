"""Tests for the AI Orchestrator integration lifecycle."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.components import frontend, panel_custom
from homeassistant.config_entries import SOURCE_REAUTH, ConfigEntryState
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import (
    ConfigEntryAuthFailed,
    ConfigEntryError,
    ConfigEntryNotReady,
)
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator import (
    async_migrate_entry,
    async_setup,
    async_setup_entry,
    async_unload_entry,
)
from custom_components.ai_orchestrator.const import (
    DOMAIN,
    FOUNDATION_ENTRY_UNIQUE_ID,
    PANEL_URL_PATH,
    WORKFLOW_PROBE_EVENT,
)
from custom_components.ai_orchestrator.provider_entry import (
    CONF_ENTRY_KIND,
    ENTRY_KIND_FOUNDATION,
    async_register_provider_entry_adapter,
    build_provider_entry_data,
    provider_entry_unique_id,
)
from custom_components.ai_orchestrator.providers.contract import (
    SAFE_ERROR_MESSAGES,
    ErrorCode,
    NormalizedError,
    ProviderError,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.workflow_probe import async_run_workflow_probe
from tests.home_assistant.provider_fakes import (
    SYNTHETIC_CONFIG_FIELD,
    SYNTHETIC_PROVIDER_TYPE,
    SyntheticProviderEntryAdapter,
)


async def test_async_setup_registers_global_surfaces(hass: HomeAssistant) -> None:
    """Static assets and the WebSocket command register at integration setup."""
    with (
        patch(
            "custom_components.ai_orchestrator.async_register_static_assets",
            new_callable=AsyncMock,
        ) as register_assets,
        patch(
            "custom_components.ai_orchestrator.async_register_websocket_commands"
        ) as register_websocket,
    ):
        assert await async_setup(hass, {})

    register_assets.assert_awaited_once_with(hass)
    register_websocket.assert_called_once_with(hass)
    assert async_get_runtime(hass).loaded_foundation_entry_ids == set()


async def test_entry_setup_and_unload_manage_panel(hass: HomeAssistant) -> None:
    """The foundation entry owns panel registration across its lifecycle."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )

    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=True,
        ) as register_panel,
        patch(
            "custom_components.ai_orchestrator.async_unregister_panel",
            new=Mock(),
        ) as unregister_panel,
    ):
        assert await async_setup_entry(hass, entry)
        runtime = async_get_runtime(hass)
        assert runtime.loaded_foundation_entry_ids == {entry.entry_id}
        assert runtime.owns_panel is True
        assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1
        assert await async_unload_entry(hass, entry)
        assert runtime.loaded_foundation_entry_ids == set()
        assert runtime.owns_panel is False
        assert WORKFLOW_PROBE_EVENT not in hass.bus.async_listeners()

    register_panel.assert_awaited_once_with(hass)
    unregister_panel.assert_called_once_with(hass)


async def test_unload_preserves_preexisting_panel(hass: HomeAssistant) -> None:
    """A panel found during setup remains untouched during unload."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )

    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=False,
        ) as register_panel,
        patch(
            "custom_components.ai_orchestrator.async_unregister_panel",
            new=Mock(),
        ) as unregister_panel,
    ):
        assert await async_setup_entry(hass, entry)
        runtime = async_get_runtime(hass)
        assert runtime.owns_panel is False
        assert await async_unload_entry(hass, entry)

    register_panel.assert_awaited_once_with(hass)
    unregister_panel.assert_not_called()


async def test_panel_unloads_only_after_last_loaded_foundation_entry(
    hass: HomeAssistant,
) -> None:
    """Domain-wide ownership survives until the last loaded entry unloads."""
    first = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    second = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )

    with (
        patch(
            "custom_components.ai_orchestrator.async_register_panel",
            new_callable=AsyncMock,
            return_value=True,
        ) as register_panel,
        patch(
            "custom_components.ai_orchestrator.async_unregister_panel",
            new=Mock(),
        ) as unregister_panel,
    ):
        assert await async_setup_entry(hass, first)
        assert await async_setup_entry(hass, second)
        assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1
        assert await async_unload_entry(hass, first)
        unregister_panel.assert_not_called()
        assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1
        assert await async_unload_entry(hass, second)
        assert WORKFLOW_PROBE_EVENT not in hass.bus.async_listeners()

    register_panel.assert_awaited_once_with(hass)
    unregister_panel.assert_called_once_with(hass)


async def test_non_foundation_entry_fails_without_loaded_state(
    hass: HomeAssistant,
) -> None:
    """An unrecognized Phase 0 entry cannot make the foundation look loaded."""
    entry = MockConfigEntry(domain=DOMAIN, data={}, unique_id="not_the_foundation")

    with pytest.raises(ConfigEntryError, match="data is invalid"):
        await async_setup_entry(hass, entry)

    assert async_get_runtime(hass).loaded_foundation_entry_ids == set()


async def test_foreign_panel_collision_fails_entry_setup(
    hass: HomeAssistant,
) -> None:
    """A foreign panel collision propagates as a failed entry setup."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name="foreign-panel",
        module_url="/local/foreign-panel.js",
        require_admin=True,
    )
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )

    with pytest.raises(ConfigEntryError, match="incompatible panel"):
        await async_setup_entry(hass, entry)

    runtime = async_get_runtime(hass)
    assert runtime.loaded_foundation_entry_ids == set()
    assert runtime.owns_panel is False
    assert runtime.workflow_probe_unsubscribe is None


async def test_config_entry_manager_lifecycle(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Home Assistant's config-entry manager loads and unloads the foundation."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    assert async_get_runtime(hass).loaded_foundation_entry_ids == {entry.entry_id}
    assert frontend.async_panel_exists(hass, PANEL_URL_PATH)
    assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.NOT_LOADED
    assert async_get_runtime(hass).loaded_foundation_entry_ids == set()
    assert not frontend.async_panel_exists(hass, PANEL_URL_PATH)
    assert WORKFLOW_PROBE_EVENT not in hass.bus.async_listeners()


async def test_config_entry_manager_reload_keeps_exactly_one_probe_listener(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Home Assistant's real reload path detaches before registering once."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    before_reload = async_run_workflow_probe(hass, context=Context())
    assert before_reload["executions_for_trigger"] == 1
    assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    assert hass.bus.async_listeners()[WORKFLOW_PROBE_EVENT] == 1
    after_reload = async_run_workflow_probe(hass, context=Context())
    assert after_reload["execution_count"] == 2
    assert after_reload["executions_for_trigger"] == 1
    assert after_reload["registration_count"] == 2


async def test_config_entry_manager_reports_foreign_panel_collision(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """The manager reports setup failure and preserves a colliding panel."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name="foreign-panel",
        module_url="/local/foreign-panel.js",
        require_admin=True,
    )
    foreign_panel = hass.data[frontend.DATA_PANELS][PANEL_URL_PATH]
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert async_get_runtime(hass).loaded_foundation_entry_ids == set()
    assert async_get_runtime(hass).workflow_probe_unsubscribe is None
    assert hass.data[frontend.DATA_PANELS][PANEL_URL_PATH] is foreign_panel


async def test_provider_entry_setup_and_unload_are_isolated_from_foundation(
    hass: HomeAssistant,
) -> None:
    """A validated provider lives only in its entry runtime until unload."""
    connection_id = "00000000-0000-4000-8000-000000000010"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    async_register_provider_entry_adapter(hass, SyntheticProviderEntryAdapter())

    assert await async_setup_entry(hass, entry)
    runtime = async_get_runtime(hass)
    assert runtime.loaded_provider_entry_ids == {entry.entry_id}
    assert runtime.loaded_foundation_entry_ids == set()
    assert entry.runtime_data is not None
    assert entry.runtime_data.connection_id == connection_id
    assert entry.runtime_data.provider_type == SYNTHETIC_PROVIDER_TYPE
    assert entry.runtime_data.validation.authenticated is True

    assert await async_unload_entry(hass, entry)
    assert runtime.loaded_provider_entry_ids == set()
    assert getattr(entry, "runtime_data", None) is None


@pytest.mark.parametrize(
    ("code", "exception_type"),
    [
        (ErrorCode.AUTHENTICATION, ConfigEntryAuthFailed),
        (ErrorCode.TIMEOUT, ConfigEntryNotReady),
        (ErrorCode.AUTHORIZATION, ConfigEntryError),
    ],
)
async def test_provider_setup_maps_only_safe_normalized_failures(
    hass: HomeAssistant,
    code: ErrorCode,
    exception_type: type[Exception],
) -> None:
    """Authentication, transient, and terminal failures have distinct HA states."""
    connection_id = "00000000-0000-4000-8000-000000000011"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    adapter = SyntheticProviderEntryAdapter(
        error=ProviderError(
            NormalizedError(code=code, message=SAFE_ERROR_MESSAGES[code]),
            retry_allowed=code is ErrorCode.TIMEOUT,
            failover_allowed=False,
        )
    )
    async_register_provider_entry_adapter(hass, adapter)

    with pytest.raises(exception_type, match=SAFE_ERROR_MESSAGES[code]):
        await async_setup_entry(hass, entry)

    assert async_get_runtime(hass).loaded_provider_entry_ids == set()
    assert getattr(entry, "runtime_data", None) is None


async def test_provider_setup_hides_unexpected_adapter_exception(
    hass: HomeAssistant,
) -> None:
    """Unexpected adapter text cannot cross the setup error boundary."""
    connection_id = "00000000-0000-4000-8000-000000000012"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    synthetic_secret = "synthetic-secret-adapter-body"  # noqa: S105
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(error=RuntimeError(synthetic_secret)),
    )

    with pytest.raises(ConfigEntryError, match="failed safely") as caught:
        await async_setup_entry(hass, entry)

    assert synthetic_secret not in str(caught.value)
    assert caught.value.__cause__ is None


async def test_provider_setup_uses_safe_text_for_malformed_provider_error(
    hass: HomeAssistant,
) -> None:
    """Even a forged ProviderError cannot control a Home Assistant message."""
    connection_id = "00000000-0000-4000-8000-000000000017"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    synthetic_marker = "synthetic-forged-provider-private-marker"
    forged = ProviderError.__new__(ProviderError)
    Exception.__init__(forged, synthetic_marker)
    forged.error = SimpleNamespace(  # type: ignore[assignment]
        code=ErrorCode.AUTHENTICATION,
        message=synthetic_marker,
        retry_hint_ms=None,
    )
    forged.retry_allowed = False
    forged.failover_allowed = False
    async_register_provider_entry_adapter(
        hass,
        SyntheticProviderEntryAdapter(error=forged),
    )

    with pytest.raises(ConfigEntryAuthFailed) as caught:
        await async_setup_entry(hass, entry)

    assert str(caught.value) == SAFE_ERROR_MESSAGES[ErrorCode.AUTHENTICATION]
    assert synthetic_marker not in str(caught.value)


async def test_foundation_version_one_migrates_without_provider_data(
    hass: HomeAssistant,
) -> None:
    """The installed empty foundation entry has one explicit migration."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
        version=1,
    )
    entry.add_to_hass(hass)

    assert await async_migrate_entry(hass, entry)
    assert entry.version == 2
    assert entry.minor_version == 1
    assert entry.data == {CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION}


async def test_migration_rejects_unknown_or_corrupt_entry_shapes(
    hass: HomeAssistant,
) -> None:
    """No pre-contract provider entry or mismatched identity is guessed."""
    unknown_v1 = MockConfigEntry(
        domain=DOMAIN,
        data={"unknown": True},
        unique_id="unknown-provider",
        version=1,
    )
    mismatched_v2 = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id="00000000-0000-4000-8000-000000000013",
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
        ),
        unique_id=provider_entry_unique_id("00000000-0000-4000-8000-000000000014"),
        version=2,
    )

    assert not await async_migrate_entry(hass, unknown_v1)
    assert not await async_migrate_entry(hass, mismatched_v2)


@pytest.mark.parametrize(
    ("version", "minor_version", "foundation"),
    [
        (0, 1, True),
        (0, 1, False),
        (-1, 1, True),
        (2, 0, True),
        (2, 2, False),
        (3, 1, False),
    ],
)
async def test_migration_rejects_every_unsupported_version(
    hass: HomeAssistant,
    version: int,
    minor_version: int,
    foundation: bool,
) -> None:
    """Only v1.1 foundation migration and exact current v2.1 are accepted."""
    connection_id = "00000000-0000-4000-8000-000000000018"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=(
            {CONF_ENTRY_KIND: ENTRY_KIND_FOUNDATION}
            if foundation
            else build_provider_entry_data(
                connection_id=connection_id,
                provider_type=SYNTHETIC_PROVIDER_TYPE,
                provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
            )
        ),
        unique_id=(
            FOUNDATION_ENTRY_UNIQUE_ID
            if foundation
            else provider_entry_unique_id(connection_id)
        ),
        version=version,
        minor_version=minor_version,
    )

    assert not await async_migrate_entry(hass, entry)
    assert entry.version == version
    assert entry.minor_version == minor_version


async def test_config_entry_manager_removes_loaded_provider_runtime(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """Home Assistant removal unloads provider runtime and deletes the entry."""
    connection_id = "00000000-0000-4000-8000-000000000015"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
        ),
        unique_id=provider_entry_unique_id(connection_id),
        version=2,
    )
    entry.add_to_hass(hass)
    async_register_provider_entry_adapter(hass, SyntheticProviderEntryAdapter())

    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    assert async_get_runtime(hass).loaded_provider_entry_ids == {entry.entry_id}

    assert await hass.config_entries.async_remove(entry.entry_id) == {
        "require_restart": False
    }
    await hass.async_block_till_done()

    assert async_get_runtime(hass).loaded_provider_entry_ids == set()
    assert hass.config_entries.async_get_entry(entry.entry_id) is None


async def test_config_entry_manager_starts_reauth_on_authentication_failure(
    hass: HomeAssistant,
    enable_custom_integrations: None,
) -> None:
    """The real HA manager converts normalized authentication into reauth."""
    connection_id = "00000000-0000-4000-8000-000000000016"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=connection_id,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-value"},
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

    with patch(
        "custom_components.ai_orchestrator.async_register_static_assets",
        new_callable=AsyncMock,
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.SETUP_ERROR
    matching_flows = [
        flow
        for flow in hass.config_entries.flow.async_progress_by_handler(DOMAIN)
        if flow["context"].get("source") == SOURCE_REAUTH
        and flow["context"].get("entry_id") == entry.entry_id
    ]
    assert len(matching_flows) == 1
