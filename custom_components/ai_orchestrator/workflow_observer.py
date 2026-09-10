"""Isolated HA lifecycle harness for observations, never workflow execution.

Nothing installs this harness at integration startup. It retains one redacted
preview and saturating counters only; no caller can supply an execution callback.
All methods must run on the Home Assistant event loop.
"""

from __future__ import annotations

from collections.abc import Callable
from copy import deepcopy
from datetime import datetime
from typing import Any

from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.helpers.event import (
    async_track_state_change_event,
    async_track_time_change,
)
from homeassistant.util import dt as dt_util

from .workflow_preview import preview_workflow
from .workflow_schema import TriggerKind, parse_workflow

MAX_OBSERVATIONS = 2**31 - 1


class WorkflowObserverError(RuntimeError):
    """Static redacted lifecycle failure."""


class WorkflowObserver:
    """Observe a fixed validated draft with bounded HA state/time listeners."""

    def __init__(self, hass: HomeAssistant, workflow_raw: Any) -> None:
        """Capture a normalized private copy, independent of caller mutations."""
        self._hass = hass
        self._workflow = parse_workflow(workflow_raw)
        self._raw = self._workflow.as_dict()
        self._condition_entities = frozenset(
            condition.entity_id
            for condition in self._workflow.conditions
            if condition.entity_id is not None
        )
        self._generation: object | None = None
        self._unsubscribers: list[Callable[[], None]] = []
        self._observations = 0
        self._ignored = 0
        self._latest: dict[str, Any] | None = None

    @property
    def report(self) -> dict[str, Any]:
        """Return redacted detached evidence, with no historical state data."""
        return {
            "active": self._generation is not None,
            "observations": self._observations,
            "ignored_events": self._ignored,
            "registrations": len(self._unsubscribers),
            "latest": deepcopy(self._latest),
        }

    @callback
    def start(self) -> None:
        """Attach deduplicated listeners or clean up a partially failed start."""
        if self._generation is not None:
            return
        if not self._workflow.enabled:
            raise WorkflowObserverError("disabled workflow cannot be observed")
        if self._unsubscribers and self._detach():
            raise WorkflowObserverError("observer cleanup failed")
        generation = object()
        self._generation = generation

        @callback
        def state_changed(event: Event) -> None:
            if self._generation is not generation:
                return
            old, new = event.data.get("old_state"), event.data.get("new_state")
            # Creation/removal has no complete transition. Never fabricate one.
            if not self._bounded_state(old) or not self._bounded_state(new):
                self._ignored = min(MAX_OBSERVATIONS, self._ignored + 1)
                return
            self._observe(
                {
                    "kind": "state",
                    "entity_id": new.entity_id,
                    "from_state": old.state,
                    "to_state": new.state,
                },
                dt_util.now(),
            )

        @callback
        def time_changed(now: datetime) -> None:
            if self._generation is generation:
                self._observe({"kind": "time"}, now)

        entities = sorted(
            {
                entity
                for trigger in self._workflow.triggers
                if trigger.kind is TriggerKind.STATE
                for entity in trigger.entity_ids
            }
        )
        times = sorted(
            {
                trigger.at_time
                for trigger in self._workflow.triggers
                if trigger.kind is TriggerKind.TIME
            }
        )
        try:
            if entities:
                self._unsubscribers.append(
                    async_track_state_change_event(self._hass, entities, state_changed)
                )
            for at_time in times:
                hour, minute = (int(part) for part in at_time.split(":"))
                self._unsubscribers.append(
                    async_track_time_change(
                        self._hass, time_changed, hour=hour, minute=minute, second=0
                    )
                )
        except Exception:  # noqa: BLE001 -- invalidate and clean every registration
            self._detach()
            raise WorkflowObserverError("observer registration failed") from None

    @callback
    def _detach(self) -> bool:
        self._generation = None
        unsubscribers, self._unsubscribers = self._unsubscribers, []
        failed = False
        for unsubscribe in reversed(unsubscribers):
            try:
                unsubscribe()
            except Exception:  # noqa: BLE001 -- continue cleaning other listeners
                failed = True
                self._unsubscribers.append(unsubscribe)
        return failed

    @callback
    def stop(self) -> None:
        """Invalidate queued callbacks before detaching all current listeners."""
        if self._detach():
            raise WorkflowObserverError("observer cleanup failed")

    @callback
    def manual(self, now: datetime) -> dict[str, Any]:
        """Observe a manual event at the supplied instant while active."""
        if self._generation is None:
            raise WorkflowObserverError("observer is not active")
        return self._observe({"kind": "manual"}, now)

    @staticmethod
    def _bounded_state(state: State | None) -> bool:
        return isinstance(state, State) and len(state.state) <= 255

    @callback
    def _observe(self, event: dict[str, str], now: datetime) -> dict[str, Any]:
        if not isinstance(now, datetime) or now.tzinfo is None:
            raise WorkflowObserverError("observation requires an aware datetime")
        states = {}
        for entity_id in self._condition_entities:
            state = self._hass.states.get(entity_id)
            if self._bounded_state(state):
                states[entity_id] = state.state
        result = preview_workflow(
            self._raw,
            {
                "states": states,
                "time": dt_util.as_local(now).strftime("%H:%M"),
                "event": event,
            },
        )
        result["mode"] = "observation_only"
        self._latest = result
        self._observations = min(MAX_OBSERVATIONS, self._observations + 1)
        return deepcopy(result)
