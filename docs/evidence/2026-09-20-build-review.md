# September 20 build review

Base: `main@5112bd0`. Working source is changing during this session; the
following intermediate results are not an exact-artifact release gate.

## Verified results

- REV-002: three new lifecycle regressions failed on the original code. Repaired
  observer/manager/execution/conversation focused run: 63 passed on Core
  2026.9.2. Independent review found a further foundation-manager replacement
  race, subsequently repaired. Publication receipts are being independently
  reviewed for provider reconfiguration and notification target identity.
- CLD-001: 259 provider tests, including 55 Azure tests, passed on Core
  2026.9.2. Independent reviewer also ran 92 HA lifecycle/config/chat/Assist
  tests. All 16 extracted codec functions matched the previous LM Studio code.
  Approved only for the offline, endpoint-test-only boundary; no live cloud
  account was contacted. Microsoft REST chat/models documents were checked.
- AST-002: original 39 policy tests passed on Core 2026.8.3, 2026.9.0 and
  2026.9.2. Independent review found cancelled-revocation and cached-store
  ownership bugs. Fixes passed 43 focused tests on 2026.9.2 and were re-reviewed.
- Integrated intermediate backend snapshot: 842 passed, 1 failed on Core
  2026.9.2. The failure was the setup test expecting a single shared HTTP-session
  acquisition. Setup now obtains the shared session once; rerun still needed.
- Frontend `npm --prefix frontend run check`: 265 browser tests passed, lint,
  typecheck, build, sync and identity check passed. Intermediate bundle 179,491
  bytes, SHA-256 `3b82d53d50c4b6895ccdcc0259c16301fbf1bf5f9b81cdc3987e90e9a8136717`.
  Session replacement/disconnect and stale-save regressions are included.

## Live evidence and remaining input

The live About page subsequently reports Core **2026.9.3**, Supervisor
2026.09.2, OS 18.3 and Frontend 20260826.7. COMP-001 is reopened for this named
Core; a fourth isolated test environment is being prepared. Historical Core
2026.9.2 success is not acceptance of 2026.9.3.

The existing Chrome session authenticated to the owner-supplied HA URL.
The panel returned foundation/provider availability and conversation unavailable.
This confirms access, not installation of the new build. No new live install,
scope grant, cloud configuration or household notification has occurred yet.

ENV-004 needs the owner's exact window and notification destination. ENV-005
needs the action-policy decision. ENV-006 needs cloud account/deployment facts.
Questions are pending; no targets, model capabilities or account identifiers
have been invented. AST-001 pipeline/voice selection remains owner-dependent.

## New user behavior

Entities & Permissions can save bounded local-agent observation policies.
The initial policy permits only numeric sensors and on/off entities in selected
domains, excludes sensitive classes, and returns no attributes. This is a
conservative implementation limit, not a claim that HA assigns those classes
an inherent security level. Actions remain denied. AST-003 is adding an explicit
synthetic tool probe before any scoped question can read household state.

Execute workflows require a successful dry run before activation. Unreviewed
legacy execute records stay inactive. A receipt-bearing workflow store requires
its corresponding storage backup when rolling back to older integration code;
the old code does not understand the added receipt field.

## Remaining gate

Finish independent review fixes, run all final source checks, package with a
matching storage rollback, install through the authenticated HA environment,
then perform the live checks for which target and pipeline authorization exist.
Do not mark the overall project or phase gates complete from these intermediate
results.

## Frozen r12 gate and installation blocker

Exact archive: `outputs/r12/ai-orchestrator-r12.zip`, 37 integration files,
SHA-256 `68dd6a5540a820a8521c94b5e1e17e2ab83f74b63583a7188ea03e6907507cd0`.
Canonical source TAR SHA-256
`0b37b40e05fd35ca15e89d298d896fcea41af357ad0e52790d0f37966e65bdc8`.
Bundle 184,595 bytes, SHA-256
`16a262d2e736d115a867a12a149a608f16822fc71fa0eb6f8e083f581d42be21`.
Bedrock work is explicitly excluded from this candidate.

The independent final run of the extracted archive passed **927 tests on
Core 2026.9.3**, helper 0.13.366; dependency check clean. Evidence files are in
`artifacts/r12/core-2026.9.3/`. Final frontend gate passed **267 browser tests**,
lint/typecheck/build/sync/identity. Windows pure tests passed **492** after
giving the oversized-response test a bounded parameter ID. Ruff and diff checks
passed after canonical LF normalization. Three older named Cores have focused
evidence only for the new modules; no final full-r12 cross-Core claim is made.

AST-003 has an explicit synthetic tool probe, one state-only versioned tool,
per-transmission user/scope/provider-config guards, 4 rounds/4 tool calls/60s
and character bounds, and content-free trace markers. There is no token quota
enforcement and no action executor. Independent engine/API/UI reviews and the
final publication/fingerprint review found no remaining blocking defect.
Legacy service notification receipts intentionally expire on HA restart or
service re-registration; stable notify entity receipts bind their registry ID.

The installer was exercised in an isolated local fixture: all 37 code files,
bundle identity, legacy file preservation, and workflow storage backup passed.
The actual Home Assistant filesystem has NOT been changed by the installer.
The upload form was opened at the verified integration directory. Chrome's
file chooser returned `Not allowed`; Windows Computer Use then stopped with:
“could not determine the current browser URL on Windows with enough confidence
to enforce policy.” Device interaction stopped. This is an automation blocker,
not a Home Assistant installation failure or a successful upload.

Resume: use owner assistance or a supported browser session to select the ZIP
and installer, run the matching installer with its code/storage backup, restart
Core, verify the new panel/Assist/synthetic probe, then obtain explicit target
selection before granting observation scope or sending household notifications.

CLD-002 stopped at an explicitly unfinished offline draft, outside r12. Ruff
passed; pinned SDK 1.42.97 first run was 32 passed / 8 failed. Next fix: boto
clients need explicit `close()` in `finally`, and the cancellation test must
replace HA's synchronous executor stub with a real executor. No SDK dependency,
adapter registration, AWS account configuration or live request was added to
r12. Full project completion remains pending, including device-action policy,
cloud routing, security workflows and release gates.
