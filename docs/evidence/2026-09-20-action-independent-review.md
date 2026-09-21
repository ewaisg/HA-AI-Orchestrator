# AST-004 action integration independent review

Reviewed `action_store.py`, `action_manager.py`, `action_api.py`, the earlier
policy/confirmation primitives, and associated tests on 2026-09-20. The bounded
human-confirmed light/media action path has no remaining blocking finding after
the fixes below. This is source/test approval, not live device acceptance.

## Findings resolved

- Generic switch grants cannot classify critical/security/life-safety power
  targets. Switch resolution now denies every target until a separate reviewed
  classification policy exists, including injected persisted switch grants.
- Grouped media commands could affect unselected targets. Group-backed entities,
  entity lists and multi-member/invalid `group_members` are rejected.
- Replacing a service registration under the same name could change the operation
  after approval. Proposals retain its exact registration object and confirmation
  checks identity immediately before constructing the fresh binding.
- Foundation restart retained a stopped manager. `async_start` now waits for old
  dispatch ownership to settle, fails closed when it cannot, and never restores
  old tokens.
- A service swallowing cancellation could report success after timeout/unload.
  Completion now checks cancellation, stop state and the timeout object's expired
  state; uncertain effects report `unknown` and are never retried.
- Initial manager tests failed before exercising behavior because of fixture
  setup. The corrected harness and added actual WebSocket authorization tests run
  successfully. Failed/cancelled grant writes now have explicit regression tests.

## Verified boundary

Grant storage is separate from observation grants, closed, bounded, revisioned,
serialized and fail-closed on corrupt or uncertain durable state. Every proposal
and confirmation rechecks the actual active administrator and HA read/control
permission. Registry identity, current state/attributes/revision, selected local
provider identity/configuration, exact arguments and action scope bind approval.
Unknown tools and target-wide or arbitrary action arguments are unavailable.
Confirmation burns once before one target-bound HA service call carrying the
initiating user Context. Duplicate proposals/confirmations and foreign tokens
cannot replay that dispatch.

Independent Core 2026.9.3 command:
`pytest tests/home_assistant/test_action_store.py
tests/home_assistant/test_action_manager.py tests/home_assistant/test_action_api.py -q`
reported **65 passed in 3.85s**. Earlier independent primitive run reported
**52 passed in 1.27s**. All targets and calls were synthetic test fixtures.

The browser approval interaction, model-to-proposal interpretation endpoint,
exact release artifact gate and real device effects require their own verification.
This review does not approve critical actions, generic service execution,
persistent action replay, or autonomous execution without human confirmation.

## Model interpretation follow-up

Independently reviewed `action_ai_api.py` and its transport tests. The model
receives only the explicit request and permitted target metadata, with closed
typed tools generated from saved scopes intersected with the live catalog. It
must return exactly one validated tool call; arbitrary or multiple calls and
claimed execution text are refused. The returned object is a proposal requiring
the separate authenticated human confirmation path, never a service dispatch.

Two review findings were fixed before approval: a provider swallowing timeout
cancellation could otherwise escape the deadline check; and provider replacement
during the proposal's asynchronous permission lookup could return a stale token.
The endpoint now checks timeout expiration explicitly and rechecks provider and
foundation ownership after proposal creation, revoking a stale proposal.

Independent Core 2026.9.3 run of
`pytest tests/home_assistant/test_action_ai_api.py -q`: **11 passed in 1.83s**,
including both new regression tests. No remaining blocking finding for this
bounded local model-to-proposal API. Live model tool compatibility and the
browser approval interaction remain separate acceptance evidence.
