"""Live execution of execute-mode workflows through the manager (WFL-004)."""

import asyncio
from dataclasses import dataclass
from unittest.mock import AsyncMock

from homeassistant.core import HomeAssistant, ServiceCall
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator import async_unload_entry
from custom_components.ai_orchestrator.const import DOMAIN, FOUNDATION_ENTRY_UNIQUE_ID
from custom_components.ai_orchestrator.provider_entry import (
    ChatDestination,
    LoadedProviderConnection,
    async_register_provider_entry_adapter,
    build_provider_entry_data,
    provider_configuration_fingerprint,
    provider_entry_unique_id,
)
from custom_components.ai_orchestrator.providers.contract import (
    ConnectionValidationResult,
    TextGenerationResult,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.workflow_execution import (
    ERROR_NO_MESSAGE,
    ERROR_NO_PROVIDER,
    ERROR_TARGET_MISSING,
    async_execute_workflow,
)
from custom_components.ai_orchestrator.workflow_manager import WorkflowManager
from custom_components.ai_orchestrator.workflow_schema import parse_workflow
from custom_components.ai_orchestrator.workflow_steps import StepContext
from tests.home_assistant.provider_fakes import (
    SYNTHETIC_CONFIG_FIELD,
    SYNTHETIC_PROVIDER_TYPE,
    SyntheticProviderEntryAdapter,
)

CONNECTION_ID = "12345678-1234-4234-9234-123456789abc"
WORKFLOW_ID = "12345678-1234-4123-8123-123456789abc"
MARKER = "private-household-marker"
COMPOSED = "Please close the synthetic window."


def workflow(**overrides):
    document = {
        "schema_version": 1,
        "workflow_id": WORKFLOW_ID,
        "name": "Window reminder",
        "enabled": True,
        "run_mode": "execute",
        "provider_connection_id": CONNECTION_ID,
        "triggers": [
            {
                "kind": "state",
                "entity_ids": ["binary_sensor.synthetic_window"],
                "to_state": "on",
            }
        ],
        "conditions": [
            {
                "kind": "state",
                "entity_id": "binary_sensor.synthetic_window",
                "state": "on",
            }
        ],
        "steps": [
            {"step_id": "compose", "kind": "ai_compose", "prompt": "Write a reminder."},
            {
                "step_id": "notify",
                "kind": "notify",
                "notify_service": "notify.synthetic",
            },
        ],
    }
    document.update(overrides)
    return document


@dataclass
class LocalAdapter(SyntheticProviderEntryAdapter):
    chat_destination: ChatDestination | None = ChatDestination.LOCAL


def register_provider(hass: HomeAssistant, text=COMPOSED):
    async_register_provider_entry_adapter(hass, LocalAdapter())
    provider = AsyncMock()
    provider.generate.return_value = TextGenerationResult(text=text)
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=CONNECTION_ID,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: "synthetic-private-credential"},
        ),
        unique_id=provider_entry_unique_id(CONNECTION_ID),
        title="Synthetic local provider",
        version=2,
    )
    entry.add_to_hass(hass)
    entry.runtime_data = LoadedProviderConnection(
        connection_id=CONNECTION_ID,
        provider_type=SYNTHETIC_PROVIDER_TYPE,
        provider=provider,
        validation=ConnectionValidationResult(reachable=True, authenticated=True),
        configuration_fingerprint=provider_configuration_fingerprint(entry.data),
    )
    async_get_runtime(hass).loaded_provider_entry_ids.add(entry.entry_id)
    return provider, entry


def register_notify_service(hass: HomeAssistant):
    calls: list[ServiceCall] = []

    async def handler(call: ServiceCall) -> None:
        calls.append(call)

    hass.services.async_register("notify", "synthetic", handler)
    return calls


def register_notify_entity(hass: HomeAssistant):
    calls: list[ServiceCall] = []

    async def handler(call: ServiceCall) -> None:
        calls.append(call)

    hass.services.async_register("notify", "send_message", handler)
    hass.states.async_set("notify.synthetic", "unknown", {"friendly_name": "Synthetic"})
    return calls


async def start_manager(hass: HomeAssistant, document):
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic-foundation")
    manager = WorkflowManager(hass)
    runtime.workflow_manager = manager
    await manager.async_start()
    # Execution/lifecycle unit tests start from an already-reviewed fixture;
    # transport publication receipts are exercised separately.
    await manager.async_save({**document, "enabled": False})
    await manager._store.async_record_dry_run(
        manager.get(document["workflow_id"]), manager.publication_bindings(document)
    )
    await manager.async_save(document)
    return manager


def status(manager: WorkflowManager):
    return manager.status()["workflows"][0]["status"]


async def trigger(hass: HomeAssistant):
    hass.states.async_set("binary_sensor.synthetic_window", "off")
    await hass.async_block_till_done()
    hass.states.async_set("binary_sensor.synthetic_window", "on")
    await hass.async_block_till_done()


async def test_execute_mode_composes_and_delivers_through_legacy_service(
    hass, hass_storage
):
    provider, _ = register_provider(hass)
    calls = register_notify_service(hass)
    manager = await start_manager(hass, workflow())

    await trigger(hass)

    assert len(calls) == 1
    assert calls[0].domain == "notify"
    assert calls[0].service == "synthetic"
    assert calls[0].data == {"message": COMPOSED, "title": "Window reminder"}
    provider.generate.assert_awaited_once()
    prompt = provider.generate.await_args.args[0].messages[1].content
    assert "binary_sensor.synthetic_window: on" in prompt
    result = status(manager)
    assert result["executions"] == 1
    assert result["execution_failures"] == 0
    assert result["execution_running"] is False
    last = result["last_execution"]
    assert last["completed"] is True
    assert last["actions_executed"] == 1
    assert last["provider_calls"] == 1
    assert [step["status"] for step in last["steps"]] == ["ok", "delivered"]
    assert last["steps"][1]["target"] == "service"
    assert COMPOSED not in str(last)


async def test_execute_mode_delivers_through_notify_entity(hass, hass_storage):
    register_provider(hass)
    calls = register_notify_entity(hass)
    manager = await start_manager(hass, workflow())

    await trigger(hass)

    assert len(calls) == 1
    assert calls[0].service == "send_message"
    assert calls[0].data == {
        "entity_id": "notify.synthetic",
        "message": COMPOSED,
        "title": "Window reminder",
    }
    assert status(manager)["last_execution"]["steps"][1]["target"] == "entity"


async def test_observe_mode_never_executes(hass, hass_storage):
    provider, _ = register_provider(hass)
    calls = register_notify_service(hass)
    manager = await start_manager(hass, workflow(run_mode="observe"))

    await trigger(hass)

    assert calls == []
    provider.generate.assert_not_called()
    result = status(manager)
    assert result["observations"] == 1
    assert result["executions"] == 0
    assert result["last_execution"] is None


async def test_ineligible_outcome_never_executes(hass, hass_storage):
    provider, _ = register_provider(hass)
    calls = register_notify_service(hass)
    manager = await start_manager(
        hass,
        workflow(
            conditions=[
                {
                    "kind": "state",
                    "entity_id": "binary_sensor.synthetic_window",
                    "state": "off",
                }
            ]
        ),
    )

    await trigger(hass)

    assert calls == []
    provider.generate.assert_not_called()
    assert status(manager)["executions"] == 0


async def test_missing_target_fails_closed_without_guessing(hass, hass_storage):
    provider, _ = register_provider(hass)
    called = AsyncMock()
    hass.services.async_register("notify", "other", called)
    manager = await start_manager(hass, workflow())

    await trigger(hass)

    called.assert_not_called()
    provider.generate.assert_awaited_once()
    last = status(manager)["last_execution"]
    assert last["completed"] is False
    assert last["error"] == ERROR_TARGET_MISSING
    assert last["actions_executed"] == 0
    assert last["steps"][1]["status"] == "failed"
    assert status(manager)["execution_failures"] == 1


async def test_unavailable_provider_skips_every_step(hass, hass_storage):
    calls = register_notify_service(hass)
    manager = await start_manager(hass, workflow())

    await trigger(hass)

    assert calls == []
    last = status(manager)["last_execution"]
    assert last["error"] == ERROR_NO_PROVIDER
    assert [step["status"] for step in last["steps"]] == ["skipped", "skipped"]


async def test_malformed_model_output_stops_before_delivery(hass, hass_storage):
    provider, _ = register_provider(hass, text="   ")
    calls = register_notify_service(hass)
    manager = await start_manager(hass, workflow())

    await trigger(hass)

    assert calls == []
    last = status(manager)["last_execution"]
    assert last["error"] == "invalid_output"
    assert [step["status"] for step in last["steps"]] == ["failed", "skipped"]


async def test_concurrent_eligible_events_run_one_at_a_time(hass, hass_storage):
    provider, _ = register_provider(hass)
    release = asyncio.Event()

    async def slow(request):
        await release.wait()
        return TextGenerationResult(text=COMPOSED)

    provider.generate.side_effect = slow
    calls = register_notify_service(hass)
    manager = await start_manager(hass, workflow())

    hass.states.async_set("binary_sensor.synthetic_window", "off")
    await hass.async_block_till_done()
    hass.states.async_set("binary_sensor.synthetic_window", "on")
    await asyncio.sleep(0)
    hass.states.async_set("binary_sensor.synthetic_window", "off")
    await asyncio.sleep(0)
    hass.states.async_set("binary_sensor.synthetic_window", "on")
    await asyncio.sleep(0)
    assert status(manager)["execution_running"] is True
    release.set()
    await hass.async_block_till_done()

    assert len(calls) == 1
    result = status(manager)
    assert result["executions"] == 1
    assert result["skipped_busy"] == 1
    assert result["execution_running"] is False


async def test_disable_stops_execution_and_resets_evidence(hass, hass_storage):
    register_provider(hass)
    calls = register_notify_service(hass)
    manager = await start_manager(hass, workflow())
    await trigger(hass)
    assert len(calls) == 1

    await manager.async_set_enabled(WORKFLOW_ID, False)
    await trigger(hass)

    assert len(calls) == 1
    assert status(manager)["executions"] == 0
    assert status(manager)["last_execution"] is None


async def test_executor_requires_composed_text_for_notify(hass):
    calls = register_notify_service(hass)
    parsed = parse_workflow(
        workflow(
            provider_connection_id=None,
            steps=[
                {
                    "step_id": "notify",
                    "kind": "notify",
                    "notify_service": "notify.synthetic",
                }
            ],
        )
    )
    context = StepContext(
        workflow_name="x", event={"kind": "manual"}, time="20:00", states={}
    )
    record = await async_execute_workflow(hass, parsed, context, lambda _id: None)

    assert calls == []
    assert record["error"] == ERROR_NO_MESSAGE
    assert record["actions_executed"] == 0
    assert record["steps"][0]["status"] == "failed"
    assert MARKER not in str(record)


async def test_branch_not_taken_completes_without_delivery(hass, hass_storage):
    provider, _ = register_provider(hass)
    provider.generate.return_value = TextGenerationResult(
        text="", structured_output={"category": "routine"}
    )
    calls = register_notify_service(hass)
    manager = await start_manager(
        hass,
        workflow(
            steps=[
                {
                    "step_id": "classify",
                    "kind": "ai_classify",
                    "prompt": "Classify.",
                    "categories": ["urgent", "routine"],
                },
                {
                    "step_id": "gate",
                    "kind": "branch",
                    "when_step_id": "classify",
                    "when_category": "urgent",
                },
                {"step_id": "compose", "kind": "ai_compose", "prompt": "Write."},
                {
                    "step_id": "notify",
                    "kind": "notify",
                    "notify_service": "notify.synthetic",
                },
            ]
        ),
    )

    await trigger(hass)

    assert calls == []
    provider.generate.assert_awaited_once()
    last = status(manager)["last_execution"]
    assert last["completed"] is True
    assert last["error"] is None
    assert last["actions_executed"] == 0
    assert [step["status"] for step in last["steps"]] == [
        "ok",
        "not_taken",
        "skipped",
        "skipped",
    ]
    assert status(manager)["execution_failures"] == 0


async def test_disable_during_run_cancels_it_and_delivers_nothing(hass, hass_storage):
    provider, _ = register_provider(hass)
    release = asyncio.Event()

    async def slow(request):
        await release.wait()
        return TextGenerationResult(text=COMPOSED)

    provider.generate.side_effect = slow
    calls = register_notify_service(hass)
    manager = await start_manager(hass, workflow())
    hass.states.async_set("binary_sensor.synthetic_window", "off")
    await hass.async_block_till_done()
    hass.states.async_set("binary_sensor.synthetic_window", "on")
    await asyncio.sleep(0)
    assert status(manager)["execution_running"] is True

    await manager.async_set_enabled(WORKFLOW_ID, False)
    release.set()
    await hass.async_block_till_done()

    assert calls == []
    result = status(manager)
    assert result["execution_running"] is False
    assert result["executions"] == 0
    assert result["last_execution"] is None
    assert manager._running == set()  # noqa: SLF001


async def test_stop_during_run_cancels_it_so_a_new_manager_can_run(hass, hass_storage):
    provider, _ = register_provider(hass)
    release = asyncio.Event()

    async def slow(request):
        await release.wait()
        return TextGenerationResult(text=COMPOSED)

    provider.generate.side_effect = slow
    calls = register_notify_service(hass)
    manager = await start_manager(hass, workflow())
    hass.states.async_set("binary_sensor.synthetic_window", "off")
    await hass.async_block_till_done()
    hass.states.async_set("binary_sensor.synthetic_window", "on")
    await asyncio.sleep(0)

    assert manager.async_stop() is False
    release.set()
    await hass.async_block_till_done()
    assert calls == []

    provider.generate.side_effect = None
    provider.generate.return_value = TextGenerationResult(text=COMPOSED)
    await manager.async_start()
    await trigger(hass)
    assert len(calls) == 1
    assert status(manager)["executions"] == 1


async def test_observe_now_never_executes_manual_execute_workflow(hass, hass_storage):
    provider, _ = register_provider(hass)
    calls = register_notify_service(hass)
    manager = await start_manager(
        hass, workflow(triggers=[{"kind": "manual"}], conditions=[])
    )
    result = manager.run_manual(WORKFLOW_ID)
    await hass.async_block_till_done()
    assert result["eligible"] is True
    assert result["mode"] == "observation_only"
    provider.generate.assert_not_awaited()
    assert calls == []


async def test_pending_cancellation_keeps_guard_and_cannot_deliver(hass, hass_storage):
    provider, _ = register_provider(hass)
    started, cancelled, release = asyncio.Event(), asyncio.Event(), asyncio.Event()

    async def delayed_cancellation(request):
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()
        return TextGenerationResult(text=COMPOSED)

    provider.generate.side_effect = delayed_cancellation
    calls = register_notify_service(hass)
    document = workflow()
    manager = await start_manager(hass, document)
    snapshot = {"event": {"kind": "manual"}, "time": "20:00", "states": {}}
    manager._schedule_execution(document, snapshot)
    await started.wait()
    original_task = manager._tasks[WORKFLOW_ID]
    manager._deactivate(WORKFLOW_ID)
    await cancelled.wait()
    manager._activate(document)
    manager._schedule_execution(document, snapshot)
    try:
        assert WORKFLOW_ID in manager._running
        assert len(manager._tasks) == 1
        assert status(manager)["skipped_busy"] == 1
    finally:
        for task in list(manager._tasks.values()):
            if task is not original_task:
                task.cancel()
        release.set()
        await hass.async_block_till_done()
    assert calls == []
    assert manager._tasks == {}
    assert manager._running == set()
    provider.generate.side_effect = None
    provider.generate.return_value = TextGenerationResult(text=COMPOSED)
    manager._schedule_execution(document, snapshot)
    await hass.async_block_till_done()
    assert len(calls) == 1


async def test_provider_unload_cancels_execute_run(hass, hass_storage):
    provider, entry = register_provider(hass)
    started, release, cancelled = asyncio.Event(), asyncio.Event(), asyncio.Event()

    async def slow(request):
        started.set()
        try:
            await release.wait()
        except asyncio.CancelledError:
            cancelled.set()
            raise
        return TextGenerationResult(text=COMPOSED)

    provider.generate.side_effect = slow
    calls = register_notify_service(hass)
    document = workflow()
    manager = await start_manager(hass, document)
    manager._schedule_execution(
        document, {"event": {"kind": "manual"}, "time": "20:00", "states": {}}
    )
    await started.wait()
    assert await async_unload_entry(hass, entry)
    release.set()
    await hass.async_block_till_done()
    assert cancelled.is_set()
    assert calls == []


async def test_foundation_unload_retains_pending_manager_guard(hass, hass_storage):
    provider, _ = register_provider(hass)
    started, cancelled, release = asyncio.Event(), asyncio.Event(), asyncio.Event()

    async def resistant(request):
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()
        return TextGenerationResult(text=COMPOSED)

    provider.generate.side_effect = resistant
    calls = register_notify_service(hass)
    document = workflow()
    manager = await start_manager(hass, document)
    snapshot = {"event": {"kind": "manual"}, "time": "20:00", "states": {}}
    manager._schedule_execution(document, snapshot)
    await started.wait()
    foundation = MockConfigEntry(
        domain=DOMAIN, unique_id=FOUNDATION_ENTRY_UNIQUE_ID, data={}
    )
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids = {foundation.entry_id}
    assert await async_unload_entry(hass, foundation)
    await cancelled.wait()
    try:
        assert runtime.workflow_manager is manager
        await manager.async_start()
        manager._schedule_execution(document, snapshot)
        assert status(manager)["skipped_busy"] == 1
    finally:
        release.set()
        await hass.async_block_till_done()
    assert calls == []
    assert provider.generate.await_count == 1
