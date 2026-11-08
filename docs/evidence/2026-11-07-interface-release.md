# Interface release 2026.11.07

## Scope

Frontend-only usability release against source base c3a3bd648d36ec6e0bfb522710df481c7002f97f.
No backend Python files, credentials, grants or storage schemas were changed.
The installed backend was preserved rather than overwritten by older source.
The manifest remains 0.1.0; the interface release is visible in its sidebar.

## Automated evidence

- npm run check: scripts check, ESLint, TypeScript, 457 browser tests in 26 files,
  Vite build, bundle sync and byte-identity verification passed.
- Final bundle: 290010 bytes; SHA-256
  97a77671436c1c26ed6d836a993fd255b6500b6c72f68eea0b8853ff2613d2a4.
- npm audit --omit=dev --audit-level=high: zero production vulnerabilities.
  Development dependency findings remain outside this release.
- Added tests cover onboarding readiness, explicit editor handoff, sample state
  and time events with no network calls, and refusal to invent condition values.
  Corrected an existing panel test's read-only light-catalog request expectation.

## Live evidence

Observed Core 2026.11.0, Frontend 20261028.4 on Home Assistant OS. Owner entered
the existing LM Studio token directly in Home Assistant; no token entered chat
or source. Setup discovered the configured local model and created its
conversation entity. Plain chat returned READY before and after interface reload.

The old multi-phone workflow had activation_failed and zero listeners. It was
disabled before integration reload and remains paused. No targets were altered.

A dedicated helper and lab workflow were created for an owner-approved single
handset notification. The workflow was saved disabled in execute mode. A supplied
sample off-to-on transition passed the dry run: 1 provider call, completed AI
composition, a planned notify-entity target and 0 executed actions.

After separate enablement it reported one active listener. Toggling the dedicated
helper on produced 1 observation, 1 completed execution, 1 provider call, 1
delivered notification and 0 failures. No physical device action was requested.
The lab workflow was then disabled and its helper returned off. Disabling resets
the temporary counters, so the live counters are not persistent audit evidence.
Handset receipt is separate owner evidence; an accepted notify call alone does
not prove receipt.

## Installation and rollback

The original panel was downloaded before replacement (271949 bytes, SHA-256
0939d312672973daee6dd821f5b5271f125ee8c411d37e899745f8247a00fadf).
The replacement is a single frontend/ai-orchestrator-panel.js file. The first
installed candidate was downloaded again and byte-matched. The final sample-event
candidate was downloaded separately and exactly matched the final 290010-byte
bundle and SHA-256 above. Reloading the available
integration entry activated the new interface without a full Core restart.
The final installed sample-event button was then exercised against the saved
disabled lab workflow. The resulting dry run completed with 1 local provider
call and 0 executed actions. Both saved workflows remained disabled.

Rollback restores that original bundle, reloads the entry and browser, and
checks chat again. No migration or backend replacement is needed.

## Limits

No full backend test suite was rerun on Core 2026.11.0. No physical light/switch,
complete voice pipeline, cloud inference/failover or broad compatibility claim.
Legacy September revision/test statements in the tracker are historical.
