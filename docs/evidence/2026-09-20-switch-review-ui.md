# AST-007 reviewed switch UI

Frontend ownership: action-client.ts, action-controls-view.ts, existing action
browser fixtures, new switch-review.browser.test.ts. Root additionally authorized
the closed switch/HIGH enum additions in audit-client.ts, audit-view.ts labels
and matching audit tests. Frozen r15 remains unchanged.

The version-two action client validates review metadata, candidate status,
catalogue identity and HIGH switch risk. Unreviewed switch targets and grants
are rejected. Review preview binds the displayed entity/device identity and
revision. Save sends the closed classification only after three separately
unchecked physical-target/single-device/noncritical attestations. The response
must remove both target switch grants and preserve unrelated grants/reviews.
Revocation is separate and remains available for missing/blocked stored targets.

The permissions UI never grants or dispatches while reviewing a switch. Once a
review is saved, the administrator must select and save separate action grants;
the existing proposal and one-time human confirmation still apply. Candidate
selection, session/provider change, disconnect and token expiry clear pending
attestations. Late responses are discarded and failures use static text.

Verification on 2026-09-20:

- Complete npm run check passed: 379 browser tests across 22 files, scripts,
  lint, typecheck, build, sync and byte identity.
- Bundle: 246218 bytes, SHA-256
  9c7f55b5b05ff2298a7922e10e150c86e05d1f7fbe6e3dbf21462335e0defe27.
- Tests include no implicit grants/confirmation, partial attestation disabled,
  malformed or expanded v2 payloads, altered review identity, HIGH-only risk,
  revocation of both grants, stale-session discard, missing-target revocation,
  390px fit and axe accessibility checks.
- Owned-file git diff --check passed.

Independent review requested from bedrock_completion. No physical switch was
reviewed, granted or operated in the live household by this implementation task.
