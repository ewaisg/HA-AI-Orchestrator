"""Explicit admin-only synthetic probes and single-turn observation chat."""

import asyncio
import time
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .agent_tools import ERROR_CODES, AgentToolError, ToolRunResult
from .chat import _canonical_uuid, _local_connections, text_length
from .runtime import async_get_runtime, is_foundation_loaded

MAX_RECENT_REQUESTS = 256
REQUEST_RETENTION_SECONDS = 120
MAX_CONCURRENT_USERS = 4


def _prompt(value: object) -> str:
    if type(value) is not str or not value.strip() or text_length(value) > 4000:
        raise vol.Invalid("Enter a bounded nonempty prompt")
    return value


def _revision(value: object) -> int:
    if type(value) is not int or value < 0:
        raise vol.Invalid("Expected a policy revision")
    return value


def _code(error: AgentToolError) -> str:
    code = getattr(error, "code", None)
    return code if type(code) is str and code in ERROR_CODES else "failed"


def _selected(hass: HomeAssistant, connection_id: str) -> object | None:
    return next(
        (
            loaded
            for _, loaded in _local_connections(hass)
            if loaded.connection_id == connection_id
        ),
        None,
    )


def _begin(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> tuple[Any, object, object] | None:
    runtime = async_get_runtime(hass)
    engine = runtime.agent_tool_engine
    loaded = _selected(hass, msg["connection_id"])
    if not is_foundation_loaded(hass) or engine is None or loaded is None:
        connection.send_error(
            msg["id"], "provider_unavailable", "Local provider is unavailable."
        )
        return None
    if (
        connection.user.id in runtime.agent_tool_users
        or len(runtime.agent_tool_users) >= MAX_CONCURRENT_USERS
    ):
        connection.send_error(
            msg["id"], "busy", "An observation request is already running."
        )
        return None
    sentinel = object()
    runtime.agent_tool_users[connection.user.id] = sentinel
    return engine, loaded, sentinel


def _current(
    hass: HomeAssistant, connection_id: str, engine: object, loaded: object
) -> bool:
    return (
        is_foundation_loaded(hass)
        and async_get_runtime(hass).agent_tool_engine is engine
        and _selected(hass, connection_id) is loaded
    )


def _finish(hass: HomeAssistant, user_id: str, sentinel: object) -> None:
    users = async_get_runtime(hass).agent_tool_users
    if users.get(user_id) is sentinel:
        del users[user_id]


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/agents/probe_tools",
                vol.Required("connection_id"): vol.All(str, _canonical_uuid),
            }
        )
    )
)
async def websocket_agent_probe_tools(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Test tool calling with engine-owned synthetic data and no household context."""
    pending = _begin(hass, connection, msg)
    if pending is None:
        return
    engine, loaded, sentinel = pending
    code = None
    try:
        await engine.async_probe(msg["connection_id"], connection.user.id)
        if not _current(hass, msg["connection_id"], engine, loaded):
            code = "provider_unavailable"
    except AgentToolError as err:
        code = _code(err)
    except asyncio.CancelledError:
        if _current(hass, msg["connection_id"], engine, loaded):
            raise
        code = "provider_unavailable"
    except Exception:  # noqa: BLE001 -- no provider exception content leaves backend.
        code = "failed"
    finally:
        _finish(hass, connection.user.id, sentinel)
    connection.send_result(
        msg["id"],
        {
            "schema_version": 1,
            "connection_id": msg["connection_id"],
            "supported": code is None,
            "error_code": code,
        },
    )


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    vol.All(
        vol.Schema(
            {
                vol.Required("type"): "ai_orchestrator/agents/chat",
                vol.Required("connection_id"): vol.All(str, _canonical_uuid),
                vol.Required("request_id"): vol.All(str, _canonical_uuid),
                vol.Required("expected_revision"): _revision,
                vol.Required("prompt"): _prompt,
            }
        )
    )
)
async def websocket_agent_chat(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Answer one explicit scoped turn, with bounded replay and concurrency guards."""
    runtime = async_get_runtime(hass)
    recent = runtime.agent_tool_recent_requests
    now = time.monotonic()
    for key, expiry in list(recent.items()):
        if expiry <= now:
            del recent[key]
    key = (connection.user.id, msg["request_id"])
    if key in recent:
        connection.send_error(
            msg["id"], "duplicate_request", "This request was already submitted."
        )
        return
    if len(recent) >= MAX_RECENT_REQUESTS:
        connection.send_error(
            msg["id"], "busy", "Request limit reached; try again shortly."
        )
        return
    pending = _begin(hass, connection, msg)
    if pending is None:
        return
    engine, loaded, sentinel = pending
    recent[key] = now + REQUEST_RETENTION_SECONDS
    try:
        result = await engine.async_run(
            msg["connection_id"],
            connection.user.id,
            msg["prompt"],
            msg["expected_revision"],
        )
        if not _current(hass, msg["connection_id"], engine, loaded):
            connection.send_error(
                msg["id"], "provider_unavailable", "Local provider changed."
            )
            return
        if (
            type(result) is not ToolRunResult
            or type(result.text) is not str
            or not result.text.strip()
            or text_length(result.text) > 2000
            or type(result.provider_calls) is not int
            or not 1 <= result.provider_calls <= 4
            or type(result.tool_calls) is not int
            or not 0 <= result.tool_calls <= 4
            or type(result.trace) is not tuple
            or len(result.trace) != result.provider_calls + result.tool_calls
            or any(
                type(marker) is not str
                or marker not in {"provider_response", "state_read"}
                for marker in result.trace
            )
            or result.trace.count("provider_response") != result.provider_calls
            or result.trace.count("state_read") != result.tool_calls
        ):
            raise AgentToolError("invalid_response")
        connection.send_result(
            msg["id"],
            {
                "schema_version": 1,
                "connection_id": msg["connection_id"],
                "request_id": msg["request_id"],
                "text": result.text,
                "provider_calls": result.provider_calls,
                "tool_calls": result.tool_calls,
                "trace": result.trace,
                "destination": "local",
                "actions_executed": 0,
            },
        )
    except AgentToolError as err:
        connection.send_error(
            msg["id"], _code(err), "The observation request stopped safely."
        )
    except asyncio.CancelledError:
        if _current(hass, msg["connection_id"], engine, loaded):
            raise
        connection.send_error(
            msg["id"], "provider_unavailable", "Local provider changed."
        )
    except Exception:  # noqa: BLE001 -- no provider exception content leaves backend.
        connection.send_error(
            msg["id"], "failed", "The observation request stopped safely."
        )
    finally:
        _finish(hass, connection.user.id, sentinel)
