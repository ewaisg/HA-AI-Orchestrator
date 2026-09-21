"""Selected physical-light drafts carry no unattended action authority."""

import copy
import json
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ai_orchestrator.providers.contract import TextGenerationResult
from custom_components.ai_orchestrator.runtime import async_get_runtime
from tests.home_assistant.test_workflow_draft_api import message, prepare, source_for
from tests.home_assistant.test_workflow_dry_run_api import call
from tests.quality.test_light_workflow_schema import LIGHT_WORKFLOW


async def prepare_light(hass):
    provider, provider_entry = await prepare(hass)
    config = MockConfigEntry(
        domain="test", unique_id="synthetic-light-adapter", data={}
    )
    config.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=config.entry_id,
        identifiers={("test", "synthetic-light-device")},
        name="Synthetic light",
    )
    entry = er.async_get(hass).async_get_or_create(
        "light", "test", "synthetic-light", config_entry=config, device_id=device.id
    )
    hass.states.async_set(entry.entity_id, "off", {"private": "UNSENT_LIGHT_ATTRIBUTE"})
    hass.services.async_register("light", "turn_on", AsyncMock())
    hass.services.async_register("light", "turn_off", AsyncMock())
    document = copy.deepcopy(LIGHT_WORKFLOW)
    document["steps"][0]["target_registry_id"] = entry.id
    document["description"] = ""
    draft = {
        key: document[key]
        for key in ("name", "description", "triggers", "conditions", "steps")
    }
    provider.generate.return_value = TextGenerationResult(
        text="", structured_output=draft
    )
    return provider, provider_entry, entry, device, config, document


async def test_selected_light_draft_is_unsaved_provider_free_no_grant(
    hass, hass_ws_client, hass_storage
):
    provider, _, entry, _, _, _ = await prepare_light(hass)
    client = await hass_ws_client(hass)
    before = copy.deepcopy(hass_storage)
    with patch.object(
        type(hass.services), "async_call", new_callable=AsyncMock
    ) as action:
        response = await call(
            client, message(entity_ids=[entry.entity_id], notify_targets=[])
        )
    assert response["success"]
    result = response["result"]
    assert result["workflow"]["provider_connection_id"] is None
    assert result["workflow"]["enabled"] is False
    assert result["saved"] is False and result["actions_executed"] == 0
    assert "grant" not in json.dumps(result)
    request = provider.generate.call_args.args[0]
    payload = json.loads(request.messages[1].content)
    assert payload["selected_lights"] == [
        {"registry_id": entry.id, "entity_id": entry.entity_id}
    ]
    assert "UNSENT_LIGHT_ATTRIBUTE" not in request.messages[1].content
    assert "identity_digest" not in request.messages[1].content
    assert "off" not in payload.values()
    assert not request.tools
    assert hass_storage == before
    action.assert_not_called()


@pytest.mark.parametrize(
    "change", ["unselected", "rename", "device", "service", "group", "disabled"]
)
async def test_light_draft_cannot_expand_or_keep_changed_identity(
    hass, hass_ws_client, change
):
    provider, _, entry, device, _, _ = await prepare_light(hass)
    output = provider.generate.return_value

    async def generate(_request):
        if change == "rename":
            er.async_get(hass).async_update_entity(
                entry.entity_id, new_entity_id="light.changed"
            )
        elif change == "device":
            dr.async_get(hass).async_update_device(
                device.id, name_by_user="Changed physical target"
            )
        elif change == "service":
            hass.services.async_remove("light", "turn_on")
        elif change == "group":
            hass.states.async_set(
                entry.entity_id, "off", {"entity_id": ["light.other"]}
            )
        elif change == "disabled":
            er.async_get(hass).async_update_entity(
                entry.entity_id, disabled_by=er.RegistryEntryDisabler.USER
            )
        return output

    provider.generate.side_effect = generate
    response = await call(
        await hass_ws_client(hass),
        message(
            entity_ids=[] if change == "unselected" else [entry.entity_id],
            notify_targets=[],
        ),
    )
    assert not response["success"]
    assert response["error"]["code"] in {
        "draft_invalid_selection",
        "draft_invalid_references",
    }


async def test_light_state_change_does_not_invalidate_identity(hass, hass_ws_client):
    provider, _, entry, _, _, _ = await prepare_light(hass)
    output = provider.generate.return_value

    async def generate(_request):
        hass.states.async_set(
            entry.entity_id, "on", {"private": "UNSENT_LIGHT_ATTRIBUTE"}
        )
        return output

    provider.generate.side_effect = generate
    response = await call(
        await hass_ws_client(hass),
        message(entity_ids=[entry.entity_id], notify_targets=[]),
    )
    assert response["success"]


async def test_refinement_requires_selected_light_and_returns_new_disabled_copy(
    hass, hass_ws_client, hass_storage
):
    provider, _, entry, _, _, document = await prepare_light(hass)
    manager = async_get_runtime(hass).workflow_manager
    await manager.async_save(document)
    client = await hass_ws_client(hass)
    source = await source_for(client, document["workflow_id"])
    assert source["entity_ids"] == [entry.entity_id]
    refused = await call(
        client,
        message(
            source_workflow_id=source["workflow_id"],
            source_version=source["version"],
            entity_ids=[],
            notify_targets=[],
        ),
    )
    assert refused["error"]["code"] == "draft_source_changed"
    provider.generate.assert_not_called()
    before = copy.deepcopy(hass_storage)
    response = await call(
        client,
        message(
            source_workflow_id=source["workflow_id"],
            source_version=source["version"],
            entity_ids=[entry.entity_id],
            notify_targets=[],
        ),
    )
    assert response["success"]
    assert response["result"]["workflow"]["workflow_id"] != source["workflow_id"]
    assert response["result"]["workflow"]["provider_connection_id"] is None
    assert hass_storage == before


async def test_removed_source_light_lookup_fails_closed(hass, hass_ws_client):
    _, _, entry, _, _, document = await prepare_light(hass)
    await async_get_runtime(hass).workflow_manager.async_save(document)
    er.async_get(hass).async_remove(entry.entity_id)
    response = await call(
        await hass_ws_client(hass),
        {
            "type": "ai_orchestrator/workflows/draft_source",
            "source_workflow_id": document["workflow_id"],
        },
    )
    assert response["error"]["code"] == "draft_source_unavailable"
