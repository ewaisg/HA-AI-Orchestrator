"""Bounded durable metadata journal; recovery never replays a side effect.

Home Assistant Store owns every write. Reads use a bounded executor reader:
Store.async_load renames corrupt JSON and treats it as missing, which would
erase the distinction between first install and an unreadable execution journal.
"""

import asyncio
import json
import os
import stat
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.json import prepare_save_json
from homeassistant.helpers.storage import Store

from .audit_schema import (
    MAX_FILE_BYTES,
    MAX_RECORDS,
    MAX_SEQUENCE,
    OPERATIONS,
    PENDING,
    RETENTION_DAYS,
    AuditValidationError,
    parse_payload,
    parse_record,
    timestamp,
    transition,
)

STORAGE_KEY = "ai_orchestrator.audit"


class AuditStoreError(RuntimeError):
    """Static storage failure; callers must refuse unaudited side effects."""


def _envelope(payload: dict) -> dict:
    return {"version": 1, "minor_version": 1, "key": STORAGE_KEY, "data": payload}


def _encoded_size(payload: dict) -> int:
    _, encoded = prepare_save_json(_envelope(payload))
    return len(encoded.encode() if isinstance(encoded, str) else encoded)


def _unique_object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise AuditStoreError("Duplicate audit key")
        result[key] = value
    return result


def _read(path: str) -> dict | None:
    """Read a regular nonsymlink bounded file without modifying corrupt data."""
    target = Path(path)
    try:
        parent_stat = target.parent.lstat()
    except FileNotFoundError:
        return None
    if not stat.S_ISDIR(parent_stat.st_mode) or target.parent.is_junction():
        raise AuditStoreError("Audit path is unsafe")
    try:
        before = target.lstat()
    except FileNotFoundError:
        return None
    if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_FILE_BYTES:
        raise AuditStoreError("Audit file is invalid")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        opened = os.fstat(descriptor)
        if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
            raise AuditStoreError("Audit file changed during read")
        with os.fdopen(descriptor, "rb", closefd=False) as stream:
            content = stream.read(MAX_FILE_BYTES + 1)
        after = os.fstat(descriptor)
        if len(content) > MAX_FILE_BYTES or (opened.st_size, opened.st_mtime_ns) != (
            after.st_size,
            after.st_mtime_ns,
        ):
            raise AuditStoreError("Audit file changed during read")
    finally:
        os.close(descriptor)
    raw = json.loads(content, object_pairs_hook=_unique_object)
    if (
        type(raw) is not dict
        or set(raw) != {"version", "minor_version", "key", "data"}
        or type(raw["version"]) is not int
        or raw["version"] != 1
        or type(raw["minor_version"]) is not int
        or raw["minor_version"] != 1
        or raw["key"] != STORAGE_KEY
    ):
        raise AuditStoreError("Unsupported audit envelope")
    return parse_payload(raw["data"])


class AuditStore:
    """Serialized atomic metadata updates with disk readback and finite retention."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Create an unloaded metadata journal without listeners or actions."""
        self._hass = hass
        self._store = Store(hass, 1, STORAGE_KEY, private=True, atomic_writes=True)
        self._payload: dict[str, Any] | None = None
        self._disk_state: dict[str, Any] | None = None
        self._write_task: asyncio.Task[bool] | None = None
        self._lock = asyncio.Lock()

    @property
    def loaded(self) -> bool:
        """Return whether durable data was read and recovery completed."""
        return self._payload is not None

    async def _disk(self) -> dict | None:
        return await self._hass.async_add_executor_job(_read, self._store.path)

    def _current(self) -> dict:
        if self._payload is None:
            raise AuditStoreError("Audit storage is unavailable")
        return deepcopy(self._payload)

    def _prune(self, payload: dict, now: datetime) -> dict:
        cutoff = now - timedelta(days=RETENTION_DAYS)
        payload["records"] = [
            row
            for row in payload["records"]
            if row["phase"] in PENDING or timestamp(row["created_at"]) > cutoff
        ]
        while (
            len(payload["records"]) > MAX_RECORDS
            or _encoded_size(payload) > MAX_FILE_BYTES
        ):
            index = next(
                (
                    i
                    for i, row in enumerate(payload["records"])
                    if row["phase"] not in PENDING
                ),
                None,
            )
            if index is None:
                raise AuditStoreError("Audit capacity reached")
            del payload["records"][index]
        return parse_payload(payload)

    async def _write_payload(self, payload: dict) -> bool:
        try:
            # A read-only preflight also rejects a replaced/symlinked storage path.
            if await self._disk() != self._disk_state:
                raise AuditStoreError("Audit changed outside this journal")
            await self._store.async_save(deepcopy(payload))
            persisted = await self._disk()
            if persisted != payload:
                raise AuditStoreError("Audit write was not confirmed")
        except HomeAssistantError, OSError, ValueError, RecursionError, AuditStoreError:
            # A shielded worker returns status so cancelled callers never create
            # Python 3.14's unhandled "exception in shielded future" diagnostic.
            return False
        return True

    async def _settle_write(self) -> None:
        task = self._write_task
        if task is not None:
            await asyncio.shield(task)
            self._write_task = None

    async def _commit(self, payload: dict) -> None:
        task = asyncio.create_task(self._write_payload(deepcopy(payload)))
        self._write_task = task
        try:
            if not await asyncio.shield(task):
                raise AuditStoreError("Audit write failed")
        except asyncio.CancelledError:
            self._payload = None
            # The atomic writer may already be executing in a thread. Preserve
            # ownership until it settles; even repeated cancellation cannot let
            # async_load race that still-owned write task.
            await self._settle_write()
            raise
        except AuditStoreError:
            self._payload = None
            raise
        self._write_task = None
        self._payload = deepcopy(payload)
        self._disk_state = deepcopy(payload)

    async def async_load(self) -> None:
        """Load strict v1 metadata and durably mark unfinished runs unknown."""
        async with self._lock:
            self._payload = None
            try:
                await self._settle_write()
                raw = await self._disk()
                self._disk_state = deepcopy(raw)
                if raw is None:
                    self._payload = {
                        "schema_version": 1,
                        "next_sequence": 1,
                        "records": [],
                    }
                    return
                recovered = deepcopy(raw)
                now = datetime.now(UTC)
                for index, row in enumerate(recovered["records"]):
                    if row["phase"] in PENDING:
                        recovered["records"][index] = transition(
                            row,
                            phase="unknown",
                            now=max(now, timestamp(row["updated_at"])).isoformat(),
                            provider_calls=row["provider_calls"],
                            actions_attempted=row["actions_attempted"],
                            service_returns=row["service_returns"],
                            error_code="interrupted",
                        )
                recovered = self._prune(recovered, now)
                if recovered != raw:
                    await self._commit(recovered)
                else:
                    self._payload = recovered
            except (
                HomeAssistantError,
                OSError,
                ValueError,
                RecursionError,
                AuditStoreError,
            ):
                self._payload = None
                raise AuditStoreError("Audit storage is unreadable") from None

    async def async_begin(
        self,
        operation: str,
        *,
        parent_id: str | None = None,
        step_index: int | None = None,
    ) -> dict:
        """Persist a fresh server-generated request identity, never household IDs."""
        async with self._lock:
            payload = self._current()
            if type(operation) is not str or operation not in OPERATIONS:
                raise AuditValidationError("Unsupported audit operation")
            if parent_id is not None and not any(
                row["audit_id"] == parent_id for row in payload["records"]
            ):
                raise AuditValidationError("Unknown audit parent")
            sequence = payload["next_sequence"]
            if sequence >= MAX_SEQUENCE:
                raise AuditStoreError("Audit sequence limit reached")
            now = datetime.now(UTC)
            kind, risk = OPERATIONS[operation]
            row = parse_record(
                {
                    "sequence": sequence,
                    "audit_id": str(uuid4()),
                    "parent_id": parent_id,
                    "kind": kind,
                    "phase": "requested",
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                    "operation": operation,
                    "risk": risk,
                    "step_index": step_index,
                    "provider_calls": 0,
                    "actions_attempted": 0,
                    "service_returns": 0,
                    "error_code": None,
                    "counts_final": False,
                }
            )
            payload["next_sequence"] += 1
            payload["records"].append(row)
            await self._commit(self._prune(payload, now))
            return deepcopy(row)

    async def async_transition(
        self,
        audit_id: str,
        *,
        expected_phase: str,
        phase: str,
        provider_calls: int | None = None,
        actions_attempted: int | None = None,
        service_returns: int | None = None,
        error_code: str | None = None,
    ) -> dict:
        """Advance a previously persisted record using optimistic phase binding."""
        async with self._lock:
            payload = self._current()
            index = next(
                (
                    i
                    for i, row in enumerate(payload["records"])
                    if row["audit_id"] == audit_id
                ),
                None,
            )
            if index is None or payload["records"][index]["phase"] != expected_phase:
                raise AuditValidationError("Audit record changed or unavailable")
            old = payload["records"][index]
            now = datetime.now(UTC)
            row = transition(
                old,
                phase=phase,
                now=now.isoformat(),
                provider_calls=old["provider_calls"]
                if provider_calls is None
                else provider_calls,
                actions_attempted=old["actions_attempted"]
                if actions_attempted is None
                else actions_attempted,
                service_returns=old["service_returns"]
                if service_returns is None
                else service_returns,
                error_code=error_code,
            )
            payload["records"][index] = row
            await self._commit(self._prune(payload, now))
            return deepcopy(row)

    async def async_prune(self) -> None:
        """Expire terminal metadata; a future lifecycle owner schedules this call."""
        async with self._lock:
            current = self._current()
            updated = self._prune(deepcopy(current), datetime.now(UTC))
            if updated != current:
                await self._commit(updated)

    def list(self, *, after_sequence: int = 0, limit: int = 100) -> list[dict]:
        """Return detached bounded metadata, with no caller-provided selectors."""
        if (
            type(after_sequence) is not int
            or not 0 <= after_sequence <= MAX_SEQUENCE
            or type(limit) is not int
            or not 1 <= limit <= 100
        ):
            raise AuditValidationError("Invalid audit page")
        return [
            row
            for row in self._current()["records"]
            if row["sequence"] > after_sequence
        ][:limit]
