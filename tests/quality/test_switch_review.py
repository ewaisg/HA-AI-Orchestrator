"""Closed persisted classification and explicit attestation validation."""

from copy import deepcopy
from uuid import uuid4

import pytest

from custom_components.ai_orchestrator.agent_store import AgentPolicyError
from custom_components.ai_orchestrator.switch_review import (
    ATTESTATIONS,
    attestations,
    reviews,
)


def valid_review():
    return {
        "registry_id": "synthetic",
        "classification": "ordinary_noncritical",
        "review_id": str(uuid4()),
        "reviewed_at": "2026-09-20T00:00:00+00:00",
        "identity_digest": "a" * 64,
    }


@pytest.mark.parametrize(
    "change",
    [
        {"classification": "critical"},
        {"review_id": "not-uuid"},
        {"identity_digest": "x" * 64},
        {"reviewed_at": "2026-09-20T00:00:00"},
        {"reviewed_at": "2026-09-20T00:00:00Z"},
        {"registry_id": ""},
        {"extra": True},
        {"reviewed_at": 1},
        {"review_id": None},
        {"identity_digest": None},
    ],
)
def test_review_schema_rejects_unsafe_values(change):
    with pytest.raises(AgentPolicyError):
        reviews([{**valid_review(), **change}])


@pytest.mark.parametrize("raw", [None, {}, [None], [{}] * 65])
def test_review_schema_rejects_wrong_collection(raw):
    with pytest.raises(AgentPolicyError):
        reviews(raw)


def test_review_detached_and_unique():
    raw = [valid_review()]
    expected = deepcopy(raw)
    parsed = reviews(raw)
    parsed[0]["classification"] = "changed"
    assert raw == expected
    with pytest.raises(AgentPolicyError):
        reviews(raw * 2)


@pytest.mark.parametrize(
    "raw",
    [
        None,
        {},
        {"single_device": True},
        dict.fromkeys(ATTESTATIONS, 1),
        dict.fromkeys(ATTESTATIONS, "true"),
        {**dict.fromkeys(ATTESTATIONS, True), "extra": True},
    ],
)
def test_attestation_never_coerces_truthy_values(raw):
    with pytest.raises(AgentPolicyError):
        attestations(raw)


def test_exact_attestations_accepted():
    attestations(dict.fromkeys(ATTESTATIONS, True))
