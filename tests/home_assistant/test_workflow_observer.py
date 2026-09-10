"""Observation-only lifecycle evidence using the named Core test harness."""

from datetime import UTC, datetime
from unittest.mock import Mock, patch

import pytest
from homeassistant.core import Event, HomeAssistant, State
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.ai_orchestrator import workflow_observer as observer_module
from custom_components.ai_orchestrator.workflow_observer import (
    MAX_OBSERVATIONS,
    WorkflowObserver,
    WorkflowObserverError,
)

NOW = datetime(2026, 9, 9, 20, 15, tzinfo=UTC)


@pytest.fixture(autouse=True)
def local_clock(hass):
    original = dt_util.DEFAULT_TIME_ZONE
    dt_util.set_default_time_zone(UTC)
    yield
    dt_util.set_default_time_zone(original)


@pytest.fixture
def draft():
    return {
        "schema_version": 1,
        "workflow_id": "12345678-1234-4123-8123-123456789abc",
        "name": "private household name",
        "enabled": True,
        "triggers": [{"kind": "manual"}],
        "conditions": [],
        "steps": [{"step_id": "compose", "kind": "ai_compose", "prompt": "private"}],
    }


async def test_real_state_helper_observes_once_and_stops(hass, draft):
    draft["triggers"] = [
        {"kind": "state", "entity_ids": ["sensor.synthetic"], "to_state": "on"}
    ] * 2
    hass.states.async_set("sensor.synthetic", "off")
    await hass.async_block_till_done()
    observer = WorkflowObserver(hass, draft)
    observer.start()
    observer.start()
    assert observer.report["registrations"] == 1
    hass.states.async_set("sensor.synthetic", "on")
    await hass.async_block_till_done()
    assert observer.report["observations"] == 1
    assert observer.report["latest"]["eligible"]
    assert all(item["passed"] for item in observer.report["latest"]["trigger_results"])
    observer.stop()
    observer.stop()
    hass.states.async_set("sensor.synthetic", "off")
    await hass.async_block_till_done()
    assert observer.report["observations"] == 1
    assert observer.report["registrations"] == 0


async def test_creation_removal_and_attributes_do_not_trigger(hass, draft):
    draft["triggers"] = [{"kind": "state", "entity_ids": ["sensor.synthetic"]}]
    observer = WorkflowObserver(hass, draft)
    observer.start()
    hass.states.async_set("sensor.synthetic", "on")
    await hass.async_block_till_done()
    assert observer.report["ignored_events"] == 1
    hass.states.async_set("sensor.synthetic", "on", {"private": "attribute"})
    await hass.async_block_till_done()
    assert not observer.report["latest"]["triggered"]
    hass.states.async_remove("sensor.synthetic")
    await hass.async_block_till_done()
    assert observer.report["ignored_events"] == 2
    observer.stop()


@pytest.mark.parametrize("state", [None, "unknown", "unavailable", "off"])
def test_manual_fails_closed_on_missing_or_nonmatching_condition(hass, draft, state):
    draft["conditions"] = [
        {"kind": "state", "entity_id": "sensor.synthetic", "state": "on"}
    ]
    if state is not None:
        hass.states.async_set("sensor.synthetic", state)
    observer = WorkflowObserver(hass, draft)
    observer.start()
    result = observer.manual(NOW)
    assert not result["eligible"]
    assert result["provider_calls"] == result["actions_executed"] == 0
    observer.stop()


def test_manual_reads_only_conditions_and_detaches_private_data(hass, draft):
    draft["conditions"] = [
        {"kind": "state", "entity_id": "sensor.synthetic", "state": "on"}
    ]
    hass.states.async_set("sensor.synthetic", "on", {"private": "secret"})
    observer = WorkflowObserver(hass, draft)
    draft["conditions"][0]["entity_id"] = "sensor.changed"
    observer.start()
    with patch.object(type(hass.states), "get", wraps=hass.states.get) as get_state:
        result = observer.manual(NOW)
    get_state.assert_called_once_with("sensor.synthetic")
    assert result["eligible"]
    assert result["mode"] == "observation_only"
    assert "private" not in str(observer.report)
    assert "synthetic" not in str(observer.report)
    assert "secret" not in str(observer.report)
    result["eligible"] = False
    observer.report["latest"]["eligible"] = False
    assert observer.report["latest"]["eligible"]
    observer.stop()


def test_disabled_and_stopped_manual_rejected(hass, draft):
    draft["enabled"] = False
    observer = WorkflowObserver(hass, draft)
    with pytest.raises(WorkflowObserverError, match="disabled"):
        observer.start()
    with pytest.raises(WorkflowObserverError, match="not active"):
        observer.manual(NOW)
    assert observer.report["registrations"] == 0


def test_manual_requires_aware_time(hass, draft):
    observer = WorkflowObserver(hass, draft)
    observer.start()
    with pytest.raises(WorkflowObserverError, match="aware datetime"):
        observer.manual(datetime(2026, 9, 9))
    assert observer.report["observations"] == 0
    observer.stop()


def test_manual_does_not_bypass_trigger_kinds(hass, draft):
    draft["triggers"] = [{"kind": "time", "at_time": "20:15"}]
    observer = WorkflowObserver(hass, draft)
    observer.start()
    assert not observer.manual(NOW)["triggered"]
    observer.stop()


def test_unique_time_registration_and_stale_generations(hass, draft):
    draft["triggers"] = [{"kind": "time", "at_time": "20:15"}] * 2
    observer = WorkflowObserver(hass, draft)
    callbacks = []
    remove = Mock()

    def register(hass, action, **kwargs):
        assert kwargs == {"hour": 20, "minute": 15, "second": 0}
        callbacks.append(action)
        return remove

    with patch.object(observer_module, "async_track_time_change", register):
        observer.start()
        assert len(callbacks) == 1
        callbacks[0](NOW)
        assert observer.report["latest"]["triggered"]
        observer.stop()
        callbacks[0](NOW)
        observer.start()
        callbacks[0](NOW)
        assert observer.report["observations"] == 1
        callbacks[1](NOW)
        assert observer.report["observations"] == 2
        observer.stop()
    assert remove.call_count == 2


def test_time_uses_home_assistant_timezone_and_minute_precision(hass, draft):
    draft["conditions"] = [
        {"kind": "time_window", "after_time": "14:15", "before_time": "14:16"}
    ]
    original = dt_util.DEFAULT_TIME_ZONE
    dt_util.set_default_time_zone(dt_util.get_time_zone("America/Denver"))
    observer = WorkflowObserver(hass, draft)
    try:
        observer.start()
        assert observer.manual(NOW.replace(second=59))["eligible"]
        assert not observer.manual(NOW.replace(minute=16))["eligible"]
    finally:
        observer.stop()
        dt_util.set_default_time_zone(original)


def test_partial_start_failure_cleans_prior_registration(hass, draft):
    draft["triggers"] = [
        {"kind": "state", "entity_ids": ["sensor.synthetic"]},
        {"kind": "time", "at_time": "20:15"},
    ]
    observer = WorkflowObserver(hass, draft)
    remove = Mock()
    with (
        patch.object(
            observer_module, "async_track_state_change_event", return_value=remove
        ),
        patch.object(
            observer_module,
            "async_track_time_change",
            side_effect=ValueError("private"),
        ),
        pytest.raises(WorkflowObserverError, match="^observer registration failed$"),
    ):
        observer.start()
    remove.assert_called_once()
    assert not observer.report["active"]
    assert observer.report["registrations"] == 0
    observer.start()
    observer.stop()


def test_cleanup_failure_still_invalidates_and_cleans_others(hass, draft):
    draft["triggers"] = [
        {"kind": "time", "at_time": "20:15"},
        {"kind": "time", "at_time": "20:16"},
    ]
    first = Mock()
    second = Mock(side_effect=ValueError("private"))
    observer = WorkflowObserver(hass, draft)
    with patch.object(
        observer_module, "async_track_time_change", side_effect=[first, second]
    ):
        observer.start()
    with pytest.raises(WorkflowObserverError, match="^observer cleanup failed$"):
        observer.stop()
    first.assert_called_once()
    second.assert_called_once()
    assert not observer.report["active"]


def test_old_state_callback_cannot_cross_stop_restart(hass, draft):
    draft["triggers"] = [{"kind": "state", "entity_ids": ["sensor.synthetic"]}]
    observer = WorkflowObserver(hass, draft)
    with patch.object(
        observer_module, "async_track_state_change_event", return_value=Mock()
    ) as register:
        observer.start()
        stale = register.call_args.args[2]
        observer.stop()
        observer.start()
        event = Event(
            "state_changed",
            {
                "entity_id": "sensor.synthetic",
                "old_state": State("sensor.synthetic", "off"),
                "new_state": State("sensor.synthetic", "on"),
            },
        )
        stale(event)
        assert observer.report["observations"] == 0
        register.call_args.args[2](event)
        assert observer.report["observations"] == 1
        observer.stop()


def test_failed_unsubscribe_retries_and_stale_callback_stays_inert(hass, draft):
    draft["triggers"] = [{"kind": "time", "at_time": "20:15"}]
    remove = Mock(side_effect=[ValueError("private"), None])
    observer = WorkflowObserver(hass, draft)
    with patch.object(
        observer_module, "async_track_time_change", return_value=remove
    ) as register:
        observer.start()
        stale = register.call_args.args[1]
        with pytest.raises(WorkflowObserverError, match="^observer cleanup failed$"):
            observer.stop()
        assert observer.report["registrations"] == 1
        stale(NOW)
        assert observer.report["observations"] == 0
        observer.stop()
        assert observer.report["registrations"] == 0
        remove.assert_called_with()
        assert remove.call_count == 2


def test_restart_retries_cleanup_and_refuses_to_add_listeners_until_clean(hass, draft):
    draft["triggers"] = [{"kind": "time", "at_time": "20:15"}]
    remove = Mock(side_effect=ValueError("private"))
    observer = WorkflowObserver(hass, draft)
    with patch.object(
        observer_module, "async_track_time_change", return_value=remove
    ) as register:
        observer.start()
        with pytest.raises(WorkflowObserverError, match="^observer cleanup failed$"):
            observer.stop()
        with pytest.raises(WorkflowObserverError, match="^observer cleanup failed$"):
            observer.start()
        assert register.call_count == 1
        assert remove.call_count == 2
        assert not observer.report["active"]
        remove.side_effect = None
        observer.start()
        assert register.call_count == 2
        assert observer.report["active"]
        observer.stop()


def test_fresh_instance_resets_harness_evidence_and_counters_saturate(hass, draft):
    observer = WorkflowObserver(hass, draft)
    observer.start()
    observer._observations = MAX_OBSERVATIONS
    observer.manual(NOW)
    assert observer.report["observations"] == MAX_OBSERVATIONS
    observer.stop()
    fresh = WorkflowObserver(hass, draft)
    fresh.start()
    assert fresh.report["observations"] == 0
    assert fresh.report["latest"] is None
    fresh.stop()


async def test_real_time_helper_fires_and_stop_cancels(
    hass: HomeAssistant, draft, freezer
):
    freezer.move_to(NOW.replace(second=0))
    draft["triggers"] = [{"kind": "time", "at_time": "20:16"}]
    observer = WorkflowObserver(hass, draft)
    observer.start()
    freezer.tick(61)
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert observer.report["observations"] == 1
    assert observer.report["latest"]["eligible"]
    observer.stop()
    freezer.tick(24 * 60 * 60)
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert observer.report["observations"] == 1
