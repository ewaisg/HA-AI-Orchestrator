"""Explicit unattended light authorization; never a generic action executor."""

import asyncio
import hashlib
import json
import secrets
import time
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from homeassistant.auth.permissions.const import POLICY_CONTROL, POLICY_READ
from homeassistant.core import Context, HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .agent_store import AgentPolicyError
from .audit_store import AuditStore, AuditStoreError
from .workflow_action_store import WorkflowActionStore


def _digest(value: object) -> str:
    try:
        return hashlib.sha256(
            json.dumps(
                value, sort_keys=True, separators=(",", ":"), allow_nan=False
            ).encode()
        ).hexdigest()
    except TypeError, ValueError:
        raise AgentPolicyError("Unsupported light identity") from None


def resolve_light(
    hass: HomeAssistant, registry_id: str, user: Any
) -> tuple[Any, Any, str]:
    """Resolve one ordinary physical light with live administrator permissions.

    Exclusion checks identify known aggregate/protected shapes, not a universal
    physical safety guarantee. Explicit workflow authorization remains separate.
    """
    entry = er.async_get(hass).async_get(registry_id)
    device = (
        dr.async_get(hass).async_get(entry.device_id)
        if entry is not None and entry.device_id
        else None
    )
    config = (
        hass.config_entries.async_get_entry(entry.config_entry_id)
        if entry is not None and entry.config_entry_id
        else None
    )
    state = hass.states.get(entry.entity_id) if entry is not None else None
    if (
        user is None
        or not user.is_active
        or not user.is_admin
        or entry is None
        or entry.id != registry_id
        or entry.domain != "light"
        or entry.disabled
        or entry.platform in {"group", "template"}
        or entry.entity_category is not None
        or device is None
        or device.disabled
        or config is None
        or device.config_entry_id != entry.config_entry_id
        or not (device.identifiers or device.connections)
        or state is None
        or state.state not in {"on", "off"}
        or "entity_id" in state.attributes
        or state.attributes.get("group_members") not in (None, [], [entry.entity_id])
        or not hass.services.has_service("light", "turn_on")
        or not hass.services.has_service("light", "turn_off")
        or not user.permissions.check_entity(entry.entity_id, POLICY_READ)
        or not user.permissions.check_entity(entry.entity_id, POLICY_CONTROL)
    ):
        raise AgentPolicyError("Light target is unavailable")
    siblings = []
    for candidate in er.async_get(hass).entities.values():
        if candidate.device_id != entry.device_id:
            continue
        candidate_state = hass.states.get(candidate.entity_id)
        classes = {candidate.device_class, candidate.original_device_class}
        if (
            candidate_state is not None
            and type(value := candidate_state.attributes.get("device_class")) is str
        ):
            classes.add(value)
        if candidate.domain in {
            "lock",
            "alarm_control_panel",
            "siren",
            "cover",
            "climate",
            "water_heater",
            "valve",
        } or classes & {
            "smoke",
            "gas",
            "carbon_monoxide",
            "safety",
            "tamper",
            "door",
            "window",
            "garage_door",
            "opening",
        }:
            raise AgentPolicyError("Light target has a protected association")
        siblings.append(
            [
                candidate.id,
                candidate.entity_id,
                sorted(value for value in classes if value),
            ]
        )
    digest = _digest(
        {
            "entity": [
                entry.id,
                entry.entity_id,
                entry.unique_id,
                entry.platform,
                entry.device_id,
                entry.config_entry_id,
                entry.config_subentry_id,
                entry.created_at.isoformat(),
                entry.area_id,
                sorted(entry.labels),
                entry.name,
                entry.original_name,
                state.attributes.get("friendly_name"),
            ],
            "device": [
                device.id,
                sorted(device.identifiers),
                sorted(device.connections),
                device.area_id,
                sorted(device.labels),
                device.name,
                device.name_by_user,
                device.manufacturer,
                device.model,
                device.via_device_id,
            ],
            "config": [
                config.entry_id,
                config.domain,
                config.unique_id,
                config.version,
                config.minor_version,
                dict(config.data),
                dict(config.options),
            ],
            "associations": sorted(siblings),
        }
    )
    return entry, state, digest


def is_light(document: dict) -> bool:
    """Identify the schema-validated single-light deterministic shape."""
    return (
        len(document.get("steps", [])) == 1
        and document["steps"][0].get("kind") == "light_control"
    )


def document_version(document: dict) -> str:
    """Bind all configured fields except the separately published enabled flag."""
    return _digest({**document, "enabled": False})


class WorkflowActions:
    """Separate explicit unattended policy and audited single-light dispatch."""

    def __init__(self, hass: HomeAssistant, manager: Any, audit: AuditStore) -> None:
        """Create a stopped service without listeners or grants."""
        self.hass, self.manager, self.audit = hass, manager, audit
        self.store = WorkflowActionStore(hass)
        self._users: dict[str, Any] = {}
        self._pending: dict[str, tuple] = {}
        self._tasks: set[asyncio.Task] = set()
        self._stopped = True

    async def async_start(self) -> None:
        """Load explicit grants only after old work and audit recovery settle."""
        await self.async_wait_stopped()
        await self.store.async_load()
        self._users.clear()
        for grant in self.store.snapshot()["grants"]:
            self._users[grant["user_id"]] = await self.hass.auth.async_get_user(
                grant["user_id"]
            )
        self._pending.clear()
        self._stopped = False

    def stop(self) -> None:
        """Burn preview tokens and cancel all owned writes/dispatches."""
        self._stopped = True
        self._pending.clear()
        current = asyncio.current_task()
        for task in tuple(self._tasks):
            if task is not current:
                task.cancel()

    async def async_wait_stopped(self) -> None:
        """Drain final action journal writes before shared audit recovery."""
        pending = {task for task in self._tasks if not task.done()}
        if pending:
            _, pending = await asyncio.wait(pending, timeout=10)
            if pending:
                raise AgentPolicyError("Unattended actions are still stopping")

    def _active(self) -> None:
        from .runtime import async_get_runtime, is_foundation_loaded  # noqa: PLC0415

        runtime = async_get_runtime(self.hass)
        if (
            self._stopped
            or not self.store.loaded
            or not self.audit.loaded
            or not self.manager.ready
            or not is_foundation_loaded(self.hass)
            or getattr(runtime, "workflow_actions", None) is not self
            or runtime.workflow_manager is not self.manager
            or runtime.audit_store is not self.audit
        ):
            raise AgentPolicyError("Unattended actions are unavailable")

    def _enter(self) -> asyncio.Task:
        self._active()
        task = asyncio.current_task()
        if task is None or task in self._tasks or len(self._tasks) >= 4:
            raise AgentPolicyError("Unattended action request is busy")
        self._tasks.add(task)
        return task

    async def _user(self, user_id: str) -> Any:
        user = await self.hass.auth.async_get_user(user_id)
        if user is None or not user.is_active or not user.is_admin:
            raise AgentPolicyError("Unattended action is not authorized")
        self._users[user_id] = user
        return user

    def _document(self, workflow_id: str) -> dict:
        self._active()
        document = self.manager.get(workflow_id)
        if (
            document is None
            or not is_light(document)
            or document["run_mode"] != "execute"
        ):
            raise AgentPolicyError("A saved light workflow is required")
        return document

    def _summary(self, entry: Any, state: Any) -> dict:
        device = dr.async_get(self.hass).async_get(entry.device_id)
        name = state.attributes.get("friendly_name")
        return {
            "registry_id": entry.id,
            "entity_id": entry.entity_id,
            "name": name[:255] if type(name) is str else entry.entity_id,
            "device_name": (device.name_by_user or device.name or "Unnamed device")[
                :255
            ],
        }

    async def async_catalog(self, user_id: str) -> dict:
        """List current eligible lights without authorizing any target."""
        self._active()
        user = await self._user(user_id)
        self._active()
        targets = []
        for candidate in er.async_get(self.hass).entities.values():
            if candidate.domain != "light":
                continue
            try:
                entry, state, _ = resolve_light(self.hass, candidate.id, user)
            except AgentPolicyError:
                continue
            targets.append(self._summary(entry, state))
            if len(targets) == 500:
                break
        return {"schema_version": 1, "targets": targets}

    def binding(self, document: dict) -> str:
        """Return a persistent receipt binding; unavailable authority cannot match."""
        try:
            self._active()
            grant = self.store.get(document["workflow_id"])
            if grant is None or grant["document_version"] != document_version(document):
                raise AgentPolicyError("Unattended authorization is required")
            step = document["steps"][0]
            if (grant["registry_id"], grant["operation"]) != (
                step["target_registry_id"],
                step["operation"],
            ):
                raise AgentPolicyError("Unattended target changed")
            _, _, digest = resolve_light(
                self.hass, grant["registry_id"], self._users.get(grant["user_id"])
            )
            if digest != grant["identity_digest"]:
                raise AgentPolicyError("Unattended identity changed")
            return _digest(
                {
                    "authorization": grant["authorization_id"],
                    "document": grant["document_version"],
                    "identity": digest,
                }
            )
        except AgentPolicyError, ValueError:
            return _digest("unavailable")

    async def async_validate(self, document: dict, user_id: str | None = None) -> str:
        """Recheck both requesting and granting administrators for a dry run/run."""
        self._active()
        grant = self.store.get(document["workflow_id"])
        if grant is None:
            raise AgentPolicyError("Unattended authorization is required")
        owner = await self._user(grant["user_id"])
        if user_id is not None:
            actor = await self._user(user_id)
            resolve_light(self.hass, grant["registry_id"], actor)
        self._active()
        resolve_light(self.hass, grant["registry_id"], owner)
        current = self._document(document["workflow_id"])
        if document_version(current) != document_version(document):
            raise AgentPolicyError("Workflow changed")
        binding = self.binding(document)
        if binding == _digest("unavailable"):
            raise AgentPolicyError("Unattended authorization changed")
        return binding

    async def async_preview(self, workflow_id: str, user_id: str) -> dict:
        """Present the exact stored workflow and a one-use consent token."""
        user = await self._user(user_id)
        document = self._document(workflow_id)
        step = document["steps"][0]
        entry, state, digest = resolve_light(
            self.hass, step["target_registry_id"], user
        )
        revision = self.store.snapshot()["revision"]
        now = time.monotonic()
        self._pending = {
            key: value for key, value in self._pending.items() if value[-1] > now
        }
        if len(self._pending) >= 64:
            raise AgentPolicyError("Unattended preview capacity reached")
        token = secrets.token_urlsafe(32)
        version = document_version(document)
        self._pending[_digest(token)] = (
            workflow_id,
            version,
            revision,
            user_id,
            digest,
            now + 300,
        )
        return {
            "schema_version": 1,
            "workflow_id": workflow_id,
            "workflow": document,
            "document_version": version,
            "revision": revision,
            "target": self._summary(entry, state),
            "operation": step["operation"],
            "authorized": self.binding(document) != _digest("unavailable"),
            "authorization_token": token,
            "expires_in": 300,
        }

    async def async_authorize(
        self,
        workflow_id: str,
        version: str,
        revision: int,
        token: str,
        assertions: object,
        user_id: str,
    ) -> dict:
        """Require exact disabled workflow, fresh identity and explicit consent."""
        if type(token) is not str or not 1 <= len(token) <= 128:
            raise AgentPolicyError("Invalid unattended authorization")
        pending = self._pending.pop(_digest(token), None)
        if (
            type(assertions) is not dict
            or set(assertions) != {"ordinary_lighting", "allow_unattended"}
            or any(value is not True for value in assertions.values())
            or pending is None
        ):
            raise AgentPolicyError("Explicit unattended authorization is required")
        task = self._enter()
        try:
            user = await self._user(user_id)
            document = self._document(workflow_id)
            step = document["steps"][0]
            _, _, digest = resolve_light(self.hass, step["target_registry_id"], user)
            if (
                document["enabled"]
                or version != document_version(document)
                or pending[:-1] != (workflow_id, version, revision, user_id, digest)
                or pending[-1] <= time.monotonic()
            ):
                raise AgentPolicyError("Unattended authorization changed")
            if task.cancelling():
                raise asyncio.CancelledError
            grant = {
                "workflow_id": workflow_id,
                "document_version": version,
                "registry_id": step["target_registry_id"],
                "operation": step["operation"],
                "identity_digest": digest,
                "user_id": user_id,
                "authorization_id": str(uuid4()),
                "authorized_at": datetime.now(UTC).isoformat(),
            }
            revision = await self.store.async_update(workflow_id, grant, revision)
            self._active()
            return {
                "schema_version": 1,
                "workflow_id": workflow_id,
                "document_version": version,
                "revision": revision,
                "authorized": True,
            }
        finally:
            self._tasks.discard(task)

    async def async_revoke(self, workflow_id: str, revision: int, user_id: str) -> dict:
        """Revoke policy and disable the workflow without operating a device."""
        task = self._enter()
        try:
            await self._user(user_id)
            document = self._document(workflow_id)
            self.manager._deactivate(workflow_id)
            revision = await self.store.async_update(workflow_id, None, revision)
            await self.manager.async_set_enabled(workflow_id, False)
            self._active()
            return {
                "schema_version": 1,
                "workflow_id": workflow_id,
                "document_version": document_version(document),
                "revision": revision,
                "authorized": False,
            }
        finally:
            self._tasks.discard(task)

    async def async_invalidate(self, workflow_id: str) -> None:
        """Revoke authority under the manager lock before saving or deleting."""
        if self.store.loaded and self.store.get(workflow_id) is not None:
            await self.store.async_update(workflow_id, None)
        self._pending = {
            key: value
            for key, value in self._pending.items()
            if value[0] != workflow_id
        }

    async def _outcome(self, audit_id: str, phase: str, completed: bool) -> bool:
        try:
            await self.audit.async_transition(
                audit_id,
                expected_phase=phase,
                phase="committed"
                if completed
                else "unknown"
                if phase == "started"
                else "failed",
                service_returns=1 if completed else 0,
                error_code=None
                if completed
                else "dispatch_unknown"
                if phase == "started"
                else "not_authorized",
            )
        except AuditStoreError, ValueError:
            return False
        return True

    async def async_execute(self, document: dict, run_allowed: Any) -> dict:
        """Journal once, recheck all authority after persistence, dispatch once."""
        task = self._enter()
        started = datetime.now(UTC).isoformat()
        audit_id = None
        phase = "requested"
        completed = False
        error = "not_authorized"
        step = document["steps"][0]
        try:
            binding = await self.async_validate(document)
            grant = self.store.get(document["workflow_id"])
            owner = self._users[grant["user_id"]]
            entry, state, _ = resolve_light(
                self.hass, step["target_registry_id"], owner
            )
            state_digest = _digest(
                [state.state, state.last_updated.isoformat(), dict(state.attributes)]
            )
            service = self.hass.services.async_services_for_domain("light")[
                step["operation"]
            ]
            if not run_allowed():
                raise AgentPolicyError("Workflow run is no longer active")
            row = await self.audit.async_begin("light_" + step["operation"] + "_v1")
            audit_id = row["audit_id"]
            await self.audit.async_transition(
                audit_id, expected_phase=phase, phase="authorized"
            )
            phase = "authorized"
            await self.audit.async_transition(
                audit_id, expected_phase=phase, phase="started", actions_attempted=1
            )
            phase = "started"
            fresh = await self.async_validate(document)
            entry, state, _ = resolve_light(
                self.hass, step["target_registry_id"], self._users[grant["user_id"]]
            )
            if (
                fresh != binding
                or not run_allowed()
                or task.cancelling()
                or _digest(
                    [
                        state.state,
                        state.last_updated.isoformat(),
                        dict(state.attributes),
                    ]
                )
                != state_digest
                or self.hass.services.async_services_for_domain("light").get(
                    step["operation"]
                )
                is not service
            ):
                raise AgentPolicyError("Workflow action preconditions changed")
            error = "dispatch_unknown"
            async with asyncio.timeout(10) as deadline:
                await self.hass.services.async_call(
                    "light",
                    step["operation"],
                    {"entity_id": entry.entity_id},
                    blocking=True,
                    context=Context(user_id=grant["user_id"]),
                )
            completed = (
                not deadline.expired() and not task.cancelling() and not self._stopped
            )
            if not await self._outcome(audit_id, phase, completed):
                completed = False
            audit_id = None
            error = None if completed else "dispatch_unknown"
        except asyncio.CancelledError:
            if audit_id is not None:
                await self._outcome(audit_id, phase, False)
            raise
        except Exception:  # noqa: BLE001 -- no device or policy content in result.
            if audit_id is not None:
                await self._outcome(audit_id, phase, False)
            error = "dispatch_unknown" if phase == "started" else "not_authorized"
        finally:
            self._tasks.discard(task)
        return {
            "started_at": started,
            "finished_at": datetime.now(UTC).isoformat(),
            "steps": [
                {
                    "index": 0,
                    "step_id": step["step_id"],
                    "kind": "light_control",
                    "executed": completed,
                    "status": "delivered" if completed else "failed",
                    **({"error": error} if error else {}),
                }
            ],
            "provider_calls": 0,
            "actions_executed": int(completed),
            "completed": completed,
            "error": error,
        }
