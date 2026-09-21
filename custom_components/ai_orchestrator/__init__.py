"""AI Orchestrator Home Assistant integration."""

from typing import Final, NoReturn

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import (
    ConfigEntryAuthFailed,
    ConfigEntryError,
    ConfigEntryNotReady,
)
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .action_ai_api import async_cancel_action_interpretations
from .action_manager import ActionManager
from .action_store import ActionStore
from .agent_store import AgentPolicyError, AgentStore, AgentStoreError
from .agent_tools import ObservationToolEngine
from .audit_lifecycle import AuditLifecycle
from .audit_store import AuditStore, AuditStoreError
from .chat import async_cancel_provider_chats
from .const import FOUNDATION_ENTRY_UNIQUE_ID
from .panel import (
    async_register_panel,
    async_register_static_assets,
    async_unregister_panel,
)
from .provider_entry import (
    ChatDestination,
    LoadedProviderConnection,
    async_register_provider_entry_adapter,
    copy_provider_config,
    foundation_entry_data,
    is_foundation_entry_data,
    parse_provider_entry_data,
    provider_configuration_fingerprint,
    validate_provider_entry_identity,
)
from .providers.azure_openai_v1 import (
    PROVIDER_TYPE as AZURE_PROVIDER_TYPE,
)
from .providers.azure_openai_v1 import (
    AzureOpenAIV1ProviderEntryAdapter,
)
from .providers.contract import (
    SAFE_ERROR_MESSAGES,
    ConnectionValidationResult,
    ErrorCode,
    ProviderError,
    safe_provider_error_code,
)
from .providers.lm_studio import (
    PROVIDER_TYPE as LM_STUDIO_PROVIDER_TYPE,
)
from .providers.lm_studio import (
    LMStudioProviderEntryAdapter,
)
from .runtime import async_get_runtime
from .websocket_api import async_register_websocket_commands
from .workflow_actions import WorkflowActions
from .workflow_draft_api import async_cancel_provider_drafts
from .workflow_dry_run_api import async_cancel_provider_dry_runs
from .workflow_manager import WorkflowManager, WorkflowManagerError
from .workflow_probe import (
    async_setup_workflow_probe,
    async_unload_workflow_probe,
)

type AIOrchestratorConfigEntry = ConfigEntry[LoadedProviderConnection | None]

# The conversation entity is the only entity platform this integration owns.
PROVIDER_PLATFORMS: Final = (Platform.CONVERSATION,)

_TRANSIENT_SETUP_ERRORS = {
    ErrorCode.CONNECTION,
    ErrorCode.DNS,
    ErrorCode.PROVIDER_UNAVAILABLE,
    ErrorCode.RATE_LIMITED,
    ErrorCode.TIMEOUT,
    ErrorCode.TLS,
}


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up integration-wide static and authenticated API surfaces."""
    runtime = async_get_runtime(hass)
    session = None
    for provider_type, factory in (
        (LM_STUDIO_PROVIDER_TYPE, LMStudioProviderEntryAdapter),
        (AZURE_PROVIDER_TYPE, AzureOpenAIV1ProviderEntryAdapter),
    ):
        if provider_type not in runtime.provider_entry_adapters:
            if session is None:
                session = async_get_clientsession(hass)
            async_register_provider_entry_adapter(hass, factory(session))
    await async_register_static_assets(hass)
    async_register_websocket_commands(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    """Set up either the foundation or one provider connection entry."""
    if entry.unique_id != FOUNDATION_ENTRY_UNIQUE_ID:
        return await _async_setup_provider_entry(hass, entry)

    if entry.version >= 2 and not is_foundation_entry_data(entry.data):
        raise ConfigEntryError("AI Orchestrator foundation entry data is invalid")

    runtime = async_get_runtime(hass)
    if entry.entry_id in runtime.loaded_foundation_entry_ids:
        return True

    if not runtime.loaded_foundation_entry_ids:
        if runtime.agent_store is None:
            runtime.agent_store = AgentStore(hass)
        try:
            await runtime.agent_store.async_load()
        except AgentStoreError:
            # A failed policy load leaves all scope operations unavailable.
            # Keep unrelated foundation features usable; never replace the store.
            pass
        if runtime.agent_tool_engine is None:
            runtime.agent_tool_engine = ObservationToolEngine(hass)
        if runtime.action_store is None:
            runtime.action_store = ActionStore(hass)
        try:
            await runtime.action_store.async_load()
        except AgentStoreError:
            pass  # Unreadable grants remain unavailable; never replace with defaults.
        if runtime.audit_store is None:
            runtime.audit_store = AuditStore(hass)
        if runtime.workflow_manager is None:
            runtime.workflow_manager = WorkflowManager(hass)
        if runtime.workflow_actions is None:
            runtime.workflow_actions = WorkflowActions(
                hass, runtime.workflow_manager, runtime.audit_store
            )
        runtime.workflow_manager.set_action_service(runtime.workflow_actions)
        runtime.workflow_manager.async_stop()
        runtime.workflow_actions.stop()
        try:
            await runtime.workflow_manager.async_wait_stopped()
            await runtime.workflow_actions.async_wait_stopped()
        except WorkflowManagerError, AgentPolicyError:
            raise ConfigEntryNotReady("Previous workflows are still stopping") from None
        if runtime.action_manager is None:
            runtime.action_manager = ActionManager(
                hass, runtime.action_store, runtime.audit_store
            )
        if runtime.audit_lifecycle is None:
            runtime.audit_lifecycle = AuditLifecycle(
                hass, runtime.audit_store, runtime.action_manager.async_expire_proposals
            )
        try:
            # Finish prior final-result writes before journal crash recovery.
            runtime.action_manager.stop()
            await runtime.action_manager.async_wait_stopped()
            await runtime.audit_lifecycle.async_start()
            await runtime.action_manager.async_start()
            await runtime.workflow_actions.async_start()
        except AgentPolicyError, AgentStoreError, AuditStoreError:
            # Keep actions closed while unrelated foundation features remain usable.
            runtime.audit_lifecycle.stop()
            if runtime.action_manager is not None:
                runtime.action_manager.stop()
            runtime.workflow_actions.stop()
        try:
            runtime.owns_panel = await async_register_panel(hass)
            async_setup_workflow_probe(hass)
            # A manager left over from failed cleanup retries that cleanup first.
            await runtime.workflow_manager.async_start()
        except BaseException:
            runtime.audit_lifecycle.stop()
            if runtime.action_manager is not None:
                runtime.action_manager.stop()
            runtime.workflow_actions.stop()
            async_unload_workflow_probe(hass)
            if runtime.workflow_manager is not None:
                runtime.workflow_manager.async_stop()
            if runtime.owns_panel:
                async_unregister_panel(hass)
                runtime.owns_panel = False
            raise
    runtime.loaded_foundation_entry_ids.add(entry.entry_id)
    entry.runtime_data = None
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    """Unload either the foundation or one provider connection entry."""
    runtime = async_get_runtime(hass)
    if entry.unique_id != FOUNDATION_ENTRY_UNIQUE_ID:
        loaded = getattr(entry, "runtime_data", None)
        if entry.entry_id in runtime.conversation_entry_ids:
            if not await hass.config_entries.async_unload_platforms(
                entry, PROVIDER_PLATFORMS
            ):
                return False
            runtime.conversation_entry_ids.discard(entry.entry_id)
        if isinstance(loaded, LoadedProviderConnection):
            if runtime.action_manager is not None:
                runtime.action_manager.cancel_provider(loaded.connection_id)
            if runtime.agent_tool_engine is not None:
                runtime.agent_tool_engine.cancel_provider(loaded.connection_id)
            runtime.provider_test_statuses.pop(loaded.connection_id, None)
            if runtime.workflow_manager is not None:
                runtime.workflow_manager.async_cancel_provider_runs(
                    loaded.connection_id
                )
        runtime.loaded_provider_entry_ids.discard(entry.entry_id)
        entry.runtime_data = None
        async_cancel_provider_chats(hass, entry.entry_id)
        async_cancel_provider_dry_runs(hass, entry.entry_id)
        async_cancel_provider_drafts(hass, entry.entry_id)
        async_cancel_action_interpretations(hass, entry.entry_id)
        return True

    runtime.loaded_foundation_entry_ids.discard(entry.entry_id)
    if runtime.loaded_foundation_entry_ids:
        return True

    async_unload_workflow_probe(hass)
    if runtime.action_manager is not None:
        runtime.action_manager.stop()
    if runtime.workflow_actions is not None:
        runtime.workflow_actions.stop()
    if runtime.audit_lifecycle is not None:
        runtime.audit_lifecycle.stop()
    for _, task in list(runtime.workflow_draft_tasks.values()):
        task.cancel()
    for _, task in list(runtime.action_ai_tasks.values()):
        task.cancel()
    if runtime.agent_tool_engine is not None:
        # Retain task ownership across reload until pending cancellation finishes.
        runtime.agent_tool_engine.stop()
    if runtime.workflow_manager is not None:
        # Retain owners until final writes settle; setup drains before recovery.
        runtime.workflow_manager.async_stop()
    if runtime.owns_panel:
        async_unregister_panel(hass)
        runtime.owns_panel = False
    return True


async def async_migrate_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    """Migrate only the known version-1 foundation entry to version 2."""
    if entry.version == 1 and entry.minor_version == 1:
        if entry.unique_id != FOUNDATION_ENTRY_UNIQUE_ID or entry.data:
            return False
        hass.config_entries.async_update_entry(
            entry,
            data=foundation_entry_data(),
            version=2,
            minor_version=1,
        )
        return True
    if entry.version != 2 or entry.minor_version != 1:
        return False
    if entry.unique_id == FOUNDATION_ENTRY_UNIQUE_ID:
        return is_foundation_entry_data(entry.data)
    try:
        parsed = parse_provider_entry_data(entry.data)
        validate_provider_entry_identity(entry.unique_id, parsed)
    except TypeError, ValueError:
        return False
    return True


async def _async_setup_provider_entry(
    hass: HomeAssistant, entry: AIOrchestratorConfigEntry
) -> bool:
    runtime = async_get_runtime(hass)
    if entry.entry_id in runtime.loaded_provider_entry_ids:
        return True
    try:
        parsed = parse_provider_entry_data(entry.data)
        validate_provider_entry_identity(entry.unique_id, parsed)
    except (TypeError, ValueError) as err:
        raise ConfigEntryError("Provider config entry data is invalid") from err
    adapter = runtime.provider_entry_adapters.get(parsed.provider_type)
    if adapter is None:
        raise ConfigEntryError("Provider type is not registered")
    configuration_fingerprint = provider_configuration_fingerprint(entry.data)
    try:
        provider = await adapter.async_create_provider(
            copy_provider_config(parsed.provider_config)
        )
        validation = await provider.validate_connection()
    except ProviderError as err:
        _raise_provider_setup_error(err)
    except Exception:  # noqa: BLE001 -- adapter details must stay backend-only.
        raise ConfigEntryError("Provider setup failed safely") from None
    if not isinstance(validation, ConnectionValidationResult):
        raise ConfigEntryError("Provider returned invalid connection validation data")
    entry.runtime_data = LoadedProviderConnection(
        connection_id=parsed.connection_id,
        provider_type=parsed.provider_type,
        provider=provider,
        validation=validation,
        configuration_fingerprint=configuration_fingerprint,
    )
    runtime.provider_test_statuses.pop(parsed.connection_id, None)
    runtime.loaded_provider_entry_ids.add(entry.entry_id)
    if getattr(adapter, "chat_destination", None) is ChatDestination.LOCAL:
        await hass.config_entries.async_forward_entry_setups(entry, PROVIDER_PLATFORMS)
        runtime.conversation_entry_ids.add(entry.entry_id)
    return True


def _raise_provider_setup_error(error: ProviderError) -> NoReturn:
    code = safe_provider_error_code(error)
    message = (
        SAFE_ERROR_MESSAGES[code]
        if code is not None
        else "Provider setup failed safely"
    )
    if code is ErrorCode.AUTHENTICATION:
        raise ConfigEntryAuthFailed(message) from None
    if code in _TRANSIENT_SETUP_ERRORS:
        raise ConfigEntryNotReady(message) from None
    raise ConfigEntryError(message) from None
