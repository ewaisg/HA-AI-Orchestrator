"""Approval substitution, replay, expiry, state and identity regression tests."""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import fields, replace

import pytest

from custom_components.ai_orchestrator.action_confirmation import ActionConfirmations
from custom_components.ai_orchestrator.action_policy import ActionRisk
from tests.quality.test_action_policy import BINDING, RULE


def test_confirm_once_and_never_replay_after_dispatch_failure():
    confirmations = ActionConfirmations()
    token = confirmations.issue(BINDING, (RULE,), authorized=True)
    assert token not in repr(confirmations._pending)
    assert (
        confirmations.consume(token, BINDING, (RULE,), authorized=True)
        is ActionRisk.LOW
    )
    # Even if the later HA dispatch fails, no approval is restored.
    with pytest.raises(ValueError, match="invalid"):
        confirmations.consume(token, BINDING, (RULE,), authorized=True)


@pytest.mark.parametrize("field", [value.name for value in fields(BINDING)])
def test_every_binding_field_is_exact_and_failed_use_burns_token(field):
    confirmations = ActionConfirmations()
    token = confirmations.issue(BINDING, (RULE,), authorized=True)
    value = ("other",) if field == "target_registry_ids" else "changed"
    with pytest.raises(ValueError, match="invalid"):
        confirmations.consume(
            token, replace(BINDING, **{field: value}), (RULE,), authorized=True
        )
    with pytest.raises(ValueError, match="invalid"):
        confirmations.consume(token, BINDING, (RULE,), authorized=True)


@pytest.mark.parametrize("elapsed", [299.9, 300, 301])
def test_expiry_boundary(elapsed):
    now = [10.0]
    confirmations = ActionConfirmations(clock=lambda: now[0])
    token = confirmations.issue(BINDING, (RULE,), authorized=True)
    now[0] += elapsed
    if elapsed < 300:
        confirmations.consume(token, BINDING, (RULE,), authorized=True)
    else:
        with pytest.raises(ValueError, match="invalid"):
            confirmations.consume(token, BINDING, (RULE,), authorized=True)


@pytest.mark.parametrize(
    "rules,authorized",
    [
        ((), True),
        ((RULE,), False),
        ((replace(RULE, risk=ActionRisk.HIGH),), True),
        ((replace(RULE, risk=ActionRisk.CRITICAL),), True),
    ],
)
def test_current_authority_rechecked_and_failed_use_burned(rules, authorized):
    confirmations = ActionConfirmations()
    token = confirmations.issue(BINDING, (RULE,), authorized=True)
    with pytest.raises(ValueError):
        confirmations.consume(token, BINDING, rules, authorized=authorized)
    with pytest.raises(ValueError):
        confirmations.consume(token, BINDING, (RULE,), authorized=True)


@pytest.mark.parametrize("token", [None, "", "x" * 129, "unissued-token"])
def test_invalid_token(token):
    with pytest.raises(ValueError):
        ActionConfirmations().consume(token, BINDING, (RULE,), authorized=True)


def test_restart_and_explicit_revocation():
    confirmations = ActionConfirmations()
    token = confirmations.issue(BINDING, (RULE,), authorized=True)
    with pytest.raises(ValueError):
        ActionConfirmations().consume(token, BINDING, (RULE,), authorized=True)
    confirmations.clear()
    with pytest.raises(ValueError):
        confirmations.consume(token, BINDING, (RULE,), authorized=True)


def test_bounded_capacity_expired_entries_reclaimed():
    now = [0.0]
    confirmations = ActionConfirmations(clock=lambda: now[0])
    tokens = {
        confirmations.issue(BINDING, (RULE,), authorized=True) for _ in range(128)
    }
    assert len(tokens) == 128
    with pytest.raises(ValueError, match="capacity"):
        confirmations.issue(BINDING, (RULE,), authorized=True)
    now[0] = 300
    confirmations.issue(BINDING, (RULE,), authorized=True)
    assert len(confirmations._pending) == 1


def test_concurrent_consumers_cannot_both_authorize():
    confirmations = ActionConfirmations()
    token = confirmations.issue(BINDING, (RULE,), authorized=True)

    def consume(_):
        try:
            confirmations.consume(token, BINDING, (RULE,), authorized=True)
        except ValueError:
            return False
        return True

    with ThreadPoolExecutor(max_workers=4) as executor:
        assert sum(executor.map(consume, range(20))) == 1


def test_cannot_issue_without_policy():
    with pytest.raises(ValueError, match="not authorized"):
        ActionConfirmations().issue(BINDING, (), authorized=True)


def test_revoke_only_selected_binding():
    confirmations = ActionConfirmations()
    first = confirmations.issue(BINDING, (RULE,), authorized=True)
    other = replace(BINDING, request_id="different-request")
    second = confirmations.issue(other, (RULE,), authorized=True)
    confirmations.revoke_binding(BINDING)
    with pytest.raises(ValueError):
        confirmations.consume(first, BINDING, (RULE,), authorized=True)
    assert (
        confirmations.consume(second, other, (RULE,), authorized=True) is ActionRisk.LOW
    )
