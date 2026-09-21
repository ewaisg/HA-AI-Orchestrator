"""Authenticated human action configuration, proposal and confirmation commands."""

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .action_manager import ActionManager
from .agent_store import AgentPolicyError, AgentRevisionError, AgentStoreError
from .chat import _canonical_uuid
from .runtime import async_get_runtime, is_foundation_loaded

CONNECTION = vol.All(str, _canonical_uuid)
SHORT = vol.All(str, vol.Length(min=1, max=64))


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/actions/switch_review/preview",
                vol.Required("connection_id"): CONNECTION,
                vol.Required("expected_revision"): vol.All(int, vol.Range(min=0)),
                vol.Required("registry_id"): SHORT,
            }
        )
    )
)
async def websocket_switch_review_preview(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Perform the authenticated administrator's explicit review preview."""
    try:
        result = await _manager(hass).async_review_preview(
            msg["connection_id"],
            msg["expected_revision"],
            msg["registry_id"],
            connection.user.id,
        )
    except (AgentPolicyError, AgentStoreError, ValueError) as error:
        _error(connection, msg["id"], error)
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/actions/switch_review/save",
                vol.Required("connection_id"): CONNECTION,
                vol.Required("expected_revision"): vol.All(int, vol.Range(min=0)),
                vol.Required("registry_id"): SHORT,
                vol.Required("review_token"): vol.All(str, vol.Length(min=1, max=128)),
                vol.Required("classification"): "ordinary_noncritical",
                vol.Required("attestations"): {
                    vol.Required("physical_target_verified"): True,
                    vol.Required("single_device"): True,
                    vol.Required("not_security_or_life_safety"): True,
                },
            }
        )
    )
)
async def websocket_switch_review_save(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Perform the authenticated administrator's explicit review save."""
    try:
        result = await _manager(hass).async_review_save(
            msg["connection_id"],
            msg["expected_revision"],
            msg["registry_id"],
            msg["review_token"],
            msg["classification"],
            msg["attestations"],
            connection.user.id,
        )
    except (AgentPolicyError, AgentStoreError, ValueError) as error:
        _error(connection, msg["id"], error)
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/actions/switch_review/revoke",
                vol.Required("connection_id"): CONNECTION,
                vol.Required("expected_revision"): vol.All(int, vol.Range(min=0)),
                vol.Required("registry_id"): SHORT,
            }
        )
    )
)
async def websocket_switch_review_revoke(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Perform the authenticated administrator's explicit review revoke."""
    try:
        result = await _manager(hass).async_review_revoke(
            msg["connection_id"],
            msg["expected_revision"],
            msg["registry_id"],
            connection.user.id,
        )
    except (AgentPolicyError, AgentStoreError, ValueError) as error:
        _error(connection, msg["id"], error)
        return
    connection.send_result(msg["id"], result)


def _manager(hass: HomeAssistant) -> ActionManager:
    manager = async_get_runtime(hass).action_manager
    if not is_foundation_loaded(hass) or manager is None:
        raise AgentStoreError("Actions are unavailable")
    return manager


def _error(
    connection: websocket_api.ActiveConnection, message_id: int, error: Exception
) -> None:
    if isinstance(error, AgentRevisionError):
        connection.send_error(
            message_id, "revision_conflict", "Reload the action policy."
        )
    elif isinstance(error, AgentStoreError):
        connection.send_error(
            message_id, "not_loaded", "Action storage is unavailable."
        )
    else:
        connection.send_error(
            message_id,
            "not_authorized",
            "Action denied; reload and review its scope and current state.",
        )


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/actions/catalog",
                vol.Required("connection_id"): CONNECTION,
            }
        )
    )
)
async def websocket_action_catalog(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """List typed actions and real available targets without dispatch."""
    try:
        result = await _manager(hass).async_catalog(
            msg["connection_id"], connection.user.id
        )
    except (AgentPolicyError, AgentStoreError, ValueError) as error:
        _error(connection, msg["id"], error)
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/actions/save",
                vol.Required("connection_id"): CONNECTION,
                vol.Required("expected_revision"): vol.All(int, vol.Range(min=0)),
                vol.Required("action_scopes"): vol.All(
                    [
                        {
                            vol.Required("tool_id"): SHORT,
                            vol.Required("registry_ids"): vol.All(
                                [SHORT], vol.Length(min=1, max=64)
                            ),
                        }
                    ],
                    vol.Length(max=7),
                ),
            }
        )
    )
)
async def websocket_action_save(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Save only explicit selected targets for reviewed server tools."""
    try:
        result = await _manager(hass).async_save(
            msg["connection_id"],
            msg["action_scopes"],
            msg["expected_revision"],
            connection.user.id,
        )
    except (AgentPolicyError, AgentStoreError, ValueError) as error:
        _error(connection, msg["id"], error)
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/actions/propose",
                vol.Required("connection_id"): CONNECTION,
                vol.Required("expected_revision"): vol.All(int, vol.Range(min=0)),
                vol.Required("request_id"): CONNECTION,
                vol.Required("tool_id"): SHORT,
                vol.Required("registry_id"): SHORT,
                vol.Required("arguments"): dict,
            }
        )
    )
)
async def websocket_action_propose(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Create an ephemeral exact action summary and human confirmation token."""
    try:
        result = await _manager(hass).async_propose(
            msg["connection_id"],
            msg["expected_revision"],
            msg["request_id"],
            msg["tool_id"],
            msg["registry_id"],
            msg["arguments"],
            connection.user.id,
        )
    except (AgentPolicyError, AgentStoreError, ValueError) as error:
        _error(connection, msg["id"], error)
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/actions/confirm",
                vol.Required("connection_id"): CONNECTION,
                vol.Required("request_id"): CONNECTION,
                vol.Required("token"): vol.All(str, vol.Length(min=1, max=128)),
            }
        )
    )
)
async def websocket_action_confirm(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Consume the authenticated user's token once, without automatic retry."""
    try:
        result = await _manager(hass).async_confirm(
            msg["connection_id"], msg["request_id"], msg["token"], connection.user.id
        )
    except (AgentPolicyError, AgentStoreError, ValueError) as error:
        _error(connection, msg["id"], error)
        return
    connection.send_result(msg["id"], result)
