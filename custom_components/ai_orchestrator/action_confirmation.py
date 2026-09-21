"""Bounded, process-local, one-use confirmations; never executes an action."""

import hashlib
import secrets
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from threading import Lock

from .action_policy import ActionBinding, ActionRisk, ActionRule, require_action_policy

CONFIRMATION_TTL_SECONDS = 300
MAX_PENDING_CONFIRMATIONS = 128


@dataclass(frozen=True)
class _Pending:
    binding: ActionBinding = field(repr=False)
    risk: ActionRisk
    expires: float


class ActionConfirmations:
    """Issue only to an authenticated human UI, never to a model.

    Consumption burns the token even on a failed check. The caller must consume
    immediately before dispatch, with no intervening await or retry. Dispatch
    failure/unknown outcome does not restore approval. Restart/unload requires
    a new instance and invalidates all approvals. This is not a durable action
    journal; execution idempotency and trusted UI transport remain integration
    obligations. All currently classified risks require confirmation here.
    """

    def __init__(self, *, clock: Callable[[], float] = time.monotonic) -> None:
        """Create a fresh bounded approval namespace."""
        self._clock = clock
        self._pending: dict[str, _Pending] = {}
        self._lock = Lock()

    def issue(
        self, binding: ActionBinding, rules: tuple[ActionRule, ...], *, authorized: bool
    ) -> str:
        """Bind an unpredictable token to an explicitly permitted proposal."""
        risk = require_action_policy(binding, rules, authorized=authorized)
        with self._lock:
            now = self._clock()
            self._pending = {
                key: value
                for key, value in self._pending.items()
                if value.expires > now
            }
            if len(self._pending) >= MAX_PENDING_CONFIRMATIONS:
                raise ValueError("Confirmation capacity reached")
            token = secrets.token_urlsafe(32)
            self._pending[self._key(token)] = _Pending(
                binding, risk, now + CONFIRMATION_TTL_SECONDS
            )
            return token

    def consume(
        self,
        token: str,
        current: ActionBinding,
        rules: tuple[ActionRule, ...],
        *,
        authorized: bool,
    ) -> ActionRisk:
        """Atomically burn one token, then verify exact fresh authorization."""
        if type(token) is not str or not 1 <= len(token) <= 128:
            raise ValueError("Confirmation is invalid")
        with self._lock:
            pending = self._pending.pop(self._key(token), None)
            if (
                pending is None
                or self._clock() >= pending.expires
                or pending.binding != current
            ):
                raise ValueError("Confirmation is invalid")
            risk = require_action_policy(current, rules, authorized=authorized)
            if risk is not pending.risk:
                raise ValueError("Confirmation is invalid")
            return risk

    def clear(self) -> None:
        """Revoke all pending approvals on unload or explicit cancellation."""
        with self._lock:
            self._pending.clear()

    def revoke_binding(self, binding: ActionBinding) -> None:
        """Revoke only approvals for one server-owned expired proposal binding."""
        with self._lock:
            self._pending = {
                key: value
                for key, value in self._pending.items()
                if value.binding != binding
            }

    @staticmethod
    def _key(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()
