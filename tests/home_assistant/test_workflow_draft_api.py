"""AI draft transport: explicitly selected context, no save or action authority."""

import asyncio
import copy
import json
import re
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest

from custom_components.ai_orchestrator.providers.contract import (
    SAFE_ERROR_MESSAGES,
    ErrorCode,
    NormalizedError,
    ProviderError,
    TextGenerationResult,
    ToolCall,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.workflow_draft_api import (
    SYSTEM,
    WORKFLOW_DRAFT_SOURCE_WEBSOCKET_TYPE,
    WORKFLOW_DRAFT_WEBSOCKET_TYPE,
    DraftStage,
    DraftValidationError,
    _draft,
    async_cancel_provider_drafts,
)
from custom_components.ai_orchestrator.workflow_manager import (
    WorkflowManager,
    WorkflowManagerError,
)
from tests.home_assistant.test_workflow_dry_run_api import (
    CONNECTION_ID,
    WORKFLOW,
    call,
    setup,
)
from tests.providers.test_lm_studio import json_response, provider_with

DRAFT = {
    key: copy.deepcopy(WORKFLOW[key])
    for key in ("name", "triggers", "conditions", "steps")
}
DRAFT["description"] = "Synthetic draft"


@pytest.mark.parametrize("valid", [True, False])
async def test_real_adapter_schema_transport_and_no_text_retry(
    hass, hass_ws_client, hass_storage, valid
):
    provider, _ = await prepare(hass)
    real_provider, session = provider_with(
        json_response(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(DRAFT)
                            if valid
                            else "PRIVATE_NOT_JSON"
                        },
                        "finish_reason": "stop",
                    }
                ]
            }
        )
    )
    provider.generate.side_effect = real_provider.generate
    client = await hass_ws_client(hass)
    before = copy.deepcopy(hass_storage)
    with patch.object(
        type(hass.services), "async_call", new_callable=AsyncMock
    ) as action:
        response = await call(client, message())
    assert response["success"] is valid
    assert len(session.requests) == 1
    body = session.requests[0]["json"]
    assert body["response_format"]["type"] == "json_schema"
    assert body["response_format"]["json_schema"]["strict"] is True
    assert "tools" not in body
    assert hass_storage == before
    action.assert_not_called()
    if valid:
        assert response["result"]["workflow"]["enabled"] is False
        assert response["result"]["saved"] is False
    else:
        assert response["error"]["code"] == "draft_provider_failed"
        assert "PRIVATE" not in json.dumps(response)


async def test_valid_text_without_structured_result_is_rejected(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    provider.generate.return_value = TextGenerationResult(text=json.dumps(DRAFT))
    response = await call(await hass_ws_client(hass), message())
    assert response["error"]["code"] == "draft_invalid_result"
    provider.generate.assert_awaited_once()


@pytest.mark.parametrize(
    "fresh_user",
    [
        None,
        SimpleNamespace(is_active=False, is_admin=True),
        SimpleNamespace(is_active=True, is_admin=False),
    ],
)
async def test_fresh_authorization_revoked_during_generation(
    hass, hass_ws_client, hass_storage, hass_admin_user, fresh_user
):
    provider, _ = await prepare(hass)
    client = await hass_ws_client(hass)
    with patch.object(
        type(hass.auth),
        "async_get_user",
        new=AsyncMock(side_effect=[hass_admin_user, fresh_user]),
    ):
        response = await call(client, message())
    assert response["error"]["code"] == "draft_provider_unavailable"
    assert "workflow" not in response
    provider.generate.assert_awaited_once()


async def test_wrong_variant_fields_still_fail_after_transport_accepts(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    provider.generate.return_value = TextGenerationResult(
        text="",
        structured_output={
            **DRAFT,
            "steps": [{"step_id": "send", "kind": "notify", "prompt": "PRIVATE"}],
        },
    )
    response = await call(await hass_ws_client(hass), message())
    assert response["error"]["code"] == "draft_invalid_schema"
    assert "PRIVATE" not in json.dumps(response)


def test_complete_system_step_examples_satisfy_actual_parser():
    examples = [
        json.JSONDecoder().raw_decode(SYSTEM[match.start() :])[0]
        for match in re.finditer(r'\{"step_id":', SYSTEM)
    ]
    assert len(examples) == 5
    examples[-1]["notify_service"] = "notify.synthetic"
    result = _draft(
        json.dumps({**DRAFT, "steps": examples}),
        CONNECTION_ID,
        ["binary_sensor.synthetic_window"],
        ["notify.synthetic"],
    )
    assert len(result["steps"]) == 5
    assert "All five top-level fields are REQUIRED" in SYSTEM


@pytest.mark.parametrize(
    "output,stage",
    [
        ({}, DraftStage.FIELDS),
        ({**DRAFT, "description": None}, DraftStage.SCHEMA),
        (None, DraftStage.RESULT),
        ({**DRAFT, "name": "x" * 32769}, DraftStage.RESULT),
    ],
)
async def test_validation_stage_is_static_without_saving(
    hass, hass_ws_client, hass_storage, output, stage
):
    provider, _ = await prepare(hass)
    provider.generate.return_value = TextGenerationResult(
        text="", structured_output=output
    )
    client = await hass_ws_client(hass)
    before = copy.deepcopy(hass_storage)
    result = await call(client, message())
    assert result["error"] == {
        "code": stage.value,
        "message": "The generated draft failed validation.",
    }
    assert hass_storage == before


async def test_forged_diagnostic_stage_cannot_echo_provider_text(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    error = DraftValidationError(DraftStage.JSON)
    error.stage = "PRIVATE_FORGED_STAGE"
    provider.generate.side_effect = error
    result = await call(await hass_ws_client(hass), message())
    assert result["error"]["code"] == "draft_invalid_response"
    assert "PRIVATE" not in json.dumps(result)


def message(**changes):
    return {
        "type": WORKFLOW_DRAFT_WEBSOCKET_TYPE,
        "connection_id": CONNECTION_ID,
        "prompt": "Draft a window notification",
        "entity_ids": ["binary_sensor.synthetic_window"],
        "notify_targets": ["notify.synthetic"],
        **changes,
    }


async def prepare(hass):
    provider, entry = await setup(hass, save=False)
    # setup() invokes production async_register_websocket_commands, so these
    # transport tests also prove both draft commands are actually registered.
    hass.states.async_set(
        "binary_sensor.synthetic_window", "off", {"private": "UNSENT_ATTRIBUTE"}
    )
    hass.states.async_set("sensor.private_unselected", "UNSENT_STATE")
    hass.states.async_set("sensor.unselected", "on")
    hass.states.async_set("notify.synthetic", "unknown")
    provider.generate.return_value = TextGenerationResult(
        text="", structured_output=DRAFT
    )
    return provider, entry


async def test_valid_disabled_unsaved_draft_exact_selected_context(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    client = await hass_ws_client(hass)
    before = copy.deepcopy(hass_storage)
    with patch.object(
        type(hass.services), "async_call", new_callable=AsyncMock
    ) as action:
        response = await call(client, message())
    assert response["success"]
    result = response["result"]
    assert result.keys() == {
        "schema_version",
        "destination",
        "provider_calls",
        "actions_executed",
        "saved",
        "workflow",
    }
    assert result["destination"] == "local" and result["provider_calls"] == 1
    assert result["actions_executed"] == 0 and result["saved"] is False
    document = result["workflow"]
    assert document["enabled"] is False and document["run_mode"] == "execute"
    assert document["provider_connection_id"] == CONNECTION_ID
    assert UUID(document["workflow_id"]).version == 4
    request = provider.generate.call_args.args[0]
    assert json.loads(request.messages[1].content) == {
        "request": message()["prompt"],
        "entity_ids": message()["entity_ids"],
        "notify_targets": message()["notify_targets"],
    }
    assert not request.tools and request.output_schema.name == "workflow_draft"
    assert "UNSENT" not in repr(request) and "private_unselected" not in repr(request)
    action.assert_not_called()
    assert hass_storage == before
    assert async_get_runtime(hass).workflow_manager.status()["workflows"] == []


async def test_non_admin_denied(
    hass, hass_ws_client, hass_storage, hass_read_only_access_token
):
    provider, _ = await prepare(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    response = await call(client, message())
    assert response["error"]["code"] == "unauthorized"
    provider.generate.assert_not_called()


@pytest.mark.parametrize(
    "changes",
    [
        {"entity_ids": ["sensor.invented"]},
        {"notify_targets": ["notify.invented"]},
        {"prompt": "   "},
        {"entity_ids": ["binary_sensor.synthetic_window"] * 2},
        {"notify_targets": ["notify.synthetic"] * 9},
    ],
)
async def test_invalid_selection_no_provider(
    hass, hass_ws_client, hass_storage, changes
):
    provider, _ = await prepare(hass)
    response = await call(await hass_ws_client(hass), message(**changes))
    assert response["success"] is False
    provider.generate.assert_not_called()


@pytest.mark.parametrize(
    "change",
    [
        {"enabled": True},
        {"workflow_id": WORKFLOW["workflow_id"]},
        {"run_mode": "execute"},
        {"provider_connection_id": CONNECTION_ID},
        {"schema_version": 1},
        {"triggers": [{"kind": "state", "entity_ids": ["sensor.unselected"]}]},
        {
            "conditions": [
                {"kind": "state", "entity_id": "sensor.unselected", "state": "on"}
            ]
        },
        {
            "steps": [
                {"step_id": "compose", "kind": "ai_compose", "prompt": "Hi"},
                {
                    "step_id": "send",
                    "kind": "notify",
                    "notify_service": "notify.unselected",
                },
            ]
        },
        {
            "steps": [
                {"step_id": "run", "kind": "call_service", "service": "light.turn_on"}
            ]
        },
        {
            "steps": [
                {
                    "step_id": "send",
                    "kind": "notify",
                    "notify_service": "notify.synthetic",
                }
            ]
        },
    ],
)
async def test_model_cannot_expand_scope_or_execution_fields(
    hass, hass_ws_client, hass_storage, change
):
    provider, _ = await prepare(hass)
    provider.generate.return_value = TextGenerationResult(
        text="", structured_output={**DRAFT, **change}
    )
    response = await call(await hass_ws_client(hass), message())
    if set(change) & {
        "enabled",
        "workflow_id",
        "run_mode",
        "provider_connection_id",
        "schema_version",
    }:
        expected = "draft_invalid_fields"
    elif (
        "triggers" in change
        or "conditions" in change
        or "unselected" in json.dumps(change)
    ):
        expected = "draft_invalid_references"
    elif change["steps"][0]["kind"] == "notify":
        expected = "draft_invalid_notify_order"
    else:
        expected = "draft_invalid_schema"
    assert response["error"]["code"] == expected
    assert "unselected" not in json.dumps(response)


@pytest.mark.parametrize(
    "response",
    [
        TextGenerationResult(text="PRIVATE_BAD_JSON"),
        TextGenerationResult(text="x" * 32769),
        TextGenerationResult(text='{"name":"a","name":"b"}'),
        TextGenerationResult(
            text="{}", tool_calls=(ToolCall("call1", "secret_tool", {}),)
        ),
        TextGenerationResult(text="{}", structured_output={"name": float("inf")}),
    ],
)
async def test_malformed_provider_output_static(
    hass, hass_ws_client, hass_storage, response
):
    provider, _ = await prepare(hass)
    provider.generate.return_value = response
    result = await call(await hass_ws_client(hass), message())
    assert result["error"]["code"] == "draft_invalid_result"
    assert "PRIVATE" not in json.dumps(result)


@pytest.mark.parametrize(
    "mutate",
    ["cancel", "removed", "provider_changed", "foundation_removed", "target_removed"],
)
async def test_pending_draft_rechecks_lifecycle(
    hass, hass_ws_client, hass_storage, mutate
):
    provider, entry = await prepare(hass)
    started, release = asyncio.Event(), asyncio.Event()

    async def slow(request):
        started.set()
        await release.wait()
        return TextGenerationResult(text="", structured_output=DRAFT)

    provider.generate.side_effect = slow
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message())
    await started.wait()
    runtime = async_get_runtime(hass)
    busy = await call(client, message())
    assert busy["error"]["code"] == "draft_busy"
    if mutate == "cancel":
        async_cancel_provider_drafts(hass, entry.entry_id)
    elif mutate == "removed":
        runtime.loaded_provider_entry_ids.clear()
    elif mutate == "provider_changed":
        entry.runtime_data = None
    elif mutate == "foundation_removed":
        runtime.loaded_foundation_entry_ids.clear()
    else:
        hass.states.async_remove("notify.synthetic")
    release.set()
    result = await client.receive_json()
    assert result["success"] is False
    assert runtime.workflow_draft_tasks == {}
    assert provider.generate.await_count == 1


async def test_timeout_is_bounded_and_static(hass, hass_ws_client, hass_storage):
    provider, _ = await prepare(hass)

    async def slow(request):
        await asyncio.Event().wait()

    provider.generate.side_effect = slow
    with patch(
        "custom_components.ai_orchestrator.workflow_draft_api.TIMEOUT_SECONDS", 0.01
    ):
        result = await call(await hass_ws_client(hass), message())
    assert result["error"]["code"] == "draft_timeout"
    assert async_get_runtime(hass).workflow_draft_tasks == {}


async def test_missing_local_provider_does_not_generate(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    with patch(
        "custom_components.ai_orchestrator.workflow_draft_api._local_connections",
        return_value=[],
    ):
        result = await call(await hass_ws_client(hass), message())
    assert result["error"]["code"] == "draft_provider_unavailable"
    provider.generate.assert_not_called()


async def test_global_concurrency_bound(hass, hass_ws_client, hass_storage):
    provider, entry = await prepare(hass)
    runtime = async_get_runtime(hass)
    pending = asyncio.create_task(asyncio.Event().wait())
    runtime.workflow_draft_tasks.update(
        {str(index): (entry.entry_id, pending) for index in range(4)}
    )
    try:
        result = await call(await hass_ws_client(hass), message())
        assert result["error"]["code"] == "draft_busy"
        provider.generate.assert_not_called()
    finally:
        pending.cancel()
        with pytest.raises(asyncio.CancelledError):
            await pending
        runtime.workflow_draft_tasks.clear()


async def test_provider_exception_is_static(hass, hass_ws_client, hass_storage):
    provider, _ = await prepare(hass)
    provider.generate.side_effect = RuntimeError("PRIVATE_PROVIDER_ERROR")
    result = await call(await hass_ws_client(hass), message())
    assert result["error"]["code"] == "draft_invalid_response"
    assert "PRIVATE" not in json.dumps(result)


@pytest.mark.parametrize("code", list(ErrorCode))
async def test_normalized_provider_failure_is_classified_without_details(
    hass, hass_ws_client, hass_storage, code
):
    provider, _ = await prepare(hass)
    error = ProviderError(
        NormalizedError(code=code, message=SAFE_ERROR_MESSAGES[code]),
        retry_allowed=False,
        failover_allowed=False,
    )
    error.args = ("PRIVATE_PROVIDER_ERROR",)
    provider.generate.side_effect = error
    client = await hass_ws_client(hass)
    before = copy.deepcopy(hass_storage)
    response = await call(client, message())
    expected = {
        ErrorCode.TIMEOUT: "draft_timeout",
        ErrorCode.CANCELLED: "draft_cancelled",
    }.get(code, "draft_provider_failed")
    if code in {
        ErrorCode.AUTHENTICATION,
        ErrorCode.AUTHORIZATION,
        ErrorCode.NOT_FOUND,
        ErrorCode.PROVIDER_UNAVAILABLE,
        ErrorCode.CONNECTION,
        ErrorCode.TLS,
        ErrorCode.DNS,
    }:
        expected = "draft_provider_unavailable"
    assert response["error"]["code"] == expected
    assert "PRIVATE" not in json.dumps(response)
    assert hass_storage == before
    assert async_get_runtime(hass).workflow_draft_tasks == {}


async def test_malformed_provider_failure_does_not_expose_payload(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    error = ProviderError(
        NormalizedError(
            code=ErrorCode.TIMEOUT, message=SAFE_ERROR_MESSAGES[ErrorCode.TIMEOUT]
        ),
        retry_allowed=False,
        failover_allowed=False,
    )
    error.error = "PRIVATE_MALFORMED"
    provider.generate.side_effect = error
    response = await call(await hass_ws_client(hass), message())
    assert response["error"]["code"] == "draft_provider_failed"
    assert "PRIVATE" not in json.dumps(response)


async def test_suppressed_deadline_cannot_return_success(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)

    async def slow(request):
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            return TextGenerationResult(text="", structured_output=DRAFT)

    provider.generate.side_effect = slow
    with patch(
        "custom_components.ai_orchestrator.workflow_draft_api.TIMEOUT_SECONDS", 0.01
    ):
        response = await call(await hass_ws_client(hass), message())
    assert response["error"]["code"] == "draft_timeout"
    assert async_get_runtime(hass).workflow_draft_tasks == {}


async def test_cancel_suppressing_provider_cannot_return_a_draft(
    hass, hass_ws_client, hass_storage
):
    provider, entry = await prepare(hass)
    started = asyncio.Event()

    async def slow(request):
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            return TextGenerationResult(text="", structured_output=DRAFT)

    provider.generate.side_effect = slow
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message())
    await started.wait()
    async_cancel_provider_drafts(hass, entry.entry_id)
    result = await client.receive_json()
    assert result["error"]["code"] == "draft_provider_unavailable"
    assert async_get_runtime(hass).workflow_draft_tasks == {}


async def source_for(client, workflow_id=WORKFLOW["workflow_id"]):
    response = await call(
        client,
        {
            "type": WORKFLOW_DRAFT_SOURCE_WEBSOCKET_TYPE,
            "source_workflow_id": workflow_id,
        },
    )
    assert response["success"]
    return response["result"]["source"]


async def test_source_lookup_is_server_versioned_and_side_effect_free(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    manager = async_get_runtime(hass).workflow_manager
    stored = await manager.async_save(WORKFLOW)
    client = await hass_ws_client(hass)
    before = copy.deepcopy(hass_storage)
    with patch.object(
        type(hass.services), "async_call", new_callable=AsyncMock
    ) as action:
        source = await source_for(client)
    assert source.keys() == {
        "workflow_id",
        "version",
        "workflow",
        "entity_ids",
        "notify_targets",
    }
    assert source["workflow"] == stored
    assert source["workflow_id"] == stored["workflow_id"]
    assert len(source["version"]) == 64 and int(source["version"], 16) >= 0
    assert source["entity_ids"] == ["binary_sensor.synthetic_window"]
    assert source["notify_targets"] == ["notify.synthetic"]
    assert (await source_for(client))["version"] == source["version"]
    provider.generate.assert_not_called()
    action.assert_not_called()
    assert hass_storage == before
    await manager.async_save({**stored, "name": "Changed source"})
    assert (await source_for(client))["version"] != source["version"]


async def test_refinement_returns_unsaved_new_copy_and_source_provenance(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    manager = async_get_runtime(hass).workflow_manager
    stored = await manager.async_save({**WORKFLOW, "enabled": True})
    client = await hass_ws_client(hass)
    source = await source_for(client)
    before = copy.deepcopy(hass_storage)
    with patch.object(
        type(hass.services), "async_call", new_callable=AsyncMock
    ) as action:
        result = await call(
            client,
            message(
                source_workflow_id=source["workflow_id"],
                source_version=source["version"],
            ),
        )
    assert result["success"]
    response = result["result"]
    assert response["source"] == {
        "workflow_id": source["workflow_id"],
        "version": source["version"],
    }
    assert response["workflow"]["workflow_id"] != stored["workflow_id"]
    assert response["workflow"]["enabled"] is False
    assert response["saved"] is False and response["actions_executed"] == 0
    sent = json.loads(provider.generate.call_args.args[0].messages[1].content)
    assert sent["source_workflow"] == {key: stored[key] for key in DRAFT}
    assert (
        not {
            "enabled",
            "workflow_id",
            "provider_connection_id",
            "schema_version",
            "run_mode",
        }
        & sent["source_workflow"].keys()
    )
    assert "UNSENT" not in json.dumps(sent)
    assert hass_storage == before and manager.get(stored["workflow_id"]) == stored
    action.assert_not_called()


async def test_source_lookup_nonadmin_denied(
    hass, hass_ws_client, hass_storage, hass_read_only_access_token
):
    provider, _ = await prepare(hass)
    await async_get_runtime(hass).workflow_manager.async_save(WORKFLOW)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    result = await call(
        client,
        {
            "type": WORKFLOW_DRAFT_SOURCE_WEBSOCKET_TYPE,
            "source_workflow_id": WORKFLOW["workflow_id"],
        },
    )
    assert result["error"]["code"] == "unauthorized"
    provider.generate.assert_not_called()


@pytest.mark.parametrize(
    "change",
    [
        "missing_id",
        "missing_version",
        "wrong_version",
        "missing_entity",
        "missing_target",
        "deleted",
        "edited",
        "source_body",
    ],
)
async def test_invalid_source_or_unselected_source_rejected_before_provider(
    hass, hass_ws_client, hass_storage, change
):
    provider, _ = await prepare(hass)
    manager = async_get_runtime(hass).workflow_manager
    stored = await manager.async_save(WORKFLOW)
    client = await hass_ws_client(hass)
    source = await source_for(client)
    request = message(
        source_workflow_id=source["workflow_id"], source_version=source["version"]
    )
    if change == "missing_id":
        del request["source_workflow_id"]
    elif change == "missing_version":
        del request["source_version"]
    elif change == "wrong_version":
        request["source_version"] = "0" * 64
    elif change == "missing_entity":
        request["entity_ids"] = []
    elif change == "missing_target":
        request["notify_targets"] = []
    elif change == "deleted":
        await manager.async_delete(stored["workflow_id"])
    elif change == "edited":
        await manager.async_save({**stored, "description": "Edited"})
    else:
        request["source_workflow"] = stored
    result = await call(client, request)
    assert not result["success"]
    provider.generate.assert_not_called()


@pytest.mark.parametrize(
    "change", ["edited", "deleted", "manager_replaced", "store_unreadable"]
)
async def test_refinement_discards_source_changed_during_generation(
    hass, hass_ws_client, hass_storage, change
):
    provider, _ = await prepare(hass)
    runtime = async_get_runtime(hass)
    manager = runtime.workflow_manager
    stored = await manager.async_save(WORKFLOW)
    client = await hass_ws_client(hass)
    source = await source_for(client)
    started, release = asyncio.Event(), asyncio.Event()

    async def slow(request):
        started.set()
        await release.wait()
        return TextGenerationResult(text="", structured_output=DRAFT)

    provider.generate.side_effect = slow
    await client.send_json_auto_id(
        message(
            source_workflow_id=source["workflow_id"], source_version=source["version"]
        )
    )
    await started.wait()
    if change == "edited":
        await manager.async_save({**stored, "description": "Later edit"})
    elif change == "deleted":
        await manager.async_delete(stored["workflow_id"])
    elif change == "manager_replaced":
        replacement = WorkflowManager(hass)
        await replacement.async_start()
        runtime.workflow_manager = replacement
    else:
        manager.get = lambda _: (_ for _ in ()).throw(WorkflowManagerError("PRIVATE"))
    release.set()
    result = await client.receive_json()
    assert result["error"]["code"] == "draft_source_changed"
    assert "PRIVATE" not in json.dumps(result)
    assert runtime.workflow_draft_tasks == {}


@pytest.mark.parametrize(
    "limit", ["text", "entities", "targets", "missing", "not_loaded", "unreadable"]
)
async def test_source_limits_and_failures(hass, hass_ws_client, hass_storage, limit):
    provider, _ = await prepare(hass)
    runtime = async_get_runtime(hass)
    manager = runtime.workflow_manager
    source = copy.deepcopy(WORKFLOW)
    if limit == "text":
        source["steps"] = [
            {"step_id": f"compose_{index}", "kind": "ai_compose", "prompt": "x" * 4000}
            for index in range(9)
        ]
    elif limit == "entities":
        source["triggers"][0]["entity_ids"] = [
            f"sensor.selected_{index}" for index in range(9)
        ]
    elif limit == "targets":
        source["steps"] = [
            source["steps"][0],
            *[
                {
                    "step_id": f"notify_{index}",
                    "kind": "notify",
                    "notify_service": f"notify.selected_{index}",
                }
                for index in range(9)
            ],
        ]
    if limit != "missing":
        await manager.async_save(source)
    if limit == "not_loaded":
        runtime.workflow_manager = None
    elif limit == "unreadable":
        manager.get = lambda _: (_ for _ in ()).throw(WorkflowManagerError("PRIVATE"))
    result = await call(
        await hass_ws_client(hass),
        {
            "type": WORKFLOW_DRAFT_SOURCE_WEBSOCKET_TYPE,
            "source_workflow_id": source["workflow_id"],
        },
    )
    assert result["error"]["code"] == "draft_source_unavailable"
    assert "PRIVATE" not in json.dumps(result)
    provider.generate.assert_not_called()


async def test_combined_refinement_payload_bound_before_provider(
    hass, hass_ws_client, hass_storage
):
    provider, _ = await prepare(hass)
    source = copy.deepcopy(WORKFLOW)
    source["steps"][0]["prompt"] = "x" * 4000
    await async_get_runtime(hass).workflow_manager.async_save(source)
    client = await hass_ws_client(hass)
    versioned = await source_for(client)
    result = await call(
        client,
        message(
            prompt="\U0001f642" * 4000,
            source_workflow_id=versioned["workflow_id"],
            source_version=versioned["version"],
        ),
    )
    assert result["error"]["code"] == "draft_source_unavailable"
    provider.generate.assert_not_called()
