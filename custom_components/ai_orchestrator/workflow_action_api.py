"""Administrator-only explicit unattended light authorization commands."""

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .agent_store import AgentPolicyError, AgentRevisionError, AgentStoreError
from .chat import _canonical_uuid
from .runtime import async_get_runtime, is_foundation_loaded
from .workflow_manager import WorkflowManagerError
from .workflow_store import WorkflowStoreError


def _actions(hass: HomeAssistant):
    actions = getattr(async_get_runtime(hass), "workflow_actions", None)
    if actions is None or not is_foundation_loaded(hass):
        raise AgentPolicyError("Unattended actions are unavailable")
    return actions


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/workflows/light_actions/catalog",
            }
        )
    )
)
async def websocket_workflow_light_catalog(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Perform an explicit administrator light-policy catalog request."""
    try:
        result = await _actions(hass).async_catalog(connection.user.id)
    except (
        AgentPolicyError,
        AgentStoreError,
        WorkflowManagerError,
        WorkflowStoreError,
        ValueError,
    ) as error:
        connection.send_error(
            msg["id"],
            "revision_conflict"
            if isinstance(error, AgentRevisionError)
            else "not_authorized",
            "Reload the workflow and review its unattended authorization.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/workflows/light_actions/preview",
                vol.Required("workflow_id"): vol.All(str, _canonical_uuid),
            }
        )
    )
)
async def websocket_workflow_light_preview(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Perform an explicit administrator light-policy preview request."""
    try:
        result = await _actions(hass).async_preview(
            msg["workflow_id"], connection.user.id
        )
    except (
        AgentPolicyError,
        AgentStoreError,
        WorkflowManagerError,
        WorkflowStoreError,
        ValueError,
    ) as error:
        connection.send_error(
            msg["id"],
            "revision_conflict"
            if isinstance(error, AgentRevisionError)
            else "not_authorized",
            "Reload the workflow and review its unattended authorization.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required(
                    "type"
                ): "ai_orchestrator/workflows/light_actions/authorize",
                vol.Required("workflow_id"): vol.All(str, _canonical_uuid),
                vol.Required("revision"): vol.All(int, vol.Range(min=0)),
                vol.Required("document_version"): vol.All(
                    str, vol.Match(r"^[a-f0-9]{64}$")
                ),
                vol.Required("authorization_token"): vol.All(
                    str, vol.Length(min=1, max=128)
                ),
                vol.Required("attestations"): {
                    vol.Required("ordinary_lighting"): True,
                    vol.Required("allow_unattended"): True,
                },
            }
        )
    )
)
async def websocket_workflow_light_authorize(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Perform an explicit administrator light-policy authorize request."""
    try:
        result = await _actions(hass).async_authorize(
            msg["workflow_id"],
            msg["document_version"],
            msg["revision"],
            msg["authorization_token"],
            msg["attestations"],
            connection.user.id,
        )
    except (
        AgentPolicyError,
        AgentStoreError,
        WorkflowManagerError,
        WorkflowStoreError,
        ValueError,
    ) as error:
        connection.send_error(
            msg["id"],
            "revision_conflict"
            if isinstance(error, AgentRevisionError)
            else "not_authorized",
            "Reload the workflow and review its unattended authorization.",
        )
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/workflows/light_actions/revoke",
                vol.Required("workflow_id"): vol.All(str, _canonical_uuid),
                vol.Required("revision"): vol.All(int, vol.Range(min=0)),
            }
        )
    )
)
async def websocket_workflow_light_revoke(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Perform an explicit administrator light-policy revoke request."""
    try:
        result = await _actions(hass).async_revoke(
            msg["workflow_id"], msg["revision"], connection.user.id
        )
    except (
        AgentPolicyError,
        AgentStoreError,
        WorkflowManagerError,
        WorkflowStoreError,
        ValueError,
    ) as error:
        connection.send_error(
            msg["id"],
            "revision_conflict"
            if isinstance(error, AgentRevisionError)
            else "not_authorized",
            "Reload the workflow and review its unattended authorization.",
        )
        return
    connection.send_result(msg["id"], result)
