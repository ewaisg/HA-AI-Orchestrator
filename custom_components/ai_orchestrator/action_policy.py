"""Pure deny-default action policy; no action catalog or executor is installed."""

from dataclasses import dataclass, field
from enum import StrEnum


class ActionRisk(StrEnum):
    """Explicit product classifications, never inferred from model output."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True)
class ActionRule:
    """Trusted reviewed tool policy, not a model-supplied permission."""

    tool_id: str
    risk: ActionRisk
    target_registry_ids: frozenset[str] = field(repr=False)


@dataclass(frozen=True)
class ActionBinding:
    """Exact server-built invocation/preconditions; opaque fields are digests.

    The integration must schema-validate arguments, construct canonical digests,
    resolve current registry identities, and re-read HA permissions/state before
    consuming approval. Include a state revision to reject changed-then-restored
    state. Revision strings must change on every policy/provider/scope edit.
    No field may be accepted as an authoritative value from model/browser input.
    """

    user_id: str = field(repr=False)
    agent_id: str = field(repr=False)
    request_id: str = field(repr=False)
    tool_id: str
    target_registry_ids: tuple[str, ...] = field(repr=False)
    arguments_digest: str = field(repr=False)
    state_digest: str = field(repr=False)
    policy_revision: str = field(repr=False)
    scope_revision: str = field(repr=False)
    provider_revision: str = field(repr=False)
    workflow_revision: str = field(repr=False)


def require_action_policy(
    binding: ActionBinding,
    rules: tuple[ActionRule, ...],
    *,
    authorized: bool,
) -> ActionRisk:
    """Require exact explicit policy and live authorization; critical is denied."""
    text_fields = (
        binding.user_id,
        binding.agent_id,
        binding.request_id,
        binding.tool_id,
        binding.arguments_digest,
        binding.state_digest,
        binding.policy_revision,
        binding.scope_revision,
        binding.provider_revision,
        binding.workflow_revision,
    )
    targets = binding.target_registry_ids
    if (
        authorized is not True
        or any(
            type(value) is not str or not value or len(value) > 256
            for value in text_fields
        )
        or type(targets) is not tuple
        or not 1 <= len(targets) <= 32
        or any(
            type(value) is not str or not value or len(value) > 256 for value in targets
        )
        or len(set(targets)) != len(targets)
    ):
        raise ValueError("Action is not authorized")
    matching = [rule for rule in rules if rule.tool_id == binding.tool_id]
    if len(matching) != 1:
        raise ValueError("Action is not authorized")
    rule = matching[0]
    if (
        type(rule.risk) is not ActionRisk
        or rule.risk is ActionRisk.CRITICAL
        or type(rule.target_registry_ids) is not frozenset
        or not set(targets).issubset(rule.target_registry_ids)
    ):
        raise ValueError("Action is not authorized")
    return rule.risk
