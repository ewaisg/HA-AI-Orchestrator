"""Admin-only dry run of a stored workflow's AI steps against a supplied snapshot.

The snapshot is the caller's; no live state is read. Triggers and conditions
are evaluated offline first. Only when the scenario is eligible do the AI
steps run, one bounded local provider call each. No notification is sent and
no Home Assistant action is called. Results are returned to the administrator
and retained nowhere.
"""

from __future__ import annotations

import asyncio
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .agent_store import AgentPolicyError, AgentStoreError
from .chat import _canonical_uuid, _local_connections
from .const import WORKFLOW_DRY_RUN_WEBSOCKET_TYPE
from .provider_entry import loaded_provider_matches_entry
from .runtime import async_get_runtime, is_foundation_loaded
from .workflow_actions import is_light
from .workflow_api import ERR_NOT_FOUND, ERR_NOT_LOADED, ERR_STORE_UNAVAILABLE
from .workflow_manager import WorkflowManagerError
from .workflow_notify import async_resolve_notify_target
from .workflow_preview import preview_workflow
from .workflow_preview_api import MAX_PREVIEW_JSON_CHARS, load_bounded_json
from .workflow_schema import WorkflowValidationError, parse_workflow
from .workflow_steps import StepContext, WorkflowStepError, run_ai_steps
from .workflow_store import WorkflowStoreError

DRY_RUN_RESPONSE_SCHEMA_VERSION = 1


@callback
def async_cancel_provider_dry_runs(hass: HomeAssistant, entry_id: str) -> None:
    """Cancel dry runs bound to a provider entry that is unloading."""
    for pending_entry_id, task in list(
        async_get_runtime(hass).workflow_dry_run_tasks.values()
    ):
        if pending_entry_id == entry_id and not task.done():
            task.cancel()


ERR_INVALID_SNAPSHOT = "invalid_snapshot"
ERR_PROVIDER_UNAVAILABLE = "dry_run_provider_unavailable"
ERR_BUSY = "dry_run_busy"

_WORKFLOW_ID = vol.All(str, vol.Length(min=36, max=36), vol.Match(r"^[0-9a-f-]{36}$"))


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): WORKFLOW_DRY_RUN_WEBSOCKET_TYPE,
                vol.Required("workflow_id"): _WORKFLOW_ID,
                vol.Optional("connection_id"): vol.All(str, _canonical_uuid),
                vol.Required("snapshot_json"): vol.All(
                    str, vol.Length(max=MAX_PREVIEW_JSON_CHARS)
                ),
            }
        )
    )
)
async def websocket_workflow_dry_run(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Evaluate a stored workflow offline, then run its AI steps if eligible."""
    runtime = async_get_runtime(hass)
    manager = runtime.workflow_manager
    if not is_foundation_loaded(hass) or manager is None or not manager.started:
        connection.send_error(
            msg["id"], ERR_NOT_LOADED, "The foundation is not loaded."
        )
        return
    try:
        document = manager.get(msg["workflow_id"])
    except WorkflowManagerError:
        connection.send_error(
            msg["id"], ERR_STORE_UNAVAILABLE, "Workflow storage is unavailable."
        )
        return
    if document is None:
        connection.send_error(msg["id"], ERR_NOT_FOUND, "Workflow not found.")
        return
    try:
        snapshot = load_bounded_json(msg["snapshot_json"])
        preview = preview_workflow(document, snapshot)
        workflow = parse_workflow(document)
    except ValueError, RecursionError, WorkflowValidationError:
        connection.send_error(
            msg["id"], ERR_INVALID_SNAPSHOT, "Check the snapshot JSON."
        )
        return
    if is_light(document):
        await _async_light_dry_run(hass, connection, msg, document, preview)
        return
    selected = next(
        (
            (entry, loaded)
            for entry, loaded in _local_connections(hass)
            if loaded.connection_id == msg.get("connection_id")
            and loaded_provider_matches_entry(loaded, entry.data)
        ),
        None,
    )
    if selected is None:
        connection.send_error(
            msg["id"],
            ERR_PROVIDER_UNAVAILABLE,
            "Select an available local provider.",
        )
        return
    user_id = connection.user.id
    if user_id in runtime.workflow_dry_runs_in_progress:
        connection.send_error(
            msg["id"],
            ERR_BUSY,
            "A dry run is already running. Try again shortly.",
        )
        return
    base = {
        "schema_version": DRY_RUN_RESPONSE_SCHEMA_VERSION,
        "mode": "dry_run",
        "workflow_id": document["workflow_id"],
        "destination": "local",
        "triggered": preview["triggered"],
        "conditions_passed": preview["conditions_passed"],
        "eligible": preview["eligible"],
        "trigger_results": preview["trigger_results"],
        "condition_results": preview["condition_results"],
    }
    if not preview["eligible"]:
        connection.send_result(
            msg["id"],
            {
                **base,
                "steps": [],
                "provider_calls": 0,
                "actions_executed": 0,
                "completed": False,
            },
        )
        return
    entry, loaded = selected
    bindings = manager.publication_bindings(document)
    runtime.workflow_dry_runs_in_progress.add(user_id)
    # Like the live observer, the model sees only the entities the workflow's
    # own conditions name, never the whole supplied snapshot.
    condition_entities = {
        condition.entity_id
        for condition in workflow.conditions
        if condition.entity_id is not None
    }
    try:
        context = StepContext(
            workflow_name=workflow.name,
            event=snapshot["event"],
            time=snapshot["time"],
            states={
                entity_id: value
                for entity_id, value in snapshot["states"].items()
                if entity_id in condition_entities
            },
        )
        task = hass.async_create_task(
            run_ai_steps(workflow, context, loaded.provider),
            f"ai_orchestrator_dry_run_{user_id}",
        )
        runtime.workflow_dry_run_tasks[user_id] = (entry.entry_id, task)
        outcome = await task
    except WorkflowStepError:
        connection.send_error(
            msg["id"], ERR_INVALID_SNAPSHOT, "Check the snapshot JSON."
        )
        return
    except asyncio.CancelledError:
        if entry.entry_id not in runtime.loaded_provider_entry_ids:
            connection.send_error(
                msg["id"],
                ERR_PROVIDER_UNAVAILABLE,
                "The provider was unloaded during the dry run.",
            )
            return
        raise
    finally:
        runtime.workflow_dry_runs_in_progress.discard(user_id)
        runtime.workflow_dry_run_tasks.pop(user_id, None)
    if (
        entry.entry_id not in runtime.loaded_provider_entry_ids
        or getattr(entry, "runtime_data", None) is not loaded
        or not loaded_provider_matches_entry(loaded, entry.data)
    ):
        connection.send_error(
            msg["id"],
            ERR_PROVIDER_UNAVAILABLE,
            "The provider changed during the dry run.",
        )
        return
    # Report where each planned notification would go, without sending it.
    references = {step.step_id: step.notify_service for step in workflow.steps}
    for step in outcome["steps"]:
        if step["kind"] == "notify" and step["status"] == "planned":
            step["target"] = async_resolve_notify_target(
                hass, references.get(step["step_id"]) or ""
            )
    # A receipt describes the exact stored draft and selected route. A failed,
    # ineligible or unresolved run never authorizes live execution.
    planned = [step for step in outcome["steps"] if step["kind"] == "notify"]
    if outcome["completed"] and all(
        step["status"] == "planned"
        and step.get("target") in {"entity", "service"}
        and step.get("message_step_id") is not None
        for step in planned
    ):
        try:
            await manager.async_record_dry_run(document, loaded.connection_id, bindings)
        except WorkflowManagerError, WorkflowStoreError:
            connection.send_error(
                msg["id"],
                ERR_STORE_UNAVAILABLE,
                "The dry run completed but its publication receipt could not be saved.",
            )
            return
    connection.send_result(msg["id"], {**base, **outcome})


async def _async_light_dry_run(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    document: dict,
    preview: dict,
) -> None:
    """Validate exact authorized light bindings without provider or HA action."""
    runtime = async_get_runtime(hass)
    actions = getattr(runtime, "workflow_actions", None)
    task = None
    base = {
        "schema_version": 1,
        "mode": "dry_run",
        "workflow_id": document["workflow_id"],
        "destination": "local",
        **{
            key: preview[key]
            for key in (
                "triggered",
                "conditions_passed",
                "eligible",
                "trigger_results",
                "condition_results",
            )
        },
        "provider_calls": 0,
        "actions_executed": 0,
        "steps": [],
        "completed": False,
    }
    if not preview["eligible"]:
        connection.send_result(msg["id"], base)
        return
    try:
        if actions is None or msg.get("connection_id") is not None:
            raise AgentPolicyError("Provider-free light validation is required")
        task = actions._enter()
        bindings = await actions.async_validate(document, connection.user.id)
        if task.cancelling():
            raise asyncio.CancelledError
        if not await runtime.workflow_manager.async_record_dry_run(
            document, None, bindings
        ):
            raise AgentPolicyError("Workflow changed during validation")
        step = document["steps"][0]
        base["completed"] = True
        base["steps"] = [
            {
                "index": 0,
                "step_id": step["step_id"],
                "kind": "light_control",
                "executed": False,
                "status": "planned",
                "target_registry_id": step["target_registry_id"],
                "operation": step["operation"],
                "target": "entity",
            }
        ]
    except AgentPolicyError, AgentStoreError, WorkflowManagerError, WorkflowStoreError:
        connection.send_error(
            msg["id"],
            "not_authorized",
            "Review and authorize the saved unattended light action first.",
        )
        return
    finally:
        if task is not None:
            actions._tasks.discard(task)
    connection.send_result(msg["id"], base)
