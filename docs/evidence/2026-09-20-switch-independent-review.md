# AST-007 independent ordinary-switch review

Reviewer: `bedrock_completion`, independent of backend and UI implementation. No implementation files were changed by the reviewer.

## Boundary reviewed

Reviewed `switch_review.py`, action store migration/persistence, action manager review/grant/confirmation paths, action WebSocket handlers, HIGH switch audit enum additions, action client, permission/control UI, audit labels, and focused tests.

The backend excludes known grouped/template/critical-associated targets and requires real stable registry/device/configuration identity. This metadata does not establish physical safety: an administrator must explicitly attest to the physical target, single-device operation, and noncritical classification. Review records grant no actions. Separate scoped permissions and an exact HIGH-risk one-use confirmation are required before each switch operation. Review changes or revocation remove that target's switch grants and cancel outstanding proposals. Identity drift invalidates review at discovery/proposal/final dispatch. Private identity hashes are omitted from public profiles and content-free audit records.

The exact legacy action storage format migrates to v2 while dropping dormant switch grants. Unknown/corrupt storage is refused. The UI requires three initially unchecked attestations, displays the actual reviewed entity/device, keeps grants and confirmations separate, and clears tokens on session/provider/scope changes or expiration. Client parsers reject unreviewed switch targets/grants and incorrect risk metadata.

## Finding resolved

The first review found that preview expiration was checked before awaiting authentication but not afterward. A delayed authentication lookup could accept an expired preview. The implementer added a fresh monotonic expiration check after authentication and before persistence, plus a cancellation guard. Regression tests block authentication, advance the clock or suppress cancellation inside the dependency, and prove no review persists.

## Independent verification

Core 2026.9.3:

```sh
python -m pytest tests/quality/test_switch_review.py tests/home_assistant/test_switch_review.py tests/home_assistant/test_switch_review_api.py tests/home_assistant/test_action_store.py tests/home_assistant/test_action_manager.py tests/home_assistant/test_action_api.py tests/home_assistant/test_action_ai_api.py tests/quality/test_audit_schema.py -q
```

**255 passed in 17.53 seconds.** The switch review WebSocket roundtrip uses production command registration.

Frontend:

```sh
npx vitest run test/action-controls.browser.test.ts test/switch-review.browser.test.ts test/audit.browser.test.ts
```

**63 passed in 2.23 seconds.**

Approved for this bounded implementation, with no remaining blocking findings. This does not establish the physical safety of any live switch, authorize a target on the user's behalf, or claim live device operation. Exact frozen artifact and live acceptance gates remain separate.
