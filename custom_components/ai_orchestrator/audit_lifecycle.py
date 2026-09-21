"""Owned periodic retention for the durable metadata store."""

import asyncio
from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta

from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval

from .agent_store import AgentPolicyError
from .audit_store import AuditStore, AuditStoreError


class AuditLifecycle:
    """Keep one retention timer and drain old maintenance before recovery."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: AuditStore,
        maintenance: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        """Create an idle owner without loading data or registering callbacks."""
        self._hass = hass
        self.store = store
        self._maintenance = maintenance
        self._unsubscribe: Callable[[], None] | None = None
        self._stop_unsubscribe: Callable[[], None] | None = None
        self._tasks: set[asyncio.Task] = set()
        self._token: object | None = None

    async def async_start(self) -> None:
        """Recover storage before starting an hourly bounded cleanup."""
        self.stop()
        if self._tasks:
            await asyncio.gather(*tuple(self._tasks), return_exceptions=True)
        await self.store.async_load()
        token = self._token = object()

        async def prune(_now: datetime) -> None:
            if self._token is not token:
                return
            task = asyncio.current_task()
            assert task is not None  # noqa: S101 -- callback runs as a coroutine.
            self._tasks.add(task)
            try:
                if self._maintenance is not None:
                    await self._maintenance()
                if self._token is not token:
                    return
                await self.store.async_prune()
            except AuditStoreError, AgentPolicyError:
                # The store fails closed. No exception text or records are logged.
                pass
            finally:
                self._tasks.discard(task)

        self._unsubscribe = async_track_time_interval(
            self._hass, prune, timedelta(hours=1)
        )

        @callback
        def stop_on_shutdown(_event: object) -> None:
            self._stop_unsubscribe = None
            self.stop()

        self._stop_unsubscribe = self._hass.bus.async_listen_once(
            EVENT_HOMEASSISTANT_STOP, stop_on_shutdown
        )

    @callback
    def stop(self) -> None:
        """Revoke future callbacks and cancel owned maintenance tasks."""
        self._token = None
        if self._unsubscribe is not None:
            self._unsubscribe()
            self._unsubscribe = None
        if self._stop_unsubscribe is not None:
            self._stop_unsubscribe()
            self._stop_unsubscribe = None
        current = asyncio.current_task()
        for task in tuple(self._tasks):
            if task is not current:
                task.cancel()
