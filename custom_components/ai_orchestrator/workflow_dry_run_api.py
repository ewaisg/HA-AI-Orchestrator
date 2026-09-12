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
from homeassistant.core import HomeAssistant

from .chat import _canonical_uuid, _local_connections
from .const import WORKFLOW_DRY_RUN_WEBSOCKET_TYPE
from .runtime import async_get_runtime, is_foundation_loaded
from .workflow_api import ERR_NOT_FOUND, ERR_NOT_LOADED, ERR_STORE_UNAVAILABLE
from .workflow_manager import WorkflowManagerError
from .workflow_notify import async_resolve_notify_target
from .workflow_preview import preview_workflow
from .workflow_preview_api import MAX_PREVIEW_JSON_CHARS, load_bounded_json
from .workflow_schema import WorkflowValidationError, parse_workflow
from .workflow_steps import StepContext, WorkflowStepError, run_ai_steps

DRY_RUN_RESPONSE_SCHEMA_VERSION = 1
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
                vol.Required("connection_id"): vol.All(str, _canonical_uuid),
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
    selected = next(
        (
            (entry, loaded)
            for entry, loaded in _local_connections(hass)
            if loaded.connection_id == msg["connection_id"]
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
        outcome = await run_ai_steps(workflow, context, loaded.provider)
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
    if (
        entry.entry_id not in runtime.loaded_provider_entry_ids
        or getattr(entry, "runtime_data", None) is not loaded
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
    connection.send_result(msg["id"], {**base, **outcome})
