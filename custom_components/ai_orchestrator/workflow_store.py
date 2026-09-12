"""Versioned Home Assistant storage for workflow documents (ADR-0005).

The store never edits `.storage` files directly; it uses Home Assistant's
`Store` helper with atomic writes. Every document passes through schema
migration on load and full validation on write, so a malformed stored record
can never gain capability or be silently rewritten.

Home Assistant's `Store.async_save` logs a failed disk write and returns
normally, so every commit here reads the store back and compares it with what
was written before the in-memory collection changes. Mutations are serialized
with a lock so overlapping administrator requests cannot lose a write.
"""

from __future__ import annotations

import asyncio
from copy import deepcopy
from typing import Any, Final

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

from .const import DOMAIN
from .workflow_schema import (
    WorkflowValidationError,
    migrate_workflow,
    parse_workflow,
)

STORAGE_KEY: Final = f"{DOMAIN}.workflows"
STORAGE_VERSION: Final = 1
MAX_WORKFLOWS: Final = 50


class WorkflowStoreError(RuntimeError):
    """Static, redacted storage failure; never echoes stored content."""


class WorkflowNotFoundError(WorkflowStoreError):
    """The requested workflow ID is not stored."""


class WorkflowStore:
    """Bounded collection of validated workflow documents keyed by ID."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Bind to the integration's private storage key without reading it."""
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, STORAGE_KEY, private=True, atomic_writes=True
        )
        self._workflows: dict[str, dict[str, Any]] | None = None
        self._lock = asyncio.Lock()

    @property
    def loaded(self) -> bool:
        """Return whether a successful load has completed."""
        return self._workflows is not None

    async def async_load(self) -> None:
        """Read and validate every stored document, or fail closed.

        A structurally invalid container, an invalid document, a duplicate ID,
        or a Home Assistant read failure rejects the whole store. Nothing is
        rewritten on failure, so an administrator can inspect or restore the
        file. Home Assistant itself renames a JSON-corrupt file aside and
        reports an empty store; that case loads as empty here.
        """
        try:
            data = await self._store.async_load()
        except HomeAssistantError, OSError:
            raise WorkflowStoreError("stored workflows are unreadable") from None
        if data is None:
            self._workflows = {}
            return
        if (
            not isinstance(data, dict)
            or set(data) != {"workflows"}
            or not isinstance(data["workflows"], list)
            or len(data["workflows"]) > MAX_WORKFLOWS
        ):
            raise WorkflowStoreError("stored workflows are unreadable")
        workflows: dict[str, dict[str, Any]] = {}
        for raw in data["workflows"]:
            try:
                document = migrate_workflow(raw)
            except WorkflowValidationError:
                raise WorkflowStoreError("stored workflows are unreadable") from None
            if document["workflow_id"] in workflows:
                raise WorkflowStoreError("stored workflows are unreadable")
            workflows[document["workflow_id"]] = document
        self._workflows = workflows

    def _require_loaded(self) -> dict[str, dict[str, Any]]:
        if self._workflows is None:
            raise WorkflowStoreError("workflow storage is not loaded")
        return self._workflows

    def list(self) -> list[dict[str, Any]]:
        """Return detached copies of every document in stored order."""
        if self._workflows is None:
            return []
        return [deepcopy(document) for document in self._workflows.values()]

    def get(self, workflow_id: str) -> dict[str, Any] | None:
        """Return a detached copy of one document, or None."""
        if self._workflows is None:
            return None
        document = self._workflows.get(workflow_id)
        return None if document is None else deepcopy(document)

    async def async_upsert(self, raw: Any) -> dict[str, Any]:
        """Validate and persist one document; raise on any failure.

        `WorkflowValidationError` propagates for schema problems so the caller
        can report a field name. A write that cannot be read back becomes
        `WorkflowStoreError` and leaves the in-memory collection unchanged.
        """
        async with self._lock:
            workflows = self._require_loaded()
            document = parse_workflow(raw).as_dict()
            workflow_id = document["workflow_id"]
            if workflow_id not in workflows and len(workflows) >= MAX_WORKFLOWS:
                raise WorkflowStoreError("workflow limit reached")
            await self._commit({**workflows, workflow_id: document})
            return deepcopy(document)

    async def async_delete(self, workflow_id: str) -> bool:
        """Remove one document; return whether it existed."""
        async with self._lock:
            workflows = self._require_loaded()
            if workflow_id not in workflows:
                return False
            remaining = {
                key: value for key, value in workflows.items() if key != workflow_id
            }
            await self._commit(remaining)
            return True

    async def async_set_enabled(
        self, workflow_id: str, enabled: bool
    ) -> dict[str, Any]:
        """Persist the enabled flag, re-validating the whole document."""
        async with self._lock:
            workflows = self._require_loaded()
            existing = workflows.get(workflow_id)
            if existing is None:
                raise WorkflowNotFoundError("workflow not found")
            document = parse_workflow({**existing, "enabled": enabled}).as_dict()
            await self._commit({**workflows, workflow_id: document})
            return deepcopy(document)

    async def _commit(self, workflows: dict[str, dict[str, Any]]) -> None:
        """Write the whole collection, then prove it by reading it back."""
        payload = {"workflows": [deepcopy(document) for document in workflows.values()]}
        try:
            await self._store.async_save(deepcopy(payload))
            persisted = await self._store.async_load()
        except HomeAssistantError, OSError:
            raise WorkflowStoreError("workflow storage write failed") from None
        if persisted != payload:
            raise WorkflowStoreError("workflow storage write failed")
        self._workflows = workflows
