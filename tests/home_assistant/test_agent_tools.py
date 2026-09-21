"""Observation-only tool probing and per-transmission authorization tests."""

import asyncio
import json
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.helpers import entity_registry as er

from custom_components.ai_orchestrator.agent_store import AgentStore
from custom_components.ai_orchestrator.agent_tools import (
    AgentToolError,
    ObservationToolEngine,
)
from custom_components.ai_orchestrator.providers.contract import (
    TextGenerationResult,
    ToolCall,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.test_conversation_entity import CONNECTION_ID, setup_agent


def tool_result(
    registry_id, call_id="synthetic_call", name="get_entity_state_v1", extra=None
):
    return TextGenerationResult(
        text="",
        tool_calls=(
            ToolCall(
                id=call_id,
                name=name,
                arguments={"registry_id": registry_id, **(extra or {})},
            ),
        ),
    )


@pytest.fixture
async def tool_env(hass, enable_custom_integrations):
    provider, entry = await setup_agent(hass)
    runtime = async_get_runtime(hass)
    runtime.loaded_foundation_entry_ids.add("synthetic-foundation")
    store = AgentStore(hass)
    await store.async_load()
    runtime.agent_store = store
    target = er.async_get(hass).async_get_or_create(
        "sensor", "test", "scoped-temperature"
    )
    hass.states.async_set(target.entity_id, "42", {"private": "hidden-marker"})
    await store.async_save(CONNECTION_ID, [target.id], 0)
    engine = ObservationToolEngine(hass)
    runtime.agent_tool_engine = engine
    user = SimpleNamespace(is_active=True, is_admin=True, permissions=Mock())
    user.permissions.check_entity.return_value = True

    async def generate(request):
        if request.messages[-1].role.value == "tool":
            data = json.loads(request.messages[-1].content)
            return TextGenerationResult(text=data["state"])
        return tool_result(
            request.tools[0].parameters["properties"]["registry_id"]["enum"][0]
        )

    provider.generate.side_effect = generate
    with patch(
        "homeassistant.auth.AuthManager.async_get_user", AsyncMock(return_value=user)
    ):
        yield engine, provider, entry, store, target, user


async def verified(env):
    engine, provider, *_ = env
    await engine.async_probe(CONNECTION_ID, "synthetic-user")
    provider.generate.reset_mock()
    return engine


async def test_probe_has_only_synthetic_data_and_proves_continuation(hass, tool_env):
    engine, provider, _, _, target, _ = tool_env
    assert not engine.is_verified(CONNECTION_ID)
    with patch(
        "custom_components.ai_orchestrator.agent_tools.async_read_scoped_state"
    ) as read:
        await engine.async_probe(CONNECTION_ID, "synthetic-user")
    assert engine.is_verified(CONNECTION_ID)
    assert provider.generate.await_count == 2
    read.assert_not_called()
    transmitted = repr(provider.generate.call_args_list)
    assert target.id not in transmitted and target.entity_id not in transmitted
    assert "hidden-marker" not in transmitted


async def test_requires_probe_and_empty_scope_cannot_read(tool_env):
    engine, provider, _, store, *_ = tool_env
    with pytest.raises(AgentToolError, match="not_verified"):
        await engine.async_run(CONNECTION_ID, "synthetic-user", "Read temperature", 1)
    provider.generate.assert_not_awaited()
    await verified(tool_env)
    await store.async_save(CONNECTION_ID, [], 1)
    with pytest.raises(AgentToolError, match="not_authorized"):
        await engine.async_run(CONNECTION_ID, "synthetic-user", "Read temperature", 2)
    provider.generate.assert_not_awaited()


async def test_success_has_only_scoped_state_and_redacted_trace(hass, tool_env):
    engine = await verified(tool_env)
    with patch("homeassistant.core.ServiceRegistry.async_call", AsyncMock()) as actions:
        result = await engine.async_run(
            CONNECTION_ID, "synthetic-user", "Read temperature", 1
        )
    assert result.text == "42"
    assert result.provider_calls == 2 and result.tool_calls == 1
    assert result.trace == ("provider_response", "state_read", "provider_response")
    actions.assert_not_awaited()
    assert "hidden-marker" not in repr(tool_env[1].generate.call_args_list)


@pytest.mark.parametrize(
    "kind",
    ["unknown", "outside_scope", "extra", "wrong_type", "empty", "oversized", "mixed"],
)
async def test_bad_tools_and_responses_fail_without_read(tool_env, kind):
    engine = await verified(tool_env)
    provider, target = tool_env[1], tool_env[4]
    cases = {
        "unknown": tool_result(target.id, name="call_service"),
        "outside_scope": tool_result("unknown-registry-id"),
        "extra": tool_result(target.id, extra={"service": "light.turn_on"}),
        "wrong_type": tool_result(3),
        "empty": TextGenerationResult(text=" "),
        "oversized": TextGenerationResult(text="x" * 2001),
        "mixed": TextGenerationResult(
            text="claimed answer", tool_calls=tool_result(target.id).tool_calls
        ),
    }
    provider.generate.side_effect = None
    provider.generate.return_value = cases[kind]
    with patch(
        "custom_components.ai_orchestrator.agent_tools.async_read_scoped_state"
    ) as read:
        with pytest.raises(AgentToolError, match="invalid_response"):
            await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    read.assert_not_called()


@pytest.mark.parametrize(
    "change",
    [
        "revision",
        "user_permission",
        "user_inactive",
        "provider",
        "provider_config",
        "foundation",
        "store",
    ],
)
async def test_changes_during_provider_await_block_next_disclosure(
    hass, tool_env, change
):
    engine = await verified(tool_env)
    _, provider, entry, store, target, user = tool_env
    runtime = async_get_runtime(hass)

    async def changed(request):
        if change == "revision":
            await store.async_save(CONNECTION_ID, [], 1)
        elif change == "user_permission":
            user.permissions.check_entity.return_value = False
        elif change == "user_inactive":
            user.is_active = False
        elif change == "provider":
            entry.runtime_data = replace(entry.runtime_data)
        elif change == "provider_config":
            hass.config_entries.async_update_entry(
                entry,
                data={
                    **entry.data,
                    "provider_config": {"synthetic_config": "changed-config"},
                },
            )
        elif change == "foundation":
            runtime.loaded_foundation_entry_ids.clear()
        else:
            runtime.agent_store = AgentStore(hass)
        return tool_result(target.id)

    provider.generate.side_effect = changed
    with patch(
        "custom_components.ai_orchestrator.agent_tools.async_read_scoped_state"
    ) as read:
        with pytest.raises(AgentToolError, match="not_authorized"):
            await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    read.assert_not_called()
    assert provider.generate.await_count == 1


async def test_revocation_during_read_blocks_tool_result_transmission(tool_env):
    engine = await verified(tool_env)
    store = tool_env[3]

    async def read(*args):
        await store.async_save(CONNECTION_ID, [], 1)
        return {"entity_id": "sensor.synthetic", "state": "42"}

    with patch(
        "custom_components.ai_orchestrator.agent_tools.async_read_scoped_state", read
    ):
        with pytest.raises(AgentToolError, match="not_authorized"):
            await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    assert tool_env[1].generate.await_count == 1


async def test_repeated_call_id_and_bounded_loop(tool_env):
    engine = await verified(tool_env)
    provider, target = tool_env[1], tool_env[4]
    provider.generate.side_effect = None
    provider.generate.return_value = tool_result(target.id)
    with pytest.raises(AgentToolError, match="invalid_response"):
        await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    assert provider.generate.await_count == 2
    provider.generate.reset_mock()

    async def loop(request):
        return tool_result(
            target.id, call_id=f"synthetic_{provider.generate.await_count}"
        )

    provider.generate.side_effect = loop
    with pytest.raises(AgentToolError, match="limit_exceeded"):
        await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    assert provider.generate.await_count == 4


async def test_parallel_tool_call_limit(tool_env):
    engine = await verified(tool_env)
    provider, target = tool_env[1], tool_env[4]
    provider.generate.side_effect = None
    provider.generate.return_value = TextGenerationResult(
        text="",
        tool_calls=tuple(
            tool_result(target.id, call_id=f"id_{n}").tool_calls[0] for n in range(5)
        ),
    )
    with patch(
        "custom_components.ai_orchestrator.agent_tools.async_read_scoped_state"
    ) as read:
        with pytest.raises(AgentToolError, match="limit_exceeded"):
            await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    read.assert_not_called()


@pytest.mark.parametrize("prompt", ["", " ", "x" * 4001, None])
async def test_prompt_bounds_zero_requests(tool_env, prompt):
    engine = await verified(tool_env)
    with pytest.raises(AgentToolError, match="invalid_request"):
        await engine.async_run(CONNECTION_ID, "synthetic-user", prompt, 1)
    tool_env[1].generate.assert_not_awaited()


async def test_context_bound_stops_before_transmission(tool_env):
    engine = await verified(tool_env)
    with patch("custom_components.ai_orchestrator.agent_tools.MAX_CONTEXT_CHARS", 10):
        with pytest.raises(AgentToolError, match="limit_exceeded"):
            await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    tool_env[1].generate.assert_not_awaited()


async def test_busy_cancel_and_proof_revocation(tool_env):
    engine = await verified(tool_env)
    started = asyncio.Event()

    async def slow(request):
        started.set()
        await asyncio.Event().wait()

    tool_env[1].generate.side_effect = slow
    task = asyncio.create_task(
        engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    )
    await started.wait()
    with pytest.raises(AgentToolError, match="busy"):
        await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    engine.cancel_provider(CONNECTION_ID)
    with pytest.raises(asyncio.CancelledError):
        await task
    assert not engine.is_verified(CONNECTION_ID)
    assert engine._tasks == {}


async def test_timeout_static_error(tool_env):
    engine = await verified(tool_env)

    async def slow(request):
        await asyncio.Event().wait()

    tool_env[1].generate.side_effect = slow
    with patch("custom_components.ai_orchestrator.agent_tools.TIMEOUT_SECONDS", 0.01):
        with pytest.raises(AgentToolError, match="timeout"):
            await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    assert engine._tasks == {}


async def test_probe_requires_tool_and_exact_continuation(tool_env):
    engine, provider, *_ = tool_env
    provider.generate.side_effect = None
    provider.generate.return_value = TextGenerationResult(text="not a tool")
    with pytest.raises(AgentToolError, match="invalid_response"):
        await engine.async_probe(CONNECTION_ID, "synthetic-user")
    assert not engine.is_verified(CONNECTION_ID)
    provider.generate.side_effect = [
        tool_result("synthetic_probe"),
        TextGenerationResult(text="guessed value"),
    ]
    with pytest.raises(AgentToolError, match="invalid_response"):
        await engine.async_probe(CONNECTION_ID, "synthetic-user")
    assert not engine.is_verified(CONNECTION_ID)


async def test_probe_admin_only_and_stop_invalidates(tool_env):
    engine = await verified(tool_env)
    engine.stop()
    assert not engine.is_verified(CONNECTION_ID)
    tool_env[5].is_admin = False
    with pytest.raises(AgentToolError, match="not_authorized"):
        await engine.async_probe(CONNECTION_ID, "synthetic-user")
    tool_env[1].generate.assert_not_awaited()


async def test_cancel_resistant_provider_cannot_return_or_continue(tool_env):
    engine = await verified(tool_env)
    started = asyncio.Event()

    async def resistant(request):
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            return tool_result(tool_env[4].id)

    tool_env[1].generate.side_effect = resistant
    task = asyncio.create_task(
        engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    )
    await started.wait()
    engine.stop()
    with pytest.raises(AgentToolError, match="not_authorized"):
        await task
    assert tool_env[1].generate.await_count == 1
    assert engine._tasks == {}


@pytest.mark.parametrize("change", ["recreate", "sensitive_class", "unavailable"])
async def test_registry_or_state_change_never_leaks(hass, tool_env, change):
    engine = await verified(tool_env)
    target = tool_env[4]

    async def changed(request):
        if change == "recreate":
            er.async_get(hass).async_remove(target.entity_id)
            er.async_get(hass).async_get_or_create(
                "sensor",
                "test",
                "replacement",
                suggested_object_id=target.entity_id.split(".", 1)[1],
            )
        elif change == "sensitive_class":
            hass.states.async_set(target.entity_id, "42", {"device_class": "gas"})
        else:
            hass.states.async_set(target.entity_id, "unavailable")
        return tool_result(target.id)

    tool_env[1].generate.side_effect = changed
    with pytest.raises(AgentToolError, match="not_authorized"):
        await engine.async_run(CONNECTION_ID, "synthetic-user", "Read", 1)
    assert tool_env[1].generate.await_count == 1
