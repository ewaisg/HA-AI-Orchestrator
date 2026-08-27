"""Tests for the bounded AI Orchestrator WebSocket API."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.components.websocket_api import ERR_UNAUTHORIZED
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from custom_components.ai_orchestrator import async_setup_entry
from custom_components.ai_orchestrator.const import (
    CATALOG_WEBSOCKET_TYPE,
    DOMAIN,
    FOUNDATION_ENTRY_UNIQUE_ID,
    PROVIDER_LIST_WEBSOCKET_TYPE,
    PROVIDER_TEST_WEBSOCKET_TYPE,
    STATUS_WEBSOCKET_TYPE,
    WORKFLOW_PROBE_WEBSOCKET_TYPE,
)
from custom_components.ai_orchestrator.provider_entry import (
    CONF_CONNECTION_ID,
    async_register_provider_entry_adapter,
    build_provider_entry_data,
    provider_entry_unique_id,
)
from custom_components.ai_orchestrator.providers.contract import (
    SAFE_ERROR_MESSAGES,
    ErrorCode,
    NormalizedError,
    ProviderError,
)
from custom_components.ai_orchestrator.runtime import async_get_runtime
from custom_components.ai_orchestrator.websocket_api import (
    CATALOG_SCHEMA_VERSION,
    PROVIDER_NOT_FOUND,
    PROVIDER_TEST_IN_PROGRESS,
    WORKFLOW_PROBE_INVARIANT_FAILED,
    WORKFLOW_PROBE_NOT_LOADED,
    async_register_websocket_commands,
)
from custom_components.ai_orchestrator.workflow_probe import (
    WorkflowProbeInvariantError,
    async_setup_workflow_probe,
)
from tests.home_assistant.provider_fakes import (
    SYNTHETIC_CONFIG_FIELD,
    SYNTHETIC_PROVIDER_TYPE,
    SyntheticProviderEntryAdapter,
)

PROVIDER_CONNECTION_ID = "00000000-0000-4000-8000-000000000030"


async def _setup_loaded_provider(
    hass: HomeAssistant,
    *,
    credential: str = "synthetic-credential",
) -> MockConfigEntry:
    adapter = SyntheticProviderEntryAdapter()
    async_register_provider_entry_adapter(hass, adapter)
    entry = MockConfigEntry(
        domain=DOMAIN,
        data=build_provider_entry_data(
            connection_id=PROVIDER_CONNECTION_ID,
            provider_type=SYNTHETIC_PROVIDER_TYPE,
            provider_config={SYNTHETIC_CONFIG_FIELD: credential},
        ),
        unique_id=provider_entry_unique_id(PROVIDER_CONNECTION_ID),
        title="Synthetic local provider",
        version=2,
    )
    entry.add_to_hass(hass)
    assert await async_setup_entry(hass, entry)
    return entry


def _expected_status(*, configured: bool) -> dict:
    return {
        "schema_version": 1,
        "phase": "foundation",
        "configured": configured,
        "features": {
            "providers": False,
            "workflows": False,
            "conversation": False,
            "ai_task": False,
        },
    }


async def test_admin_status_has_exact_secret_free_contract(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An administrator receives only the agreed foundation status fields."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == _expected_status(configured=False)

    canary = "synthetic-secret-canary-must-not-leak"
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={"credential": canary},
        unique_id=FOUNDATION_ENTRY_UNIQUE_ID,
    )
    entry.add_to_hass(hass)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == _expected_status(configured=False)
    assert canary not in json.dumps(response)

    with patch(
        "custom_components.ai_orchestrator.async_register_panel",
        new_callable=AsyncMock,
        return_value=False,
    ):
        assert await async_setup_entry(hass, entry)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == _expected_status(configured=True)
    assert canary not in json.dumps(response)


async def test_non_admin_status_is_unauthorized(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    """A non-admin user cannot call the status command."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED


async def test_status_schema_rejects_additional_fields(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The request schema accepts only the message type and protocol id."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {"type": STATUS_WEBSOCKET_TYPE, "unexpected": "value"}
    )
    response = await client.receive_json()

    assert response["success"] is False


async def test_admin_workflow_probe_has_exact_no_side_effect_contract(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An administrator can run only the bounded internal lifecycle probe."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": WORKFLOW_PROBE_WEBSOCKET_TYPE})
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == WORKFLOW_PROBE_NOT_LOADED

    async_setup_workflow_probe(hass)
    await client.send_json_auto_id({"type": WORKFLOW_PROBE_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == {
        "schema_version": 1,
        "workflow_id": "foundation_lifecycle_probe",
        "trigger_type": "integration_event",
        "execution_count": 1,
        "executions_for_trigger": 1,
        "registration_count": 1,
        "provider_contacted": False,
        "home_assistant_action_called": False,
    }


async def test_non_admin_workflow_probe_is_unauthorized(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    """A non-admin cannot run even the harmless lifecycle probe."""
    async_register_websocket_commands(hass)
    async_setup_workflow_probe(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)

    await client.send_json_auto_id({"type": WORKFLOW_PROBE_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED


async def test_workflow_probe_schema_rejects_additional_fields(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The probe command accepts no caller-controlled event data."""
    async_register_websocket_commands(hass)
    async_setup_workflow_probe(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {"type": WORKFLOW_PROBE_WEBSOCKET_TYPE, "event_data": "not-allowed"}
    )
    response = await client.receive_json()

    assert response["success"] is False


async def test_workflow_probe_invariant_failure_is_a_bounded_protocol_error(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """Direct WebSocket clients cannot receive success for duplicate execution."""
    async_register_websocket_commands(hass)
    async_setup_workflow_probe(hass)
    client = await hass_ws_client(hass)

    with patch(
        "custom_components.ai_orchestrator.websocket_api.async_run_workflow_probe",
        side_effect=WorkflowProbeInvariantError,
    ):
        await client.send_json_auto_id({"type": WORKFLOW_PROBE_WEBSOCKET_TYPE})
        response = await client.receive_json()

    assert response["success"] is False
    assert response["error"] == {
        "code": WORKFLOW_PROBE_INVARIANT_FAILED,
        "message": "The workflow lifecycle probe did not execute exactly once.",
    }


async def test_admin_provider_list_has_exact_secret_free_contract(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The panel receives bounded metadata but never provider configuration."""
    canary = "synthetic-provider-secret-must-not-leak"
    entry = await _setup_loaded_provider(hass, credential=canary)
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": PROVIDER_LIST_WEBSOCKET_TYPE})
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == {
        "schema_version": 1,
        "providers": [
            {
                "connection_id": PROVIDER_CONNECTION_ID,
                "provider_type": SYNTHETIC_PROVIDER_TYPE,
                "display_name": "Synthetic Provider",
                "title": "Synthetic local provider",
                "health": "healthy",
            }
        ],
    }
    assert entry.entry_id not in json.dumps(response)
    assert canary not in json.dumps(response)

    await client.send_json_auto_id({"type": STATUS_WEBSOCKET_TYPE})
    status_response = await client.receive_json()
    assert status_response["result"]["features"]["providers"] is True


async def test_admin_catalog_returns_sorted_registry_identity_only(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The catalog exposes registry identity metadata without state or actions."""
    async_register_websocket_commands(hass)
    fake_areas = SimpleNamespace(
        async_entries=lambda: [
            SimpleNamespace(id="area-b", name="Bedroom"),
            SimpleNamespace(id="area-a", name="Kitchen"),
        ]
    )
    fake_devices = SimpleNamespace(
        devices={
            "device-b": SimpleNamespace(
                id="device-b", name="Zigbee device", name_by_user=None, area_id=None
            ),
            "device-a": SimpleNamespace(
                id="device-a", name=None, name_by_user="Named device", area_id="area-a"
            ),
        }
    )
    fake_entities = SimpleNamespace(
        entities={
            "sensor.z": SimpleNamespace(
                entity_id="sensor.z",
                name=None,
                original_name="Z sensor",
                area_id=None,
                device_id="device-b",
                disabled_by=None,
            ),
            "sensor.a": SimpleNamespace(
                entity_id="sensor.a",
                name="A sensor",
                original_name="Original A",
                area_id="area-a",
                device_id="device-a",
                disabled_by="user",
            ),
        }
    )

    with (
        patch(
            "custom_components.ai_orchestrator.websocket_api.ar.async_get",
            return_value=fake_areas,
        ),
        patch(
            "custom_components.ai_orchestrator.websocket_api.dr.async_get",
            return_value=fake_devices,
        ),
        patch(
            "custom_components.ai_orchestrator.websocket_api.er.async_get",
            return_value=fake_entities,
        ),
    ):
        client = await hass_ws_client(hass)
        await client.send_json_auto_id({"type": CATALOG_WEBSOCKET_TYPE})
        response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == {
        "schema_version": CATALOG_SCHEMA_VERSION,
        "areas": [
            {"area_id": "area-a", "name": "Kitchen"},
            {"area_id": "area-b", "name": "Bedroom"},
        ],
        "devices": [
            {"device_id": "device-a", "name": "Named device", "area_id": "area-a"},
            {"device_id": "device-b", "name": "Zigbee device", "area_id": None},
        ],
        "entities": [
            {
                "entity_id": "sensor.a",
                "name": "A sensor",
                "area_id": "area-a",
                "device_id": "device-a",
                "disabled": True,
            },
            {
                "entity_id": "sensor.z",
                "name": "Z sensor",
                "area_id": None,
                "device_id": "device-b",
                "disabled": False,
            },
        ],
    }


@pytest.mark.parametrize(
    "message",
    [
        {"type": CATALOG_WEBSOCKET_TYPE},
        {"type": PROVIDER_LIST_WEBSOCKET_TYPE},
        {
            "type": PROVIDER_TEST_WEBSOCKET_TYPE,
            CONF_CONNECTION_ID: PROVIDER_CONNECTION_ID,
        },
    ],
)
async def test_non_admin_provider_commands_are_unauthorized(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
    message: dict[str, str],
) -> None:
    """Provider metadata and network tests are administrator-only."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)

    await client.send_json_auto_id(message)
    response = await client.receive_json()

    assert response["success"] is False
    assert response["error"]["code"] == ERR_UNAUTHORIZED


async def test_admin_provider_test_returns_bounded_success(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An explicit administrator test validates only the selected connection."""
    await _setup_loaded_provider(hass)
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {
            "type": PROVIDER_TEST_WEBSOCKET_TYPE,
            CONF_CONNECTION_ID: PROVIDER_CONNECTION_ID,
        }
    )
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == {
        "schema_version": 1,
        "connection_id": PROVIDER_CONNECTION_ID,
        "health": "healthy",
        "error_code": None,
    }
    assert async_get_runtime(hass).provider_test_in_progress_connection_ids == set()


@pytest.mark.parametrize(
    ("error", "health", "error_code"),
    [
        (
            ProviderError(
                NormalizedError(
                    code=ErrorCode.AUTHENTICATION,
                    message=SAFE_ERROR_MESSAGES[ErrorCode.AUTHENTICATION],
                ),
                retry_allowed=False,
                failover_allowed=False,
            ),
            "authentication_required",
            "authentication",
        ),
        (
            ProviderError(
                NormalizedError(
                    code=ErrorCode.TIMEOUT,
                    message=SAFE_ERROR_MESSAGES[ErrorCode.TIMEOUT],
                ),
                retry_allowed=True,
                failover_allowed=False,
            ),
            "unavailable",
            "timeout",
        ),
        (RuntimeError("raw-provider-canary-must-not-leak"), "unavailable", "unknown"),
    ],
)
async def test_admin_provider_test_normalizes_failures_without_exception_egress(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    error: BaseException,
    health: str,
    error_code: str,
) -> None:
    """Provider and adapter exception details never enter the browser response."""
    entry = await _setup_loaded_provider(hass)
    entry.runtime_data.provider.error = error
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {
            "type": PROVIDER_TEST_WEBSOCKET_TYPE,
            CONF_CONNECTION_ID: PROVIDER_CONNECTION_ID,
        }
    )
    response = await client.receive_json()

    assert response["success"] is True
    assert response["result"] == {
        "schema_version": 1,
        "connection_id": PROVIDER_CONNECTION_ID,
        "health": health,
        "error_code": error_code,
    }
    assert "raw-provider-canary-must-not-leak" not in json.dumps(response)


async def test_provider_test_rejects_unknown_connection_and_extra_fields(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The command cannot test an arbitrary endpoint or accept extra input."""
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {
            "type": PROVIDER_TEST_WEBSOCKET_TYPE,
            CONF_CONNECTION_ID: PROVIDER_CONNECTION_ID,
        }
    )
    response = await client.receive_json()
    assert response["success"] is False
    assert response["error"]["code"] == PROVIDER_NOT_FOUND

    await client.send_json_auto_id(
        {
            "type": PROVIDER_TEST_WEBSOCKET_TYPE,
            CONF_CONNECTION_ID: PROVIDER_CONNECTION_ID,
            "endpoint": "http://unapproved.invalid",
        }
    )
    response = await client.receive_json()
    assert response["success"] is False


async def test_provider_test_rejects_duplicate_in_progress_request(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """Backend concurrency control does not rely only on the disabled UI button."""
    await _setup_loaded_provider(hass)
    async_get_runtime(hass).provider_test_in_progress_connection_ids.add(
        PROVIDER_CONNECTION_ID
    )
    async_register_websocket_commands(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {
            "type": PROVIDER_TEST_WEBSOCKET_TYPE,
            CONF_CONNECTION_ID: PROVIDER_CONNECTION_ID,
        }
    )
    response = await client.receive_json()

    assert response["success"] is False
    assert response["error"]["code"] == PROVIDER_TEST_IN_PROGRESS
