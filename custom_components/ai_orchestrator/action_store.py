"""Separate versioned explicit action grants; no observation policy migration."""

import asyncio
import json
import os
import stat
from copy import deepcopy
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

from .agent_store import (
    AgentPolicyError,
    AgentRevisionError,
    AgentStoreError,
    connection_uuid,
    observation_ids,
)
from .switch_review import SWITCH_TOOLS, reviews

STORAGE_KEY = "ai_orchestrator.actions"
TOOL_IDS = frozenset(
    {
        "light_turn_on_v1",
        "light_turn_off_v1",
        "switch_turn_on_v1",
        "switch_turn_off_v1",
        "media_play_v1",
        "media_pause_v1",
        "media_volume_v1",
    }
)


def action_scopes(raw: object) -> list[dict[str, Any]]:
    """Require closed versioned tools and at most 64 explicit target grants."""
    if type(raw) is not list or len(raw) > len(TOOL_IDS):
        raise AgentPolicyError("Invalid action scope")
    result = []
    seen = set()
    count = 0
    for item in raw:
        if (
            type(item) is not dict
            or set(item) != {"tool_id", "registry_ids"}
            or type(item["tool_id"]) is not str
            or item["tool_id"] not in TOOL_IDS
            or item["tool_id"] in seen
        ):
            raise AgentPolicyError("Invalid action scope")
        ids = observation_ids(item["registry_ids"])
        if not ids:
            raise AgentPolicyError("Invalid action scope")
        seen.add(item["tool_id"])
        count += len(ids)
        result.append({"tool_id": item["tool_id"], "registry_ids": ids})
    if count > 64:
        raise AgentPolicyError("Action scope limit reached")
    return result


def _profile(raw: object, *, legacy: bool = False) -> dict[str, Any]:
    if (
        type(raw) is not dict
        or set(raw)
        != (
            {"connection_id", "revision", "action_scopes"}
            if legacy
            else {"connection_id", "revision", "action_scopes", "switch_reviews"}
        )
        or type(raw["revision"]) is not int
        or raw["revision"] < 1
    ):
        raise AgentPolicyError("Invalid action profile")
    return {
        "connection_id": connection_uuid(raw["connection_id"]),
        "revision": raw["revision"],
        "action_scopes": action_scopes(raw["action_scopes"]),
        "switch_reviews": [] if legacy else reviews(raw["switch_reviews"]),
    }


class _ActionStorage(Store):
    """Only the exact legacy schema may migrate; dormant switch grants drop."""

    _writer: asyncio.Task | None = None

    async def async_save(self, data):
        """Keep ownership of executor writes across cancellation and reload."""
        if self._writer is not None:
            await asyncio.shield(self._writer)
        self._writer = self.hass.async_create_background_task(
            super().async_save(data), "action-policy-write"
        )
        # Retrieve failures even if the waiting request was cancelled.
        self._writer.add_done_callback(
            lambda task: task.exception() if not task.cancelled() else None
        )
        await asyncio.shield(self._writer)

    async def async_load(self):
        if self._writer is not None:
            try:
                await asyncio.shield(self._writer)
            finally:
                if self._writer.done():
                    self._writer = None
        await self.hass.async_add_executor_job(_preflight, self.path)
        return await super().async_load()

    async def _async_migrate_func(self, old_major_version, old_minor_version, old_data):
        if old_major_version != 1 or old_minor_version != 1:
            raise AgentStoreError("Unsupported action storage version")
        if (
            type(old_data) is not dict
            or set(old_data) != {"profiles"}
            or type(old_data["profiles"]) is not list
            or len(old_data["profiles"]) > 32
        ):
            raise AgentStoreError("Invalid legacy action storage")
        profiles = [_profile(raw, legacy=True) for raw in old_data["profiles"]]
        if len({profile["connection_id"] for profile in profiles}) != len(profiles):
            raise AgentStoreError("Invalid legacy action storage")
        for profile in profiles:
            profile["revision"] += 1
            profile["action_scopes"] = [
                scope
                for scope in profile["action_scopes"]
                if scope["tool_id"] not in SWITCH_TOOLS
            ]
        return {"profiles": profiles}


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise AgentStoreError("Duplicate action storage field")
        result[key] = value
    return result


def _preflight(path: str) -> None:
    """Refuse malformed envelopes before HA can rename or migrate their bytes."""
    target = Path(path)
    try:
        parent = target.parent.lstat()
    except FileNotFoundError:
        return
    if not stat.S_ISDIR(parent.st_mode) or target.parent.is_junction():
        raise AgentStoreError("Unsafe action storage path")
    try:
        before = target.lstat()
    except FileNotFoundError:
        return
    if not stat.S_ISREG(before.st_mode) or before.st_size > 2 * 1024 * 1024:
        raise AgentStoreError("Invalid action storage file")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        opened = os.fstat(descriptor)
        if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
            raise AgentStoreError("Action storage changed")
        with os.fdopen(descriptor, "rb", closefd=False) as stream:
            content = stream.read(2 * 1024 * 1024 + 1)
        after = os.fstat(descriptor)
        if len(content) > 2 * 1024 * 1024 or (opened.st_size, opened.st_mtime_ns) != (
            after.st_size,
            after.st_mtime_ns,
        ):
            raise AgentStoreError("Action storage changed")
    finally:
        os.close(descriptor)
    try:
        envelope = json.loads(content, object_pairs_hook=_unique_object)
        if (
            type(envelope) is not dict
            or set(envelope) != {"version", "minor_version", "key", "data"}
            or type(envelope["version"]) is not int
            or envelope["version"] not in {1, 2}
            or type(envelope["minor_version"]) is not int
            or envelope["minor_version"] != 1
            or envelope["key"] != STORAGE_KEY
        ):
            raise ValueError
        data = envelope["data"]
        if (
            type(data) is not dict
            or set(data) != {"profiles"}
            or type(data["profiles"]) is not list
            or len(data["profiles"]) > 32
        ):
            raise ValueError
        profiles = [
            _profile(raw, legacy=envelope["version"] == 1) for raw in data["profiles"]
        ]
        if len({profile["connection_id"] for profile in profiles}) != len(profiles):
            raise ValueError
    except ValueError, TypeError, UnicodeError:
        raise AgentStoreError("Action storage is unreadable") from None


class ActionStore:
    """Fail-closed atomic grant collection with optimistic revision checks."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Create an unloaded bounded private store."""
        self._store = _ActionStorage(
            hass, 2, STORAGE_KEY, private=True, atomic_writes=True
        )
        self._profiles: dict[str, dict[str, Any]] | None = None
        self._lock = asyncio.Lock()

    @property
    def loaded(self) -> bool:
        """Return whether the complete collection validated."""
        return self._profiles is not None

    async def async_load(self) -> None:
        """Load without rewriting corrupt records or granting implicit scope."""
        async with self._lock:
            self._profiles = None
            try:
                data = await self._store.async_load()
                if data is not None and await self._store.async_load() != data:
                    raise AgentStoreError("Action storage readback failed")
                profiles = {}
                if data is not None:
                    if (
                        type(data) is not dict
                        or set(data) != {"profiles"}
                        or type(data["profiles"]) is not list
                        or len(data["profiles"]) > 32
                    ):
                        raise AgentPolicyError("Invalid action collection")
                    for raw in data["profiles"]:
                        profile = _profile(raw)
                        identity = profile["connection_id"]
                        if identity in profiles:
                            raise AgentPolicyError("Duplicate action profile")
                        profiles[identity] = profile
            except HomeAssistantError, OSError, AgentPolicyError:
                raise AgentStoreError("Action storage is unreadable") from None
            self._profiles = profiles

    def get(self, connection_id: str) -> dict[str, Any]:
        """Return detached policy, defaulting to an empty deny-all scope."""
        identity = connection_uuid(connection_id)
        if self._profiles is None:
            raise AgentStoreError("Action storage is unavailable")
        return deepcopy(
            self._profiles.get(
                identity,
                {
                    "connection_id": identity,
                    "revision": 0,
                    "action_scopes": [],
                    "switch_reviews": [],
                },
            )
        )

    async def async_save(
        self,
        connection_id: str,
        scopes: object,
        expected_revision: int,
        *,
        review_update: tuple[str, dict[str, Any] | None] | None = None,
    ) -> dict[str, Any]:
        """Serialize grant updates and read back durable data before enabling."""
        identity = connection_uuid(connection_id)
        validated = action_scopes(scopes)
        if type(expected_revision) is not int or expected_revision < 0:
            raise AgentPolicyError("Invalid revision")
        async with self._lock:
            existing = self.get(identity)
            if existing["revision"] != expected_revision:
                raise AgentRevisionError("Action policy changed")
            switch_reviews = existing["switch_reviews"]
            if review_update is not None:
                registry_id, review = review_update
                observation_ids([registry_id])
                switch_reviews = [
                    item
                    for item in switch_reviews
                    if item["registry_id"] != registry_id
                ]
                if review is not None:
                    if review.get("registry_id") != registry_id:
                        raise AgentPolicyError("Invalid switch review")
                    switch_reviews.append(review)
                switch_reviews = reviews(switch_reviews)
                validated = [
                    {
                        "tool_id": scope["tool_id"],
                        "registry_ids": [
                            target
                            for target in scope["registry_ids"]
                            if scope["tool_id"] not in SWITCH_TOOLS
                            or target != registry_id
                        ],
                    }
                    for scope in existing["action_scopes"]
                ]
                validated = [scope for scope in validated if scope["registry_ids"]]
            reviewed = {item["registry_id"] for item in switch_reviews}
            if any(
                scope["tool_id"] in SWITCH_TOOLS
                and not set(scope["registry_ids"]) <= reviewed
                for scope in validated
            ):
                raise AgentPolicyError("Switch review is required")
            assert self._profiles is not None  # noqa: S101 -- get verified loaded.
            if identity not in self._profiles and len(self._profiles) >= 32:
                raise AgentPolicyError("Action profile limit reached")
            profile = {
                "connection_id": identity,
                "revision": expected_revision + 1,
                "action_scopes": validated,
                "switch_reviews": switch_reviews,
            }
            updated = {**self._profiles, identity: profile}
            payload = {"profiles": deepcopy(list(updated.values()))}
            try:
                await self._store.async_save(deepcopy(payload))
                persisted = await self._store.async_load()
            except asyncio.CancelledError:
                self._profiles = None
                raise
            except HomeAssistantError, OSError:
                self._profiles = None
                raise AgentStoreError("Action storage write failed") from None
            if persisted != payload:
                self._profiles = None
                raise AgentStoreError("Action storage write failed")
            self._profiles = updated
            return deepcopy(profile)
