"""Bounded, versioned observation policies with confirmed atomic persistence."""

import asyncio
from copy import deepcopy
from typing import Any
from uuid import UUID

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

STORAGE_KEY = "ai_orchestrator.agents"
MAX_PROFILES = 32
MAX_OBSERVATIONS = 64


class AgentPolicyError(ValueError):
    """Invalid policy, with no private values in the message."""


class AgentStoreError(RuntimeError):
    """Policy storage is unavailable."""


class AgentRevisionError(AgentStoreError):
    """A concurrent edit changed the policy."""


def connection_uuid(value: object) -> str:
    """Validate a canonical provider connection identity."""
    try:
        if type(value) is str and str(UUID(value)) == value:
            return value
    except ValueError:
        pass
    raise AgentPolicyError("Invalid connection identity")


def observation_ids(value: object) -> list[str]:
    """Validate a bounded, explicit list of stable registry identities."""
    if (
        type(value) is not list
        or len(value) > MAX_OBSERVATIONS
        or any(type(item) is not str or not 1 <= len(item) <= 64 for item in value)
        or len(set(value)) != len(value)
    ):
        raise AgentPolicyError("Invalid observation scope")
    return list(value)


def _profile(raw: object) -> dict[str, Any]:
    if type(raw) is not dict or set(raw) != {
        "connection_id",
        "revision",
        "observe_registry_ids",
        "action_scopes",
    }:
        raise AgentPolicyError("Invalid policy")
    if type(raw["revision"]) is not int or raw["revision"] < 1:
        raise AgentPolicyError("Invalid revision")
    if type(raw["action_scopes"]) is not list or raw["action_scopes"]:
        raise AgentPolicyError("Actions are unavailable")
    return {
        "connection_id": connection_uuid(raw["connection_id"]),
        "revision": raw["revision"],
        "observe_registry_ids": observation_ids(raw["observe_registry_ids"]),
        "action_scopes": [],
    }


class AgentStore:
    """Separate policy collection; never stores state values or credentials."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Create a private Home Assistant store."""
        self._store = Store(hass, 1, STORAGE_KEY, private=True, atomic_writes=True)
        self._profiles: dict[str, dict[str, Any]] | None = None
        self._lock = asyncio.Lock()

    @property
    def loaded(self) -> bool:
        """Return whether loading completed successfully."""
        return self._profiles is not None

    async def async_load(self) -> None:
        """Validate the complete collection without rewriting invalid records."""
        async with self._lock:
            self._profiles = None
            try:
                data = await self._store.async_load()
                profiles = {}
                if data is not None:
                    if (
                        type(data) is not dict
                        or set(data) != {"profiles"}
                        or type(data["profiles"]) is not list
                        or len(data["profiles"]) > MAX_PROFILES
                    ):
                        raise AgentPolicyError("Invalid policy collection")
                    for raw in data["profiles"]:
                        profile = _profile(raw)
                        identity = profile["connection_id"]
                        if identity in profiles:
                            raise AgentPolicyError("Duplicate policy")
                        profiles[identity] = profile
            except HomeAssistantError, OSError, AgentPolicyError:
                raise AgentStoreError("Policy storage is unreadable") from None
            self._profiles = profiles

    def list(self) -> list[dict[str, Any]]:
        """Return detached policy metadata."""
        if self._profiles is None:
            raise AgentStoreError("Policy storage is unavailable")
        return deepcopy(list(self._profiles.values()))

    def get(self, connection_id: str) -> dict[str, Any]:
        """Return the saved policy or a deny-all revision-zero default."""
        identity = connection_uuid(connection_id)
        if self._profiles is None:
            raise AgentStoreError("Policy storage is unavailable")
        return deepcopy(
            self._profiles.get(
                identity,
                {
                    "connection_id": identity,
                    "revision": 0,
                    "observe_registry_ids": [],
                    "action_scopes": [],
                },
            )
        )

    async def async_save(
        self,
        connection_id: str,
        observe_registry_ids: list[str],
        expected_revision: int,
    ) -> dict[str, Any]:
        """Serialize edits and reject stale revisions before writing."""
        identity = connection_uuid(connection_id)
        ids = observation_ids(observe_registry_ids)
        if type(expected_revision) is not int or expected_revision < 0:
            raise AgentPolicyError("Invalid revision")
        async with self._lock:
            existing = self.get(identity)
            if existing["revision"] != expected_revision:
                raise AgentRevisionError("Policy changed; reload before saving")
            if self._profiles is None:
                raise AgentStoreError("Policy storage is unavailable")
            if identity not in self._profiles and len(self._profiles) >= MAX_PROFILES:
                raise AgentPolicyError("Policy limit reached")
            profile = {
                "connection_id": identity,
                "revision": expected_revision + 1,
                "observe_registry_ids": ids,
                "action_scopes": [],
            }
            updated = {**self._profiles, identity: profile}
            payload = {"profiles": deepcopy(list(updated.values()))}
            try:
                await self._store.async_save(deepcopy(payload))
                persisted = await self._store.async_load()
            except asyncio.CancelledError:
                # Cancellation may arrive after the atomic disk replacement.
                # Never keep earlier grants usable when the durable outcome is unknown.
                self._profiles = None
                raise
            except HomeAssistantError, OSError:
                self._profiles = None
                raise AgentStoreError("Policy storage write failed") from None
            if persisted != payload:
                self._profiles = None
                raise AgentStoreError("Policy storage write failed")
            self._profiles = updated
            return deepcopy(profile)
