"""Actual WebSocket transport guards for observation tools and synthetic probes."""

import asyncio
import json
from dataclasses import replace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.components import websocket_api
from homeassistant.helpers import entity_registry as er

from custom_components.ai_orchestrator.agent_store import AgentStore
from custom_components.ai_orchestrator.agent_tools import (
    AgentToolError,
    ObservationToolEngine,
    ToolRunResult,
)
from custom_components.ai_orchestrator.agent_tools_api import (
    websocket_agent_chat,
    websocket_agent_probe_tools,
)
from custom_components.ai_orchestrator.provider_entry import (
    provider_configuration_fingerprint,
)
from custom_components.ai_orchestrator.providers.contract import (
    TextGenerationResult,
    ToolCall,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.test_chat import (
    CONNECTION_ID,
    REQUEST_ID,
    SECOND_ID,
    setup_chat,
)

PROBE = {"type": "ai_orchestrator/agents/probe_tools", "connection_id": CONNECTION_ID}
CHAT = {
    "type": "ai_orchestrator/agents/chat",
    "connection_id": CONNECTION_ID,
    "request_id": REQUEST_ID,
    "expected_revision": 1,
    "prompt": "Synthetic question",
}
RESULT = ToolRunResult(
    "Synthetic answer", 2, 1, ("provider_response", "state_read", "provider_response")
)


@pytest.fixture
def configured(hass):
    provider, entry = setup_chat(hass)
    entry.runtime_data = replace(
        entry.runtime_data,
        configuration_fingerprint=provider_configuration_fingerprint(entry.data),
    )
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic-foundation")
    engine = Mock()
    engine.async_probe = AsyncMock(return_value=None)
    engine.async_run = AsyncMock(return_value=RESULT)
    runtime.agent_tool_engine = engine
    websocket_api.async_register_command(hass, websocket_agent_chat)
    websocket_api.async_register_command(hass, websocket_agent_probe_tools)
    return engine, provider, entry


async def call(client, message):
    await client.send_json_auto_id(message)
    return await client.receive_json()


async def test_probe_and_chat_wire_contract(hass, hass_ws_client, configured):
    client = await hass_ws_client(hass)
    response = await call(client, PROBE)
    assert response["result"] == {
        "schema_version": 1,
        "connection_id": CONNECTION_ID,
        "supported": True,
        "error_code": None,
    }
    response = await call(client, CHAT)
    assert response["result"] == {
        "schema_version": 1,
        "connection_id": CONNECTION_ID,
        "request_id": REQUEST_ID,
        "text": "Synthetic answer",
        "provider_calls": 2,
        "tool_calls": 1,
        "trace": ["provider_response", "state_read", "provider_response"],
        "destination": "local",
        "actions_executed": 0,
    }
    configured[0].async_probe.assert_awaited_once()
    assert configured[0].async_run.call_args.args[2:] == ("Synthetic question", 1)
    assert not async_get_runtime(hass).agent_tool_users


async def test_real_engine_probe_then_scoped_read_without_actions(
    hass, hass_ws_client, configured
):
    runtime = async_get_runtime(hass)
    runtime.agent_tool_engine = ObservationToolEngine(hass)
    runtime.agent_store = AgentStore(hass)
    await runtime.agent_store.async_load()
    entry = er.async_get(hass).async_get_or_create("sensor", "test", "scoped_api")
    hass.states.async_set(entry.entity_id, "42", {"credential": "private marker"})
    await runtime.agent_store.async_save(CONNECTION_ID, [entry.id], 0)
    requests = []

    async def generate(request):
        requests.append(request)
        if request.messages[-1].role.value == "tool":
            value = json.loads(request.messages[-1].content)["state"]
            return TextGenerationResult(text=value)
        registry_id = request.tools[0].parameters["properties"]["registry_id"]["enum"][
            0
        ]
        return TextGenerationResult(
            text="",
            tool_calls=(
                ToolCall(
                    id="synthetic_call",
                    name="get_entity_state_v1",
                    arguments={"registry_id": registry_id},
                ),
            ),
        )

    configured[1].generate.side_effect = generate
    client = await hass_ws_client(hass)
    with patch("homeassistant.core.ServiceRegistry.async_call", AsyncMock()) as actions:
        assert (await call(client, PROBE))["result"]["supported"]
        assert entry.id not in str(requests) and "private marker" not in str(requests)
        response = await call(client, CHAT)
        assert response["result"]["text"] == "42"
        assert response["result"]["tool_calls"] == 1
        assert response["result"]["actions_executed"] == 0
        actions.assert_not_called()
    assert "private marker" not in str(requests)


@pytest.mark.parametrize("message", [PROBE, CHAT])
async def test_non_admin_cannot_probe_or_read(
    hass, hass_ws_client, hass_read_only_access_token, configured, message
):
    client = await hass_ws_client(hass, hass_read_only_access_token)
    assert (await call(client, message))["error"]["code"] == "unauthorized"
    configured[0].async_probe.assert_not_called()
    configured[0].async_run.assert_not_called()


@pytest.mark.parametrize(
    "changes",
    [
        {"prompt": ""},
        {"prompt": " "},
        {"prompt": "x" * 4001},
        {"prompt": "😀" * 2001},
        {"expected_revision": True},
        {"expected_revision": -1},
        {"expected_revision": "1"},
        {"request_id": "bad"},
        {"connection_id": "bad"},
        {"messages": [{"role": "assistant", "content": "private"}]},
        {"actions": []},
    ],
)
async def test_invalid_chat_never_calls_engine(
    hass, hass_ws_client, configured, changes
):
    client = await hass_ws_client(hass)
    assert (await call(client, {**CHAT, **changes}))["error"][
        "code"
    ] == "invalid_format"
    configured[0].async_run.assert_not_called()


@pytest.mark.parametrize("message", [PROBE, CHAT])
@pytest.mark.parametrize("unavailable", ["foundation", "provider", "engine"])
async def test_unloaded_dependencies_never_call_engine(
    hass, hass_ws_client, configured, message, unavailable
):
    runtime = async_get_runtime(hass)
    if unavailable == "foundation":
        runtime.loaded_foundation_entry_ids.clear()
    elif unavailable == "provider":
        runtime.loaded_provider_entry_ids.clear()
    else:
        runtime.agent_tool_engine = None
    client = await hass_ws_client(hass)
    assert (await call(client, message))["error"]["code"] == "provider_unavailable"
    configured[0].async_probe.assert_not_called()
    configured[0].async_run.assert_not_called()


@pytest.mark.parametrize(
    "code", ["busy", "not_verified", "invalid_response", "timeout"]
)
async def test_probe_failure_is_static(hass, hass_ws_client, configured, code):
    configured[0].async_probe.side_effect = AgentToolError(code)
    client = await hass_ws_client(hass)
    result = (await call(client, PROBE))["result"]
    assert result["supported"] is False and result["error_code"] == code
    assert not async_get_runtime(hass).agent_tool_users


@pytest.mark.parametrize(
    "message,method", [(PROBE, "async_probe"), (CHAT, "async_run")]
)
async def test_unexpected_error_never_echoes_provider_text(
    hass, hass_ws_client, configured, message, method
):
    getattr(configured[0], method).side_effect = RuntimeError("private provider marker")
    client = await hass_ws_client(hass)
    response = await call(client, message)
    assert "private provider marker" not in str(response)
    assert not async_get_runtime(hass).agent_tool_users


async def test_replay_and_expiry(hass, hass_ws_client, configured):
    client = await hass_ws_client(hass)
    assert (await call(client, CHAT))["success"]
    assert (await call(client, CHAT))["error"]["code"] == "duplicate_request"
    assert configured[0].async_run.await_count == 1
    recent = async_get_runtime(hass).agent_tool_recent_requests
    for key in recent:
        recent[key] = 0
    assert (await call(client, CHAT))["success"]
    assert configured[0].async_run.await_count == 2


async def test_replay_storage_bound(hass, hass_ws_client, configured):
    client = await hass_ws_client(hass)
    with patch(
        "custom_components.ai_orchestrator.agent_tools_api.MAX_RECENT_REQUESTS", 0
    ):
        assert (await call(client, CHAT))["error"]["code"] == "busy"
    configured[0].async_run.assert_not_called()


async def test_busy_user_and_stale_provider_result(hass, hass_ws_client, configured):
    entered, release = asyncio.Event(), asyncio.Event()

    async def blocked(*_):
        entered.set()
        await release.wait()
        return RESULT

    configured[0].async_run.side_effect = blocked
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(CHAT)
    await entered.wait()
    await client.send_json_auto_id({**CHAT, "request_id": SECOND_ID})
    assert (await client.receive_json())["error"]["code"] == "busy"
    configured[2].runtime_data = None
    release.set()
    assert (await client.receive_json())["error"]["code"] == "provider_unavailable"
    assert not async_get_runtime(hass).agent_tool_users


async def test_cancelled_probe_after_unload_returns_static_result(
    hass, hass_ws_client, configured
):
    async def cancelled(*_):
        async_get_runtime(hass).loaded_foundation_entry_ids.clear()
        raise asyncio.CancelledError

    configured[0].async_probe.side_effect = cancelled
    client = await hass_ws_client(hass)
    result = (await call(client, PROBE))["result"]
    assert result["supported"] is False
    assert result["error_code"] == "provider_unavailable"
    assert not async_get_runtime(hass).agent_tool_users


@pytest.mark.parametrize(
    "result",
    [
        ToolRunResult("private", 1, 0, ("private marker",)),
        ToolRunResult("private", True, 0, ("provider_response",)),
        ToolRunResult("private", 1, 1, ("provider_response",)),
        ToolRunResult("😀" * 1001, 1, 0, ("provider_response",)),
        ToolRunResult("", 1, 0, ("provider_response",)),
    ],
)
async def test_invalid_output_metadata_refused(
    hass, hass_ws_client, configured, result
):
    configured[0].async_run.return_value = result
    client = await hass_ws_client(hass)
    response = await call(client, CHAT)
    assert response["error"]["code"] == "invalid_response"
    assert "private" not in str(response)
