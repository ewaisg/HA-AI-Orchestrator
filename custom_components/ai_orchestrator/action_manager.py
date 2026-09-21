"""Curated target-bound actions with explicit grants and human confirmation."""

import asyncio
import hashlib
import json
import math
import secrets
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from homeassistant.auth.permissions.const import POLICY_CONTROL, POLICY_READ
from homeassistant.components.media_player.const import MediaPlayerEntityFeature
from homeassistant.core import Context, HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .action_confirmation import ActionConfirmations
from .action_policy import ActionBinding, ActionRisk, ActionRule
from .action_store import ActionStore, action_scopes
from .agent_store import AgentPolicyError, connection_uuid
from .audit_schema import AuditValidationError, timestamp
from .audit_store import AuditStore, AuditStoreError
from .chat import _canonical_uuid, _local_connections
from .provider_entry import loaded_provider_matches_entry
from .runtime import async_get_runtime, is_foundation_loaded
from .switch_review import attestations
from .switch_review import identity as switch_identity

ACTION_TIMEOUT_SECONDS = 10


@dataclass(frozen=True)
class _Tool:
    domain: str
    service: str
    label: str
    risk: ActionRisk
    feature: int = 0
    arguments: str = "none"


TOOLS = {
    "light_turn_on_v1": _Tool("light", "turn_on", "Turn light on", ActionRisk.MEDIUM),
    "light_turn_off_v1": _Tool(
        "light", "turn_off", "Turn light off", ActionRisk.MEDIUM
    ),
    "switch_turn_on_v1": _Tool("switch", "turn_on", "Turn switch on", ActionRisk.HIGH),
    "switch_turn_off_v1": _Tool(
        "switch", "turn_off", "Turn switch off", ActionRisk.HIGH
    ),
    "media_play_v1": _Tool(
        "media_player",
        "media_play",
        "Resume media",
        ActionRisk.MEDIUM,
        MediaPlayerEntityFeature.PLAY,
    ),
    "media_pause_v1": _Tool(
        "media_player",
        "media_pause",
        "Pause media",
        ActionRisk.MEDIUM,
        MediaPlayerEntityFeature.PAUSE,
    ),
    "media_volume_v1": _Tool(
        "media_player",
        "volume_set",
        "Set media volume",
        ActionRisk.MEDIUM,
        MediaPlayerEntityFeature.VOLUME_SET,
        "volume",
    ),
}


def _digest(value: object) -> str:
    return hashlib.sha256(
        json.dumps(
            value, sort_keys=True, separators=(",", ":"), allow_nan=False
        ).encode()
    ).hexdigest()


def _arguments(tool: _Tool, value: object) -> dict[str, float]:
    if type(value) is not dict:
        raise AgentPolicyError("Invalid action arguments")
    if tool.arguments == "none" and not value:
        return {}
    if tool.arguments == "volume" and set(value) == {"volume_level"}:
        volume = value["volume_level"]
        if type(volume) in (int, float) and math.isfinite(volume) and 0 <= volume <= 1:
            return {"volume_level": float(volume)}
    raise AgentPolicyError("Invalid action arguments")


@dataclass(frozen=True)
class _Proposal:
    connection_id: str
    request_id: str
    user_id: str = field(repr=False)
    binding: ActionBinding = field(repr=False)
    arguments: dict[str, float] = field(repr=False)
    expires: float
    service_registration: object = field(repr=False)
    audit_id: str


class ActionManager:
    """Never accepts arbitrary domains/services or executes provider text."""

    def __init__(
        self, hass: HomeAssistant, store: ActionStore, audit: AuditStore
    ) -> None:
        """Create process-owned proposals; reload discards approvals."""
        self.hass = hass
        self.store = store
        self.audit = audit
        self._confirmations = ActionConfirmations()
        self._pending: dict[str, _Proposal] = {}
        self._recent: dict[tuple[str, str], float] = {}
        self._tasks: dict[asyncio.Task, str] = {}
        self._stopped = False
        self._reviews: dict[str, tuple[str, str, str, int, str, float]] = {}

    async def async_start(self) -> None:
        """Reopen after cancelled dispatches finish, never restore old tokens."""
        self._pending.clear()
        self._confirmations.clear()
        self._reviews.clear()
        await self.async_wait_stopped()
        self._stopped = False

    async def async_wait_stopped(self) -> None:
        """Drain stopped work before audit recovery; never reopen action access.

        The lifecycle owner must call stop first, then this method, then recover
        the shared AuditStore, and only finally call async_start.
        """
        tasks = tuple(task for task in self._tasks if not task.done())
        if tasks:
            _, pending = await asyncio.wait(tasks, timeout=10)
            if pending:
                raise AgentPolicyError("Prior action shutdown is incomplete")

    def _active(self, connection_id: str) -> Any:
        runtime = async_get_runtime(self.hass)
        if (
            self._stopped
            or not is_foundation_loaded(self.hass)
            or runtime.action_manager is not self
            or runtime.action_store is not self.store
            or runtime.audit_store is not self.audit
            or not self.store.loaded
            or not self.audit.loaded
        ):
            raise AgentPolicyError("Actions are unavailable")
        for entry, loaded in _local_connections(self.hass):
            if loaded.connection_id == connection_id and loaded_provider_matches_entry(
                loaded, entry.data
            ):
                return loaded
        raise AgentPolicyError("Local provider is unavailable")

    async def _user(self, user_id: str) -> Any:
        user = await self.hass.auth.async_get_user(user_id)
        if user is None or not user.is_active or not user.is_admin:
            raise AgentPolicyError("Action is not authorized")
        return user

    def _resolve(
        self,
        tool_id: str,
        registry_id: str,
        user: Any,
        connection_id: str | None = None,
        *,
        reviewing: bool = False,
    ) -> tuple[Any, Any]:
        tool = TOOLS.get(tool_id)
        entry = er.async_get(self.hass).async_get(registry_id)
        if (
            tool is None
            or entry is None
            or entry.id != registry_id
            or entry.domain != tool.domain
            or entry.disabled
            or entry.platform == "group"
            or not self.hass.services.has_service(tool.domain, tool.service)
        ):
            raise AgentPolicyError("Action target is unavailable")
        device = (
            dr.async_get(self.hass).async_get(entry.device_id)
            if entry.device_id
            else None
        )
        state = self.hass.states.get(entry.entity_id)
        if (device is not None and device.disabled) or state is None:
            raise AgentPolicyError("Action target is unavailable")
        if (
            state.state in {"unknown", "unavailable"}
            or "entity_id" in state.attributes
            or not user.permissions.check_entity(entry.entity_id, POLICY_READ)
            or not user.permissions.check_entity(entry.entity_id, POLICY_CONTROL)
        ):
            raise AgentPolicyError("Action target is unavailable")
        if tool.domain in {"light", "switch"} and state.state not in {"on", "off"}:
            raise AgentPolicyError("Action target is unavailable")
        features = state.attributes.get("supported_features", 0)
        members = state.attributes.get("group_members")
        if members is not None and members != [] and members != [entry.entity_id]:
            raise AgentPolicyError("Grouped action targets are unavailable")
        if tool.feature and (type(features) is not int or not features & tool.feature):
            raise AgentPolicyError("Action is unsupported")
        if tool.domain == "switch":
            digest = switch_identity(self.hass, entry, state)
            if not reviewing:
                if connection_id is None:
                    raise AgentPolicyError("Switch review is required")
                review = next(
                    (
                        item
                        for item in self.store.get(connection_id)["switch_reviews"]
                        if item["registry_id"] == registry_id
                    ),
                    None,
                )
                if review is None or review["identity_digest"] != digest:
                    raise AgentPolicyError("Switch review is stale or missing")
        return entry, state

    def _public_profile(self, connection_id: str) -> dict[str, Any]:
        profile = self.store.get(connection_id)
        for review in profile["switch_reviews"]:
            review.pop("identity_digest")
        return profile

    def _review_target(
        self, connection_id: str, revision: int, registry_id: str, user: Any
    ) -> tuple[Any, Any, str]:
        self._active(connection_id)
        if (
            type(revision) is not int
            or self.store.get(connection_id)["revision"] != revision
        ):
            raise AgentPolicyError("Action policy changed")
        entry, state = self._resolve(
            "switch_turn_on_v1", registry_id, user, reviewing=True
        )
        return entry, state, switch_identity(self.hass, entry, state)

    def _target_summary(self, entry: Any, state: Any) -> dict[str, str]:
        name = state.attributes.get("friendly_name")
        device = dr.async_get(self.hass).async_get(entry.device_id)
        device_name = device.name_by_user or device.name or "Unnamed device"
        return {
            "registry_id": entry.id,
            "entity_id": entry.entity_id,
            "name": name[:255] if type(name) is str else entry.entity_id,
            "device_name": device_name[:255],
        }

    async def async_review_preview(
        self, connection_id: str, expected_revision: int, registry_id: str, user_id: str
    ) -> dict[str, Any]:
        """Present real identity for physical review, never grant action authority."""
        user = await self._user(user_id)
        entry, state, digest = self._review_target(
            connection_id, expected_revision, registry_id, user
        )
        now = time.monotonic()
        self._reviews = {
            key: value for key, value in self._reviews.items() if value[-1] > now
        }
        if len(self._reviews) >= 64:
            raise AgentPolicyError("Switch review capacity reached")
        token = secrets.token_urlsafe(32)
        self._reviews[_digest(token)] = (
            connection_id,
            user_id,
            registry_id,
            expected_revision,
            digest,
            now + 300,
        )
        return {
            "schema_version": 2,
            "revision": expected_revision,
            **self._target_summary(entry, state),
            "review_token": token,
            "expires_in": 300,
        }

    async def async_review_save(
        self,
        connection_id: str,
        expected_revision: int,
        registry_id: str,
        review_token: str,
        classification: str,
        assertions: object,
        user_id: str,
    ) -> dict[str, Any]:
        """Burn one review token and atomically revoke existing switch grants."""
        if type(review_token) is not str or not 1 <= len(review_token) <= 128:
            raise AgentPolicyError("Invalid switch review")
        saved = self._reviews.pop(_digest(review_token), None)
        attestations(assertions)
        if (
            classification != "ordinary_noncritical"
            or saved is None
            or saved[-1] <= time.monotonic()
        ):
            raise AgentPolicyError("Invalid switch review")
        task = self._enter_task(connection_id)
        try:
            user = await self._user(user_id)
            _, _, digest = self._review_target(
                connection_id, expected_revision, registry_id, user
            )
            if saved[-1] <= time.monotonic() or saved[:-1] != (
                connection_id,
                user_id,
                registry_id,
                expected_revision,
                digest,
            ):
                raise AgentPolicyError("Switch review changed")
            if task.cancelling():
                raise asyncio.CancelledError
            review = {
                "registry_id": registry_id,
                "classification": classification,
                "review_id": str(uuid4()),
                "reviewed_at": datetime.now(UTC).isoformat(),
                "identity_digest": digest,
            }
            await self.store.async_save(
                connection_id,
                [],
                expected_revision,
                review_update=(registry_id, review),
            )
            self.cancel_provider(connection_id)
            self._active(connection_id)
            return {"schema_version": 2, "profile": self._public_profile(connection_id)}
        finally:
            self._tasks.pop(task, None)

    async def async_review_revoke(
        self, connection_id: str, expected_revision: int, registry_id: str, user_id: str
    ) -> dict[str, Any]:
        """Permit revocation even when the reviewed physical target is gone."""
        task = self._enter_task(connection_id)
        try:
            await self._user(user_id)
            self._active(connection_id)
            await self.store.async_save(
                connection_id, [], expected_revision, review_update=(registry_id, None)
            )
            self.cancel_provider(connection_id)
            self._active(connection_id)
            return {"schema_version": 2, "profile": self._public_profile(connection_id)}
        finally:
            self._tasks.pop(task, None)

    async def async_catalog(self, connection_id: str, user_id: str) -> dict[str, Any]:
        """Discover only registered, available targets and installed operations."""
        connection_uuid(connection_id)
        user = await self._user(user_id)
        self._active(connection_id)
        tools = []
        entries = tuple(er.async_get(self.hass).entities.values())
        for tool_id, tool in TOOLS.items():
            targets = []
            for candidate in entries:
                if candidate.domain != tool.domain:
                    continue
                try:
                    entry, state = self._resolve(
                        tool_id, candidate.id, user, connection_id
                    )
                except AgentPolicyError:
                    continue
                name = state.attributes.get("friendly_name")
                targets.append(
                    {
                        "registry_id": entry.id,
                        "entity_id": entry.entity_id,
                        "name": name[:255] if type(name) is str else entry.entity_id,
                    }
                )
                if len(targets) == 500:
                    break
            tools.append(
                {
                    "tool_id": tool_id,
                    "label": tool.label,
                    "risk": tool.risk.value,
                    "arguments": tool.arguments,
                    "targets": targets,
                }
            )
        candidates = []
        profile = self.store.get(connection_id)
        for candidate in entries:
            if candidate.domain != "switch":
                continue
            try:
                entry, state = self._resolve(
                    "switch_turn_on_v1", candidate.id, user, reviewing=True
                )
                digest = switch_identity(self.hass, entry, state)
            except AgentPolicyError:
                continue
            review = next(
                (
                    item
                    for item in profile["switch_reviews"]
                    if item["registry_id"] == entry.id
                ),
                None,
            )
            candidates.append(
                {
                    **self._target_summary(entry, state),
                    "status": "unreviewed"
                    if review is None
                    else "reviewed"
                    if review["identity_digest"] == digest
                    else "stale",
                }
            )
            if len(candidates) == 500:
                break
        return {
            "schema_version": 2,
            "profile": self._public_profile(connection_id),
            "tools": tools,
            "switch_candidates": candidates,
        }

    async def async_save(
        self, connection_id: str, scopes: object, expected_revision: int, user_id: str
    ) -> dict[str, Any]:
        """Validate exact live grants before durable storage and revoke proposals."""
        validated = action_scopes(scopes)
        user = await self._user(user_id)
        self._active(connection_id)
        for scope in validated:
            for registry_id in scope["registry_ids"]:
                self._resolve(scope["tool_id"], registry_id, user, connection_id)
        await self.store.async_save(connection_id, validated, expected_revision)
        self.cancel_provider(connection_id)
        self._active(connection_id)
        return {"schema_version": 2, "profile": self._public_profile(connection_id)}

    def _binding(
        self,
        connection_id: str,
        request_id: str,
        user: Any,
        tool_id: str,
        registry_id: str,
        arguments: dict[str, float],
        expected_revision: int,
    ) -> tuple[ActionBinding, ActionRule, Any]:
        loaded = self._active(connection_id)
        profile = self.store.get(connection_id)
        if (
            type(expected_revision) is not int
            or expected_revision != profile["revision"]
        ):
            raise AgentPolicyError("Action policy changed")
        ids = next(
            (
                scope["registry_ids"]
                for scope in profile["action_scopes"]
                if scope["tool_id"] == tool_id
            ),
            [],
        )
        if registry_id not in ids:
            raise AgentPolicyError("Action is not authorized")
        entry, state = self._resolve(tool_id, registry_id, user, connection_id)
        rule = ActionRule(tool_id, TOOLS[tool_id].risk, frozenset(ids))
        try:
            state_digest = _digest(
                {
                    "entity_id": entry.entity_id,
                    "unique_id": entry.unique_id,
                    "device_id": entry.device_id,
                    "config_entry_id": entry.config_entry_id,
                    "state": state.state,
                    "updated": state.last_updated.isoformat(),
                    "attributes": dict(state.attributes),
                }
            )
        except TypeError, ValueError:
            raise AgentPolicyError("Action state is unsupported") from None
        return (
            ActionBinding(
                user_id=user.id,
                agent_id=connection_id,
                request_id=request_id,
                tool_id=tool_id,
                target_registry_ids=(registry_id,),
                arguments_digest=_digest(arguments),
                state_digest=state_digest,
                policy_revision="curated-actions-v2:"
                + _digest(profile["switch_reviews"]),
                scope_revision=str(profile["revision"]),
                provider_revision=f"{id(loaded)}:{loaded.configuration_fingerprint}",
                workflow_revision="manual-proposal-v1",
            ),
            rule,
            state,
        )

    def _enter_task(self, connection_id: str) -> asyncio.Task:
        self._active(connection_id)
        task = asyncio.current_task()
        if task is None or task in self._tasks or len(self._tasks) >= 4:
            raise AgentPolicyError("Action request is busy")
        self._tasks[task] = connection_id
        return task

    async def _record_outcome(
        self,
        audit_id: str,
        phase: str,
        *,
        completed: bool = False,
        error: str = "dispatch_unknown",
    ) -> bool:
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
                error_code=None if completed else error,
            )
        except AuditStoreError, ValueError:
            return False
        return True

    def _fresh_proposal(
        self, proposal: _Proposal, user: Any
    ) -> tuple[ActionBinding, ActionRule, Any]:
        tool = TOOLS[proposal.binding.tool_id]
        if (
            self.hass.services.async_services_for_domain(tool.domain).get(tool.service)
            is not proposal.service_registration
        ):
            raise AgentPolicyError("Action registration changed")
        binding, rule, state = self._binding(
            proposal.connection_id,
            proposal.request_id,
            user,
            proposal.binding.tool_id,
            proposal.binding.target_registry_ids[0],
            proposal.arguments,
            int(proposal.binding.scope_revision),
        )
        if binding != proposal.binding:
            raise AgentPolicyError("Action preconditions changed")
        return binding, rule, state

    async def async_propose(
        self,
        connection_id: str,
        expected_revision: int,
        request_id: str,
        tool_id: str,
        registry_id: str,
        arguments: object,
        user_id: str,
    ) -> dict[str, Any]:
        """Persist requested metadata, then issue a freshly authorized proposal."""
        connection_uuid(connection_id)
        _canonical_uuid(request_id)
        if tool_id not in TOOLS:
            raise AgentPolicyError("Action is unavailable")
        parsed = _arguments(TOOLS[tool_id], arguments)
        task = self._enter_task(connection_id)
        audit_id = None
        try:
            user = await self._user(user_id)
            self._binding(
                connection_id,
                request_id,
                user,
                tool_id,
                registry_id,
                parsed,
                expected_revision,
            )
            now = time.monotonic()
            self._recent = {
                key: expiry for key, expiry in self._recent.items() if expiry > now
            }
            self._pending = {
                key: value
                for key, value in self._pending.items()
                if value.expires > now
            }
            key = (user_id, request_id)
            if (
                key in self._recent
                or len(self._recent) >= 256
                or len(self._pending) >= 128
            ):
                raise AgentPolicyError("Action request is busy or repeated")
            # Reserve before persistence yields, so concurrent duplicate requests lose.
            self._recent[key] = now + 600
            row = await self.audit.async_begin(tool_id)
            audit_id = row["audit_id"]
            user = await self._user(user_id)
            binding, rule, state = self._binding(
                connection_id,
                request_id,
                user,
                tool_id,
                registry_id,
                parsed,
                expected_revision,
            )
            if task.cancelling():
                raise asyncio.CancelledError
            token = self._confirmations.issue(binding, (rule,), authorized=True)
            self._pending[_digest(token)] = _Proposal(
                connection_id,
                request_id,
                user_id,
                binding,
                parsed,
                time.monotonic() + 300,
                self.hass.services.async_services_for_domain(TOOLS[tool_id].domain)[
                    TOOLS[tool_id].service
                ],
                audit_id,
            )
            return {
                "schema_version": 1,
                "connection_id": connection_id,
                "request_id": request_id,
                "token": token,
                "expires_in": 300,
                "tool_id": tool_id,
                "entity_id": state.entity_id,
                "risk": rule.risk.value,
                "arguments": parsed.copy(),
                "state": state.state,
            }
        except AuditStoreError, ValueError:
            if audit_id is not None:
                await self._record_outcome(
                    audit_id, "requested", error="not_authorized"
                )
            raise AgentPolicyError(
                "Action proposal could not be authorized and recorded"
            ) from None
        finally:
            self._tasks.pop(task, None)

    async def async_confirm(
        self, connection_id: str, request_id: str, token: str, user_id: str
    ) -> dict[str, Any]:
        """Journal intent, recheck after persistence, burn once and dispatch once."""
        if type(token) is not str or not 1 <= len(token) <= 128:
            raise AgentPolicyError("Confirmation is invalid")
        proposal = self._pending.pop(_digest(token), None)
        if (
            proposal is None
            or proposal.connection_id != connection_id
            or proposal.request_id != request_id
            or proposal.user_id != user_id
        ):
            raise AgentPolicyError("Confirmation is invalid")
        task = self._enter_task(connection_id)
        phase = "requested"
        status = "unknown"
        try:
            user = await self._user(user_id)
            self._fresh_proposal(proposal, user)
            await self.audit.async_transition(
                proposal.audit_id, expected_phase=phase, phase="authorized"
            )
            phase = "authorized"
            await self.audit.async_transition(
                proposal.audit_id,
                expected_phase=phase,
                phase="started",
                actions_attempted=1,
            )
            phase = "started"
            # Every awaited journal operation precedes this final live auth/state read.
            user = await self._user(user_id)
            binding, rule, state = self._fresh_proposal(proposal, user)
            if task.cancelling():
                raise asyncio.CancelledError
            self._confirmations.consume(token, binding, (rule,), authorized=True)
            tool = TOOLS[binding.tool_id]
            try:
                async with asyncio.timeout(ACTION_TIMEOUT_SECONDS) as deadline:
                    await self.hass.services.async_call(
                        tool.domain,
                        tool.service,
                        {"entity_id": state.entity_id, **proposal.arguments},
                        blocking=True,
                        context=Context(user_id=user_id),
                    )
                if (
                    not deadline.expired()
                    and not task.cancelling()
                    and not self._stopped
                ):
                    status = "completed"
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001 -- private service failures stay backend-only.
                status = "unknown"
            if not await self._record_outcome(
                proposal.audit_id, phase, completed=status == "completed"
            ):
                status = "unknown"
        except asyncio.CancelledError:
            # Best effort metadata only. A failed/cancelled final write leaves the
            # durable unfinished intent for restart recovery; never replay dispatch.
            await self._record_outcome(proposal.audit_id, phase, error="cancelled")
            raise
        except AuditStoreError, ValueError:
            await self._record_outcome(proposal.audit_id, phase, error="not_authorized")
            raise AgentPolicyError(
                "Action confirmation could not be authorized and recorded"
            ) from None
        finally:
            self._tasks.pop(task, None)
        return {
            "schema_version": 1,
            "connection_id": connection_id,
            "request_id": request_id,
            "status": status,
            "actions_executed": 1 if status == "completed" else 0,
        }

    def cancel_provider(self, connection_id: str) -> None:
        """Revoke proposals and cancel in-flight tasks for an unloaded provider."""
        self._pending = {
            key: value
            for key, value in self._pending.items()
            if value.connection_id != connection_id
        }
        # Clearing all token hashes is conservative; other proposals fail closed.
        self._confirmations.clear()
        self._reviews.clear()
        current = asyncio.current_task()
        for task, identity in tuple(self._tasks.items()):
            if identity == connection_id and task is not current:
                task.cancel()

    async def async_expire_proposals(self) -> None:
        """Close abandoned requested metadata without touching running actions."""
        runtime = async_get_runtime(self.hass)
        if (
            self._stopped
            or runtime.action_manager is not self
            or runtime.audit_store is not self.audit
            or not is_foundation_loaded(self.hass)
            or not self.audit.loaded
        ):
            raise AgentPolicyError("Action maintenance is unavailable")
        task = asyncio.current_task()
        if task is None or task in self._tasks or len(self._tasks) >= 4:
            return
        self._tasks[task] = "audit-maintenance"
        try:
            now = datetime.now(UTC)
            monotonic = time.monotonic()
            scanned = 0
            cursor = 0
            while scanned < 4096:
                rows = self.audit.list(
                    after_sequence=cursor, limit=min(100, 4096 - scanned)
                )
                if not rows:
                    break
                for row in rows:
                    scanned += 1
                    cursor = row["sequence"]
                    live = [
                        (key, proposal)
                        for key, proposal in self._pending.items()
                        if proposal.audit_id == row["audit_id"]
                    ]
                    expired = (
                        now - timestamp(row["created_at"])
                    ).total_seconds() >= 300 or any(
                        proposal.expires <= monotonic for _, proposal in live
                    )
                    if row["phase"] != "requested" or not expired:
                        continue
                    try:
                        await self.audit.async_transition(
                            row["audit_id"],
                            expected_phase="requested",
                            phase="failed",
                            error_code="cancelled",
                        )
                    except AuditValidationError:
                        # A concurrent confirmation may already be authorized.
                        continue
                    for key, proposal in live:
                        self._pending.pop(key, None)
                        self._confirmations.revoke_binding(proposal.binding)
        finally:
            self._tasks.pop(task, None)

    def stop(self) -> None:
        """Invalidate every token and cancel dispatch tasks on foundation unload."""
        self._stopped = True
        self._pending.clear()
        self._confirmations.clear()
        self._reviews.clear()
        current = asyncio.current_task()
        for task in tuple(self._tasks):
            if task is not current:
                task.cancel()
