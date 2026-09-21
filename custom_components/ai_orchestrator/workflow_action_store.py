"""Separate closed durable grants for explicitly unattended light workflows."""

import asyncio
import json
import os
import re
import stat
from copy import deepcopy
from pathlib import Path
from typing import Any
from uuid import UUID

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .agent_store import AgentPolicyError, AgentRevisionError, AgentStoreError
from .audit_schema import timestamp

STORAGE_KEY = "ai_orchestrator.workflow_actions"
MAX_BYTES = 256 * 1024


def _uuid(value: object) -> bool:
    try:
        return type(value) is str and str(UUID(value, version=4)) == value
    except ValueError:
        return False


def _parse(raw: object) -> dict[str, Any]:
    if (
        type(raw) is not dict
        or set(raw) != {"revision", "grants"}
        or type(raw["revision"]) is not int
        or not 0 <= raw["revision"] < 2**53
        or type(raw["grants"]) is not list
        or len(raw["grants"]) > 50
    ):
        raise AgentStoreError("Invalid unattended action policy")
    seen = set()
    for row in raw["grants"]:
        if type(row) is not dict or set(row) != {
            "workflow_id",
            "document_version",
            "registry_id",
            "operation",
            "identity_digest",
            "user_id",
            "authorization_id",
            "authorized_at",
        }:
            raise AgentStoreError("Invalid unattended action grant")
        if (
            not _uuid(row["workflow_id"])
            or not _uuid(row["authorization_id"])
            or row["operation"] not in {"turn_on", "turn_off"}
            or row["workflow_id"] in seen
        ):
            raise AgentStoreError("Invalid unattended action grant")
        if any(
            type(row[key]) is not str or re.fullmatch(r"[a-f0-9]{64}", row[key]) is None
            for key in ("document_version", "identity_digest")
        ):
            raise AgentStoreError("Invalid unattended action binding")
        if any(
            type(row[key]) is not str or not 1 <= len(row[key]) <= 64
            for key in ("user_id", "registry_id")
        ):
            raise AgentStoreError("Invalid unattended action identity")
        timestamp(row["authorized_at"])
        seen.add(row["workflow_id"])
    return deepcopy(raw)


def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise AgentStoreError("Duplicate unattended policy field")
        result[key] = value
    return result


def _read(path: str) -> dict[str, Any] | None:
    target = Path(path)
    try:
        parent = target.parent.lstat()
    except FileNotFoundError:
        return None
    if not stat.S_ISDIR(parent.st_mode) or target.parent.is_junction():
        raise AgentStoreError("Unsafe unattended policy path")
    try:
        before = target.lstat()
    except FileNotFoundError:
        return None
    if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_BYTES:
        raise AgentStoreError("Invalid unattended policy file")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        opened = os.fstat(descriptor)
        if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
            raise AgentStoreError("Unattended policy changed")
        with os.fdopen(descriptor, "rb", closefd=False) as stream:
            content = stream.read(MAX_BYTES + 1)
        after = os.fstat(descriptor)
        if len(content) > MAX_BYTES or (opened.st_size, opened.st_mtime_ns) != (
            after.st_size,
            after.st_mtime_ns,
        ):
            raise AgentStoreError("Unattended policy changed")
    finally:
        os.close(descriptor)
    envelope = json.loads(content, object_pairs_hook=_unique)
    if (
        type(envelope) is not dict
        or set(envelope) != {"version", "minor_version", "key", "data"}
        or type(envelope["version"]) is not int
        or envelope["version"] != 1
        or type(envelope["minor_version"]) is not int
        or envelope["minor_version"] != 1
        or envelope["key"] != STORAGE_KEY
    ):
        raise AgentStoreError("Unsupported unattended policy version")
    return _parse(envelope["data"])


class WorkflowActionStore:
    """Bounded fail-closed policy; no implicit grants or format downgrade."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Create a private unloaded policy store with retained write ownership."""
        self.hass = hass
        self._store = Store(hass, 1, STORAGE_KEY, private=True, atomic_writes=True)
        self._state: dict | None = None
        self._disk_state: dict | None = None
        self._lock = asyncio.Lock()
        self._writer: asyncio.Task[bool] | None = None

    @property
    def loaded(self) -> bool:
        """Report whether complete durable policy validated."""
        return self._state is not None

    async def _disk(self):
        return await self.hass.async_add_executor_job(_read, self._store.path)

    async def async_load(self):
        """Drain earlier writes and load without modifying unknown/corrupt bytes."""
        async with self._lock:
            self._state = None
            if self._writer is not None:
                await asyncio.shield(self._writer)
                self._writer = None
            try:
                raw = await self._disk()
                self._disk_state = deepcopy(raw)
                self._state = _parse(
                    raw if raw is not None else {"revision": 0, "grants": []}
                )
            except Exception:  # noqa: BLE001 -- filesystem/schema internals stay private.
                raise AgentStoreError(
                    "Unattended action policy is unavailable"
                ) from None

    def snapshot(self):
        """Return detached policy or refuse access while unavailable."""
        if self._state is None:
            raise AgentStoreError("Unattended action policy is unavailable")
        return deepcopy(self._state)

    def get(self, workflow_id: str):
        """Return a detached explicit grant, never an implicit default grant."""
        return next(
            (
                row
                for row in self.snapshot()["grants"]
                if row["workflow_id"] == workflow_id
            ),
            None,
        )

    async def _write(self, payload):
        try:
            if await self._disk() != self._disk_state:
                return False
            await self._store.async_save(deepcopy(payload))
            return await self._disk() == payload
        except Exception:  # noqa: BLE001 -- no private disk exception content.
            return False

    async def async_update(
        self, workflow_id: str, grant: dict | None, revision: int | None = None
    ):
        """Serialize a bounded revision-checked durable grant mutation."""
        if not _uuid(workflow_id):
            raise AgentPolicyError("Invalid workflow identity")
        async with self._lock:
            current = self.snapshot()
            if revision is not None and (
                type(revision) is not int or revision != current["revision"]
            ):
                raise AgentRevisionError("Unattended action policy changed")
            remaining = [
                row for row in current["grants"] if row["workflow_id"] != workflow_id
            ]
            if grant is not None:
                if grant.get("workflow_id") != workflow_id:
                    raise AgentPolicyError("Unattended workflow changed")
                remaining.append(grant)
            if grant is None and remaining == current["grants"]:
                return current["revision"]
            payload = _parse({"revision": current["revision"] + 1, "grants": remaining})
            self._writer = self.hass.async_create_background_task(
                self._write(payload), "workflow-action-policy-write"
            )
            try:
                if not await asyncio.shield(self._writer):
                    self._state = None
                    raise AgentStoreError("Unattended action policy write failed")
            except asyncio.CancelledError:
                self._state = None
                raise
            self._writer = None
            self._state = payload
            self._disk_state = deepcopy(payload)
            return payload["revision"]
