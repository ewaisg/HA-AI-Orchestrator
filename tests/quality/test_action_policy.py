"""Synthetic action policy fixtures; no installed or permitted HA action implied."""

from dataclasses import replace

import pytest

from custom_components.ai_orchestrator.action_policy import (
    ActionBinding,
    ActionRisk,
    ActionRule,
    require_action_policy,
)

BINDING = ActionBinding(
    user_id="synthetic-user",
    agent_id="synthetic-agent",
    request_id="request-1",
    tool_id="synthetic_action_v1",
    target_registry_ids=("synthetic-registry",),
    arguments_digest="arguments-digest",
    state_digest="state-revision-digest",
    policy_revision="policy-1",
    scope_revision="scope-1",
    provider_revision="provider-1",
    workflow_revision="workflow-1",
)
RULE = ActionRule(
    BINDING.tool_id, ActionRisk.LOW, frozenset(BINDING.target_registry_ids)
)


@pytest.mark.parametrize("risk", list(ActionRisk))
def test_explicit_classification(risk):
    rule = replace(RULE, risk=risk)
    if risk is ActionRisk.CRITICAL:
        with pytest.raises(ValueError, match="not authorized"):
            require_action_policy(BINDING, (rule,), authorized=True)
    else:
        assert require_action_policy(BINDING, (rule,), authorized=True) is risk


@pytest.mark.parametrize("rules", [(), (RULE, RULE), (replace(RULE, tool_id="other"),)])
def test_absent_ambiguous_unknown_policy_denied(rules):
    with pytest.raises(ValueError, match="not authorized"):
        require_action_policy(BINDING, rules, authorized=True)


@pytest.mark.parametrize(
    "changes",
    [
        {"user_id": ""},
        {"agent_id": None},
        {"request_id": "x" * 257},
        {"target_registry_ids": []},
        {"target_registry_ids": ()},
        {"target_registry_ids": ("synthetic-registry",) * 2},
        {"target_registry_ids": ("other-registry",)},
        {"target_registry_ids": (None,)},
        {"target_registry_ids": ("",)},
        {"target_registry_ids": ("x" * 257,)},
        {"target_registry_ids": tuple(str(i) for i in range(33))},
    ],
)
def test_invalid_or_unscoped_binding(changes):
    with pytest.raises(ValueError, match="not authorized"):
        require_action_policy(replace(BINDING, **changes), (RULE,), authorized=True)


@pytest.mark.parametrize("authorized", [False, None, 1, "true"])
def test_live_authorization_must_be_true(authorized):
    with pytest.raises(ValueError, match="not authorized"):
        require_action_policy(BINDING, (RULE,), authorized=authorized)


@pytest.mark.parametrize(
    "rule",
    [
        replace(RULE, risk="low"),
        replace(RULE, target_registry_ids=set()),
    ],
)
def test_rule_requires_closed_risk_and_immutable_scope(rule):
    with pytest.raises(ValueError, match="not authorized"):
        require_action_policy(BINDING, (rule,), authorized=True)


def test_bindings_do_not_repr_sensitive_values():
    assert "synthetic-user" not in repr(BINDING)
    assert "arguments-digest" not in repr(BINDING)
    assert "synthetic-registry" not in repr(RULE)
