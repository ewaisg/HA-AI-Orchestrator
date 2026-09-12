"""Foundation-owned workflow activation over stored documents (WFL-002).

The manager loads the workflow store when the foundation entry starts and keeps
one `WorkflowObserver` per enabled workflow. Observers evaluate the curated
deterministic triggers and conditions against live Home Assistant state and
record a redacted outcome. No step executes: there is no provider call, no
notification, and no Home Assistant action in this module. Step execution is
separate tracked work (WFL-003, WFL-004) behind the release gate.
"""

from __future__ import annotations

import asyncio
from copy import deepcopy
from typing import Any, Final

from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .workflow_observer import WorkflowObserver, WorkflowObserverError
from .workflow_store import WorkflowStore, WorkflowStoreError

STORE_READY: Final = "ready"
STORE_NOT_LOADED: Final = "not_loaded"
STORE_UNREADABLE: Final = "unreadable"

ERROR_ACTIVATION_FAILED: Final = "activation_failed"
ERROR_CLEANUP_FAILED: Final = "cleanup_failed"


class WorkflowManagerError(RuntimeError):
    """Static, redacted manager failure."""


class WorkflowManager:
    """Own store loading and observer lifecycle for one Home Assistant instance."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Create an idle manager; nothing is read or registered yet."""
        self._hass = hass
        self._store = WorkflowStore(hass)
        self._observers: dict[str, WorkflowObserver] = {}
        self._stale: dict[str, WorkflowObserver] = {}
        self._errors: dict[str, str] = {}
        self._store_state = STORE_NOT_LOADED
        self._started = False
        self._lock = asyncio.Lock()

    @property
    def started(self) -> bool:
        """Return whether start completed (even with an unreadable store)."""
        return self._started

    async def async_start(self) -> None:
        """Load the store and activate every enabled workflow.

        A stale observer whose cleanup failed earlier is retried first and
        blocks re-activation of that workflow until clean. An unreadable store
        leaves every workflow inactive and refuses writes; the foundation
        entry still loads so the rest of the panel keeps working.
        """
        # Waiting on the lock lets a mutation that was in flight across an
        # unload/reload finish before activation reads the store.
        async with self._lock:
            if self._started:
                return
            self._retry_stale()
            if not self._store.loaded:
                try:
                    await self._store.async_load()
                except WorkflowStoreError:
                    self._store_state = STORE_UNREADABLE
                    self._started = True
                    return
            self._store_state = STORE_READY
            self._started = True
            for document in self._store.list():
                if document["enabled"]:
                    self._activate(document)

    @callback
    def async_stop(self) -> bool:
        """Detach every observer; return whether all cleanup succeeded."""
        for workflow_id in list(self._observers):
            self._deactivate(workflow_id)
        self._retry_stale()
        self._started = False
        return not self._stale

    @callback
    def _retry_stale(self) -> None:
        for workflow_id, observer in list(self._stale.items()):
            try:
                observer.stop()
            except WorkflowObserverError:
                continue
            del self._stale[workflow_id]
            self._errors.pop(workflow_id, None)

    @callback
    def _activate(self, document: dict[str, Any]) -> None:
        workflow_id = document["workflow_id"]
        if workflow_id in self._stale:
            self._errors[workflow_id] = ERROR_CLEANUP_FAILED
            return
        observer = WorkflowObserver(self._hass, document)
        try:
            observer.start()
        except WorkflowObserverError:
            self._errors[workflow_id] = ERROR_ACTIVATION_FAILED
            return
        self._observers[workflow_id] = observer
        self._errors.pop(workflow_id, None)

    @callback
    def _deactivate(self, workflow_id: str) -> None:
        observer = self._observers.pop(workflow_id, None)
        self._errors.pop(workflow_id, None)
        if observer is None:
            return
        try:
            observer.stop()
        except WorkflowObserverError:
            self._stale[workflow_id] = observer
            self._errors[workflow_id] = ERROR_CLEANUP_FAILED

    def _require_ready(self) -> None:
        if not self._started or self._store_state != STORE_READY:
            raise WorkflowManagerError("workflow storage is unavailable")

    @callback
    def _apply(self, document: dict[str, Any]) -> None:
        """Replace the live observer to match a document that was just stored.

        A mutation that completes after the manager stopped (foundation
        unloaded while the write was in flight) must not register a listener
        nobody will stop; the next start re-reads the store instead.
        """
        self._deactivate(document["workflow_id"])
        self._retry_stale()
        if self._started and document["enabled"]:
            self._activate(document)

    async def async_save(self, raw: Any) -> dict[str, Any]:
        """Validate, persist, and (re)activate one workflow document."""
        async with self._lock:
            self._require_ready()
            document = await self._store.async_upsert(raw)
            self._apply(document)
            return document

    async def async_delete(self, workflow_id: str) -> bool:
        """Deactivate and remove one workflow; return whether it existed."""
        async with self._lock:
            self._require_ready()
            self._deactivate(workflow_id)
            self._retry_stale()
            return await self._store.async_delete(workflow_id)

    async def async_set_enabled(
        self, workflow_id: str, enabled: bool
    ) -> dict[str, Any]:
        """Persist the enabled flag and apply it to the live observer."""
        async with self._lock:
            self._require_ready()
            document = await self._store.async_set_enabled(workflow_id, enabled)
            self._apply(document)
            return document

    @callback
    def run_manual(self, workflow_id: str) -> dict[str, Any]:
        """Record one manual observation for an active workflow.

        This evaluates triggers and conditions at the current instant and
        returns the redacted outcome. Nothing executes.
        """
        observer = self._observers.get(workflow_id)
        if observer is None:
            raise WorkflowManagerError("workflow is not active")
        return observer.manual(dt_util.utcnow())

    @callback
    def status(self) -> dict[str, Any]:
        """Return every stored document with its redacted live status."""
        workflows = []
        for document in self._store.list():
            workflow_id = document["workflow_id"]
            observer = self._observers.get(workflow_id) or self._stale.get(workflow_id)
            report = (
                observer.report
                if observer is not None
                else {
                    "active": False,
                    "observations": 0,
                    "ignored_events": 0,
                    "registrations": 0,
                    "latest": None,
                }
            )
            workflows.append(
                {
                    "workflow": deepcopy(document),
                    "status": {**report, "error": self._errors.get(workflow_id)},
                }
            )
        return {"store": self._store_state, "workflows": workflows}
