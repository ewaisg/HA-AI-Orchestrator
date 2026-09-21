"""Foundation-owned workflow activation over stored documents (WFL-002).

The manager loads the workflow store when the foundation entry starts and keeps
one `WorkflowObserver` per enabled workflow. Observers evaluate the curated
deterministic triggers and conditions against live Home Assistant state and
record a redacted outcome. A workflow stored with `run_mode: execute` also
has its eligible outcomes handed to `workflow_execution`, one run at a time
per workflow; everything else stays observation-only. The manager keeps
only redacted execution evidence (statuses, error codes, counters).
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from collections.abc import Callable
from copy import deepcopy
from typing import Any, Final

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .providers.contract import Provider
from .workflow_actions import is_light
from .workflow_execution import async_execute_workflow
from .workflow_notify import async_resolve_notify_target
from .workflow_observer import WorkflowObserver, WorkflowObserverError
from .workflow_schema import RUN_MODE_EXECUTE, parse_workflow
from .workflow_steps import StepContext, WorkflowStepError
from .workflow_store import WorkflowNotFoundError, WorkflowStore, WorkflowStoreError

STORE_READY: Final = "ready"
STORE_NOT_LOADED: Final = "not_loaded"
STORE_UNREADABLE: Final = "unreadable"

ERROR_ACTIVATION_FAILED: Final = "activation_failed"
ERROR_CLEANUP_FAILED: Final = "cleanup_failed"
ERROR_EXECUTION_CONTEXT: Final = "execution_context_invalid"
ERROR_DRY_RUN_REQUIRED: Final = "dry_run_required"
MAX_EXECUTION_COUNTER: Final = 1_000_000
MAX_TARGET_BINDINGS: Final = 1000
STARTUP_RETRY_SECONDS: Final = 5
STARTUP_MAX_RETRIES: Final = 60
_PROCESS_ID: Final = uuid.uuid4().hex


def _empty_execution_stats() -> dict[str, Any]:
    return {
        "executions": 0,
        "execution_failures": 0,
        "skipped_busy": 0,
        "execution_running": False,
        "last_execution": None,
    }


class WorkflowManagerError(RuntimeError):
    """Static, redacted manager failure."""


class WorkflowDryRunRequired(WorkflowManagerError):
    """Execution publication requires a successful matching dry run."""


class WorkflowManager:
    """Own store loading and observer lifecycle for one Home Assistant instance."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Create an idle manager; nothing is read or registered yet."""
        self._hass = hass
        self._store = WorkflowStore(hass)
        self._observers: dict[str, WorkflowObserver] = {}
        self._stale: dict[str, WorkflowObserver] = {}
        self._errors: dict[str, str] = {}
        self._executions: dict[str, dict[str, Any]] = {}
        self._running: set[str] = set()
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._task_connections: dict[str, str | None] = {}
        self._run_tokens: dict[str, object] = {}
        # Keep the previous object alive until replacement is observed, so
        # Python cannot recycle its id and accidentally revive a receipt.
        self._target_bindings = hass.data.setdefault(
            f"{DOMAIN}_publication_targets", {}
        )
        self._store_state = STORE_NOT_LOADED
        self._started = False
        self._lock = asyncio.Lock()
        self._startup_pending: set[str] = set()
        self._startup_cancel: Callable[[], None] | None = None
        self._startup_token: object | None = None
        self._action_service: Any = None

    def set_action_service(self, service: Any) -> None:
        """Attach the retained owner of unattended authorization and audit."""
        self._action_service = service

    async def async_wait_stopped(self) -> None:
        """Drain execution finalizers before shared durable audit recovery."""
        tasks = {task for task in self._tasks.values() if not task.done()}
        if tasks:
            _, pending = await asyncio.wait(tasks, timeout=10)
            if pending:
                raise WorkflowManagerError("Workflow executions are still stopping")

    @property
    def started(self) -> bool:
        """Return whether start completed (even with an unreadable store)."""
        return self._started

    @property
    def ready(self) -> bool:
        """Report usable loaded storage, independently of release-gate status."""
        return self._started and self._store_state == STORE_READY

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
                    if (
                        document.get("run_mode") == RUN_MODE_EXECUTE
                        and not is_light(document)
                        and self._lookup_provider(document["provider_connection_id"])
                        is None
                    ):
                        self._errors[document["workflow_id"]] = ERROR_ACTIVATION_FAILED
                    else:
                        self._activate(document)
                    if (
                        document["workflow_id"] not in self._observers
                        and document.get("run_mode") == RUN_MODE_EXECUTE
                    ):
                        self._startup_pending.add(document["workflow_id"])
            if self._startup_pending:
                self._schedule_startup_recovery()

    @callback
    def _schedule_startup_recovery(self) -> None:
        """Retry startup dependencies without changing any publication receipt."""
        token = self._startup_token = object()
        remaining = STARTUP_MAX_RETRIES

        @callback
        def retry(_event: object = None) -> None:
            nonlocal remaining
            if self._startup_token is not token or not self.ready:
                return
            self._startup_cancel = None
            remaining -= 1
            # Do not activate a pre-mutation document while storage is being
            # saved. Each later attempt reads the current authoritative record.
            if not self._lock.locked():
                for workflow_id in list(self._startup_pending):
                    document = self._store.get(workflow_id)
                    if (
                        document is None
                        or not document["enabled"]
                        or document["run_mode"] != RUN_MODE_EXECUTE
                        or workflow_id in self._observers
                    ):
                        self._startup_pending.discard(workflow_id)
                        continue
                    if (
                        not is_light(document)
                        and self._lookup_provider(document["provider_connection_id"])
                        is None
                    ):
                        continue
                    # The original exact receipt must match current provider
                    # config and target identities. Missing/replaced entities
                    # and legacy services after restart never acquire approval.
                    if not self._store.has_dry_run(
                        document, self.publication_bindings(document)
                    ):
                        self._errors[workflow_id] = ERROR_DRY_RUN_REQUIRED
                        continue
                    self._activate(document)
                    if workflow_id in self._observers:
                        self._startup_pending.discard(workflow_id)
            if self._startup_pending and remaining > 0:
                self._startup_cancel = async_call_later(
                    self._hass, STARTUP_RETRY_SECONDS, retry
                )
            else:
                self._startup_pending.clear()
                self._startup_token = None

        if self._hass.state is CoreState.running:
            self._startup_cancel = async_call_later(
                self._hass, STARTUP_RETRY_SECONDS, retry
            )
        else:
            self._startup_cancel = self._hass.bus.async_listen_once(
                EVENT_HOMEASSISTANT_STARTED, retry
            )

    @callback
    def async_stop(self) -> bool:
        """Detach every observer; return whether all cleanup succeeded."""
        self._startup_token = None
        self._startup_pending.clear()
        if self._startup_cancel is not None:
            self._startup_cancel()
            self._startup_cancel = None
        for workflow_id in list(self._observers):
            self._deactivate(workflow_id)
        self._cancel_all_runs()
        self._retry_stale()
        self._started = False
        return not self._stale and not self._tasks

    @callback
    def _cancel_run(self, workflow_id: str) -> None:
        """Stop an in-flight run so a disabled or removed workflow delivers nothing."""
        self._run_tokens.pop(workflow_id, None)
        task = self._tasks.get(workflow_id)
        if task is not None and not task.done():
            task.cancel()

    @callback
    def async_cancel_provider_runs(self, connection_id: str) -> None:
        """Revoke executions belonging to an unloaded provider connection."""
        for workflow_id, connection in list(self._task_connections.items()):
            if connection == connection_id:
                self._cancel_run(workflow_id)

    @callback
    def _cancel_all_runs(self) -> None:
        for workflow_id in list(self._tasks):
            self._cancel_run(workflow_id)

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
        if document.get("run_mode") == RUN_MODE_EXECUTE and not self._store.has_dry_run(
            document, self.publication_bindings(document)
        ):
            self._errors[workflow_id] = ERROR_DRY_RUN_REQUIRED
            return
        on_eligible = None
        if document.get("run_mode") == RUN_MODE_EXECUTE:
            snapshot_document = deepcopy(document)

            @callback
            def on_eligible(_result: dict[str, Any], snapshot: dict[str, Any]) -> None:
                self._schedule_execution(snapshot_document, snapshot)

        observer = WorkflowObserver(self._hass, document, on_eligible)
        try:
            observer.start()
        except WorkflowObserverError:
            self._errors[workflow_id] = ERROR_ACTIVATION_FAILED
            return
        self._observers[workflow_id] = observer
        self._errors.pop(workflow_id, None)

    @callback
    def _schedule_execution(
        self, document: dict[str, Any], snapshot: dict[str, Any]
    ) -> None:
        """Start one execution per eligible outcome, never two at once."""
        workflow_id = document["workflow_id"]
        stats = self._executions.setdefault(workflow_id, _empty_execution_stats())
        if not self._started or workflow_id not in self._observers:
            return
        if not self._store.has_dry_run(document, self.publication_bindings(document)):
            self._deactivate(workflow_id)
            self._errors[workflow_id] = ERROR_DRY_RUN_REQUIRED
            return
        if workflow_id in self._running:
            stats["skipped_busy"] = min(
                MAX_EXECUTION_COUNTER, stats["skipped_busy"] + 1
            )
            return
        self._running.add(workflow_id)
        stats["execution_running"] = True
        token = object()
        self._run_tokens[workflow_id] = token
        task = self._hass.async_create_task(
            self._async_run(document, snapshot, token),
            f"ai_orchestrator_run_{workflow_id}",
        )
        self._tasks[workflow_id] = task
        self._task_connections[workflow_id] = document.get("provider_connection_id")

        @callback
        def finished(completed: asyncio.Task[None]) -> None:
            # Also runs when cancelled before the coroutine ever starts.
            if self._tasks.get(workflow_id) is completed:
                self._tasks.pop(workflow_id)
                self._task_connections.pop(workflow_id, None)
                self._run_tokens.pop(workflow_id, None)
                self._running.discard(workflow_id)
                stats["execution_running"] = False

        task.add_done_callback(finished)

    def _lookup_provider(self, connection_id: str) -> Provider | None:
        # Imported lazily: chat depends on runtime, which depends on this module.
        from .chat import _local_connections  # noqa: PLC0415
        from .provider_entry import loaded_provider_matches_entry  # noqa: PLC0415

        for entry, loaded in _local_connections(self._hass):
            if loaded.connection_id == connection_id and loaded_provider_matches_entry(
                loaded, entry.data
            ):
                return loaded.provider
        return None

    async def _async_run(
        self, document: dict[str, Any], snapshot: dict[str, Any], token: object
    ) -> None:
        workflow_id = document["workflow_id"]
        stats = self._executions.setdefault(workflow_id, _empty_execution_stats())
        task = asyncio.current_task()

        def run_allowed() -> bool:
            return (
                task is not None
                and not task.cancelling()
                and self._started
                and workflow_id in self._observers
                and self._run_tokens.get(workflow_id) is token
                and self._store.has_dry_run(
                    document, self.publication_bindings(document)
                )
            )

        try:
            workflow = parse_workflow(document)
            context = StepContext(
                workflow_name=workflow.name,
                event=snapshot["event"],
                time=snapshot["time"],
                states=snapshot["states"],
            )
            record = await async_execute_workflow(
                self._hass,
                workflow,
                context,
                self._lookup_provider,
                run_allowed=run_allowed,
                light_executor=(
                    lambda: self._action_service.async_execute(document, run_allowed)
                )
                if is_light(document) and self._action_service is not None
                else None,
            )
        except WorkflowStepError, Exception:  # noqa: BLE001 -- keep evidence static
            record = {
                "started_at": dt_util.utcnow().isoformat(),
                "steps": [],
                "provider_calls": 0,
                "actions_executed": 0,
                "completed": False,
                "error": ERROR_EXECUTION_CONTEXT,
            }
        finally:
            if self._tasks.get(workflow_id) is task:
                self._tasks.pop(workflow_id, None)
                self._task_connections.pop(workflow_id, None)
                self._run_tokens.pop(workflow_id, None)
                self._running.discard(workflow_id)
            stats["execution_running"] = False
        if self._executions.get(workflow_id) is not stats:
            # Disabled, replaced or removed while running: its evidence was reset
            # on purpose and a record for the old document must not reappear.
            return
        stats["executions"] = min(MAX_EXECUTION_COUNTER, stats["executions"] + 1)
        if not record["completed"]:
            stats["execution_failures"] = min(
                MAX_EXECUTION_COUNTER, stats["execution_failures"] + 1
            )
        stats["last_execution"] = record

    @callback
    def _deactivate(self, workflow_id: str) -> None:
        observer = self._observers.pop(workflow_id, None)
        self._errors.pop(workflow_id, None)
        self._executions.pop(workflow_id, None)
        self._cancel_run(workflow_id)
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
            document = parse_workflow(raw).as_dict()
            self._require_publication_receipt(document)
            previous = self._store.get(document["workflow_id"])
            if is_light(document) or previous is not None and is_light(previous):
                if (
                    self._action_service is None
                    or not self._action_service.store.loaded
                ):
                    raise WorkflowManagerError("Unattended action policy unavailable")
                if document["enabled"]:
                    raise WorkflowManagerError(
                        "Save a light workflow disabled before authorizing"
                    )
                self._deactivate(document["workflow_id"])
                await self._action_service.async_invalidate(document["workflow_id"])
            try:
                document = await self._store.async_upsert(document)
            except asyncio.CancelledError, WorkflowStoreError:
                self._deactivate(document["workflow_id"])
                raise
            self._apply(document)
            return document

    async def async_delete(self, workflow_id: str) -> bool:
        """Deactivate and remove one workflow; return whether it existed."""
        async with self._lock:
            self._require_ready()
            self._deactivate(workflow_id)
            self._retry_stale()
            if self._action_service is not None:
                await self._action_service.async_invalidate(workflow_id)
            return await self._store.async_delete(workflow_id)

    async def async_set_enabled(
        self, workflow_id: str, enabled: bool
    ) -> dict[str, Any]:
        """Persist the enabled flag and apply it to the live observer."""
        async with self._lock:
            self._require_ready()
            existing = self._store.get(workflow_id)
            if existing is None:
                raise WorkflowNotFoundError("workflow not found")
            document = parse_workflow({**existing, "enabled": enabled}).as_dict()
            self._require_publication_receipt(document)
            try:
                document = await self._store.async_set_enabled(workflow_id, enabled)
            except asyncio.CancelledError, WorkflowStoreError:
                self._deactivate(workflow_id)
                raise
            self._apply(document)
            return document

    def _require_publication_receipt(self, document: dict[str, Any]) -> None:
        if (
            document["enabled"]
            and document["run_mode"] == RUN_MODE_EXECUTE
            and not self._store.has_dry_run(
                document, self.publication_bindings(document)
            )
        ):
            raise WorkflowDryRunRequired("workflow requires a successful dry run")

    async def async_record_dry_run(
        self, document: dict[str, Any], connection_id: str | None, bindings: str
    ) -> bool:
        """Record successful backend validation against the current stored draft."""
        async with self._lock:
            self._require_ready()
            if is_light(document):
                if (
                    self._action_service is None
                    or bindings != self.publication_bindings(document)
                ):
                    return False
                return await self._store.async_record_dry_run(document, bindings)
            if (
                document.get("provider_connection_id") != connection_id
                or self.publication_bindings(document) != bindings
                or self._lookup_provider(connection_id) is None
            ):
                return False
            return await self._store.async_record_dry_run(document, bindings)

    def publication_bindings(self, document: dict[str, Any]) -> str:
        """Bind a receipt to actual provider configuration and target identities.

        Legacy services lack persistent registry identity. Their receipts bind
        to this process and registration; restart/re-registration requires a
        new dry run. Only the digest is persisted, never configuration secrets.
        """
        connection_id = document.get("provider_connection_id")
        if is_light(document):
            return (
                self._action_service.binding(document)
                if self._action_service is not None
                else hashlib.sha256(b"unavailable").hexdigest()
            )
        provider_data = next(
            (
                dict(entry.data)
                for entry in self._hass.config_entries.async_entries(DOMAIN)
                if entry.data.get("connection_id") == connection_id
            ),
            None,
        )
        registry = er.async_get(self._hass)
        targets = []
        for step in document["steps"]:
            reference = step.get("notify_service")
            if step["kind"] != "notify" or reference is None:
                continue
            kind = async_resolve_notify_target(self._hass, reference)
            entry = registry.async_get(reference)
            if kind == "entity" and entry is not None:
                identity = [entry.id, entry.config_entry_id, entry.unique_id]
            elif kind == "service":
                service = self._hass.services.async_services_for_domain("notify").get(
                    reference.removeprefix("notify.")
                )
                identity = self._target_identity(reference, service)
            else:
                identity = self._target_identity(
                    reference, self._hass.states.get(reference)
                )
            targets.append([reference, kind, identity])
        return hashlib.sha256(
            json.dumps(
                {"provider": provider_data, "targets": targets},
                sort_keys=True,
                separators=(",", ":"),
            ).encode()
        ).hexdigest()

    def _target_identity(self, reference: str, target: object) -> list[str]:
        previous = self._target_bindings.get(reference)
        if previous is None or previous[0] is not target:
            if previous is None and len(self._target_bindings) >= MAX_TARGET_BINDINGS:
                self._target_bindings.pop(next(iter(self._target_bindings)))
            previous = (target, uuid.uuid4().hex)
            self._target_bindings[reference] = previous
        return [_PROCESS_ID, previous[1]]

    @callback
    def get(self, workflow_id: str) -> dict[str, Any] | None:
        """Return one stored document, or None; raise when storage is unavailable."""
        self._require_ready()
        return self._store.get(workflow_id)

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
            stats = self._executions.get(workflow_id) or _empty_execution_stats()
            workflows.append(
                {
                    "workflow": deepcopy(document),
                    "status": {
                        **report,
                        "error": self._errors.get(workflow_id),
                        **deepcopy(stats),
                    },
                }
            )
        return {"store": self._store_state, "workflows": workflows}
