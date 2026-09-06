# Project tracker

Last updated: 2026-09-05
Overall state: **Phase 1 — local provider and onboarding MVP**
Current resume point: **LOC-006 local text chat is DONE: live generation, follow-up context, and New chat reset were verified against the owner's authenticated Core 2026.9.0 instance with an actual LM Studio reply observed. LOC-003 through LOC-005 and COMP-001 still need their own named live acceptance items (provider reload/unload/restart, desktop/Android rendering, catalogue mutation checks) recorded before they can move to DONE. Next action is LOC-007, the Phase 1 release gate, which depends on those remaining items plus DOC-001 (already DONE).**

Accepted candidate evidence: the August 29 clean Git-archive Linux gate recorded 340 full, 98 focused, 30 security/evidence/traceability, and 231 pure tests plus Ruff/canary. The frontend recorded 95 browser tests plus lint, typecheck, build, sync, and byte identity (75,409 bytes; SHA-256 `18f23c5e787ecce2bdb052ba1d1799a116a18f3833da70e6a481f423e6037450`). Both independent pre-live reviewers approved the candidate; evidence commit is `dc71eca6d5e8124c2d2101064d44e3269a5f9190`. These are historical gates, not September 5 test reruns. The Windows checkout's CRLF bundle differs physically; use the canonical Git archive for exact-artifact installation.

## Status rules

| Status | Meaning |
|---|---|
| `TODO` | Defined and ready once dependencies are satisfied |
| `IN PROGRESS` | Has one active owner and a stated next action |
| `NEEDS INPUT` | Requires user/environment evidence; the missing item is named |
| `BLOCKED` | Cannot proceed because a dependency failed or is unavailable |
| `REVIEW` | Implementation complete; independent verification pending |
| `DONE` | Acceptance criteria and evidence are recorded |

No task may move to `DONE` based only on an assertion.

## Active snapshot

| Field | Current value |
|---|---|
| Last completed | LOC-008 chat app-shell layout implemented after the owner's Android report: only the transcript scrolls, chrome stays fixed, density tightened, composer auto-grows/resets, new turns auto-scroll. 116 frontend tests (4 new), lint/typecheck/build/sync/identity, 234 backend pure tests, Ruff and canary all pass. Owner also confirmed Companion App Android rendering is otherwise fine. |
| Active work | LOC-008 live install and owner confirmation on desktop and Android; then LOC-007 Phase 1 release gate. |
| Evidence/input needed | LOC-008 needs owner confirmation that only the message area scrolls, the input stays usable with the on-screen keyboard open, and spacing now matches the rest of the UI. LOC-003 needs bounded timeout/cancellation reproduction. LOC-004 needs duplicate-click protection and transport-failure reproduction. LOC-005 needs removal/disable/unavailable/area-device-change checks. First isolated backup restore artifact remains due by 2027-02-23 or earlier after a major change. |
| Next gate | Install the 95,427-byte bundle (SHA-256 `d24d6b50…`) over the installed panel file, which is still the LOC-006 bundle `7b034887…`; two automated transfer paths failed and left nothing behind, so the owner should copy the single file via Samba/SSH/File-editor upload and verify the hash. Then hard refresh and confirm the four LOC-008 items on desktop and Android; reproduce bounded timeout/cancellation and duplicate-click protection; perform one disable/unavailable or area-change registry check; then run the LOC-007 quality/redaction/smoke gate. |
| Production code | Foundation, provider lifecycle/contract, authenticated LM Studio, provider setup/test UI, read-only catalogue, and bounded admin local text chat are implemented. Workflow execution, device actions, Assist, cloud providers and chat persistence remain planned. |
| Repository | Local `main` base remains `0596de456e8bd6e4e8663cc27f769d99b491ac96`; uncommitted LOC-006 source/tests/bundle and review/documentation changes are present. Reviewed canonical source fingerprint is `2dad75b07572b63adf5bd47fc2d1510c4b29993efc0dbd7e2860f46c23488dfd`. No remote publish performed. |

## Repository review and session handoff

| ID | Task | Owner/role | Status | Acceptance evidence / next action |
|---|---|---|---|---|
| REV-001 | Review repository purpose, implementation, remaining scope, and live acceptance resume point; open the browser for owner sign-in | Primary / tracker steward | `DONE` | Review and integrity results: `docs/evidence/2026-09-05-repository-review.md`. Owner supplied the URL; after Edge became unavailable, the selected Chrome browser opened an existing authenticated Home Assistant session. AI Orchestrator displayed successful authenticated status and provider connections available. Tab retained for the user; no credential entry or live configuration/action change. Next: LOC-003/004/005 environment revalidation and live acceptance. |
| DOC-001 | Reconcile README, installation guidance, product/architecture snapshots, and outdated panel copy with current accepted decisions and implemented behavior | Tracker steward + UI | `DONE` | README, installation, requirements, architecture and UI product plan reconciled; planned features separated from current preview. All 22 local Markdown links resolve; diff check passed. Panel copy is included in the 112-browser-test frontend gate. |
| COMP-001 | Validate the owner's now-installed Core 2026.9.0 and Frontend 20260826.4 | Primary / HA + test | `REVIEW` | About-page versions verified. Isolated full backend suite passes 378 tests on each Core 2026.8.3 and 2026.9.0; current helper 0.13.363. 2026-09-05: a full Core restart was performed on the live Core 2026.9.0 instance; Home Assistant's own "Home Assistant has started!" banner confirmed recovery, and the AI Orchestrator panel, provider connection, and chat generation all worked correctly immediately afterward. Companion App Android acceptance remains; no broad cross-Core compatibility range is claimed (DEC-023 still limits accepted scope to named versions). See LOC-003/004/006 September 5 evidence. |

## Phase 0 — foundation and architecture validation

| ID | Task | Owner/role | Status | Depends on | Acceptance evidence / next action |
|---|---|---|---|---|---|
| FND-001 | Record product requirements and boundaries | Primary | `DONE` | — | `docs/PRODUCT-REQUIREMENTS.md` |
| FND-002 | Record approved architecture | Primary | `DONE` | — | `docs/architecture/ARCHITECTURE.md` |
| FND-003 | Create durable tracker and resume protocol | Tracker steward | `DONE` | — | This file plus `AGENTS.md` |
| FND-004 | Validate Home Assistant and provider extension points | HA specialist | `DONE` | FND-002 | `docs/architecture/HA-PLATFORM-REVIEW.md`; findings reconciled into ADRs |
| FND-005 | Define complete UI/product behavior | UI specialist | `DONE` | FND-001 | `docs/product/UI-PRODUCT-PLAN.md`; unknowns UI-001 through UI-015 retained |
| FND-006 | Define test, release, and security gates | Test/security specialist | `DONE` | FND-001, FND-002 | `docs/quality/QUALITY-SECURITY-PLAN.md`; gates and stop-ship rules adopted |
| FND-007 | Gather Phase 0 live environment facts | User + HA specialist | `DONE` | — | ENV-001, ENV-003, ENV-004 discovery/action contract, Phase 0 ENV-007, ENV-009, and Phase 0 ENV-010 are resolved. `docs/evidence/2026-08-23-lm-studio-environment.md` records the authenticated, firewall-scoped same-subnet provider path. `docs/evidence/2026-08-23-home-assistant-backup.md` records the Recommended daily encrypted backup policy, first successful `87.89 MB` automatic backup to two locations, owner-confirmed off-system emergency-kit custody, and approved isolated restore cadence. Exact private identifiers and recovery material were withheld. First restore artifact due by 2027-02-23 or earlier after a major change |
| FND-008 | Create ADRs for implementation-sensitive choices | Primary + reviewers | `DONE` | FND-004, FND-005, FND-006 | Six initial records in `docs/architecture/adrs/`; provisional mechanisms have named validation gates |
| FND-009 | Define repository bootstrap and dependency policy | Primary + Backend/UI | `DONE` | FND-008 | `docs/architecture/REPOSITORY-BOOTSTRAP.md`; exact HA/Python/Node/package baseline, permanent domain, manual Phase 0 bundle, HACS boundary, and build/test commands independently reviewed 2026-08-22 |
| FND-010 | Phase 0 readiness review | Test/release | `DONE` | FND-007, FND-011 through FND-015 | Artifact `2af1077ecca4c894938efeddc0364aba5c7ca126`, candidate `0e72551c18177f72f75c37d9037e6a0bee557bb6`: workflow/safety approved `2026-08-24T06:35:08Z`; test/release approved `2026-08-24T06:39:04Z`. Clean Linux passed 120 full, 23 focused, and 88 pure tests; frontend 29, Ruff, canary, bundle identity, canonical hashes, and npm audit passed. Scope is exactly Core 2026.8.3 under DEC-023 |
| FND-011 | Prove bundled panel registration and compatibility boundary | HA + UI | `DONE` | FND-015, ENV-001 | Current-version Core 2026.8.3 lifecycle matrix is confirmed in `docs/evidence/2026-08-23-fnd-011-panel-lifecycle.md`, including Companion App Android. DEC-023 defers real cross-Core upgrade evidence; no other Core version is claimed, and the matrix must reopen before such a claim |
| FND-012 | Prove restricted workflow lifecycle | HA + workflow | `DONE` | FND-015 | Committed revision `8994784ce4b3ad8d0368185e031cc57e233aae8f`: Linux full suite 113 passed; focused lifecycle suite 22 passed; frontend 29 passed; independent workflow/safety review approved. Project-owner live result on the named target was execution `1` initially, `2` after reload, and `1` after full restart; Home remained healthy and the log search showed no issue. Independent clean-source test/release review approved 2026-08-23T17:13:05Z. Manifest: `docs/evidence/manifests/FND-012/FND-012-WORKFLOW-LIFECYCLE-001.json`. |
| FND-013 | Define data-flow and control-to-test traceability records | Security + tracker | `DONE` | FND-007 | Artifact `a7495b08c42c395cb15f6a30fb4956d38b091b53`, candidate `1c353554ad25eec4c424d122dc78cb728473c638`: 7 data classes, 13 nodes, 18 flows, 19 requirements, 19 controls, 23 tests; exact readable/catalog mapping guarded for all requirements. Workflow/safety approved `2026-08-24T06:14:09Z`; test/release approved `2026-08-24T06:15:36Z`. Clean Linux: 23 focused-plus-schema and 88 pure tests passed; Ruff/canary/diff/privacy/hash checks passed |
| FND-014 | Establish redacted evidence conventions and fake-provider fixture schema | Primary + Test/release | `DONE` | FND-009 | Independent review approved; 35-test current-tree verification passed; acceptance manifest: `docs/evidence/manifests/FND-014/FND-014-FIXTURE-HARNESS-001.json`. Runtime zero-network and repeatability proof belongs to FND-015. |
| FND-015 | Bootstrap evidence-producing integration/panel skeleton | Backend + UI | `DONE` | FND-009, FND-014 | Independent test/release review approved clean source revision `7de030a1b8c7c6f337f13dce404b862df9363dd8`: Linux full suite 102 passed; pure Windows suite 81 passed; frontend browser suite 16 passed; dependency audit, bundle identity, canary, format, and lint checks passed. Acceptance manifest: `docs/evidence/manifests/FND-015/FND-015-FOUNDATION-SKELETON-001.json`. |

## Phase 1 — local provider and onboarding MVP

| ID | Task | Status | Depends on | Required evidence |
|---|---|---|---|---|
| LOC-001 | Complete local provider connection lifecycle on the validated skeleton | `DONE` | FND-010, LOC-002 | Artifact `7921806f9e47ea83f2ae7a7707aeba0dc1a31c22`, candidate `b13c1d6724e431ce88a7d0aee1c55d1592c53a35`: workflow/safety approved `2026-08-24T17:47:35Z`; test/release approved `2026-08-24T17:48:22Z`. Clean Linux passed 259 full, 70 focused lifecycle, 138 provider, 30 security/evidence/traceability, and 168 pure tests; Ruff, canary, hashes, schema, traceability, and diff passed. Evidence: `docs/evidence/2026-08-24-loc-001-provider-entry-lifecycle.md`. |
| LOC-002 | Define provider contract and normalized errors/capabilities | `DONE` | FND-008 | Artifact `eff9e40c07842b96a04cd73e57c938212b1eedf4`, candidate `e8787b36ffc5af4525963ec55dda06e732188ad7`: workflow/safety approved `2026-08-24T07:39:29Z`; test/release approved `2026-08-24T07:41:11Z`. Clean Linux passed 198 full, 136 provider, 30 security/evidence/traceability, 166 pure, and six explicit remediation tests; Ruff, canary, schema, fixture-count, canonical-hash, Git, clean-tree, and sensitive-data checks passed. `CTRL-PROVIDER-001` remains design-only and `TEST-PROVIDER-CONTRACT` planned until every live adapter passes. Evidence: `docs/evidence/2026-08-24-loc-002-provider-contract.md` |
| LOC-003 | Add authenticated LM Studio/OpenAI-compatible adapter | `REVIEW` | LOC-001, LOC-002, ENV-003 | Exact candidate `989917fd4229f528c142a9ecebeeea3934c394da` validates historical tool arguments before serialization, rejects noncanonical JSON with zero network requests, and has both independent pre-live approvals. Shared exact-source gates: 340 full, 98 focused, 30 security/evidence/traceability, 231 pure, Ruff/canary. 2026-09-05 live testing verified config-entry reload, a full Home Assistant Core restart (with the native "Home Assistant has started!" recovery banner), correct post-reset `not_tested` state after both, subsequent passing connection tests, and clean scoped logs; the owner separately reported Companion App Android rendering as fine. Only bounded timeout/cancellation reproduction remains. Evidence: `docs/evidence/2026-08-24-loc-003-lm-studio-adapter.md`; manifest `LOC-003-LM-STUDIO-ADAPTER-002.json`. |
| LOC-004 | Add provider setup/test UI | `REVIEW` | LOC-001, LOC-002 | Exact candidate `989917fd4229f528c142a9ecebeeea3934c394da` reports `not_tested` until an explicit timestamped observation, preserves evidenced health on Home Assistant transport failure, fails closed on malformed adapter outcomes, and prevents late in-flight tests from crossing unload/reload ownership. Both independent pre-live reviewers approved it. Frontend passes 95 tests and byte identity. 2026-09-05 live testing confirmed runtime-reset semantics across both a config-entry reload and a full Core restart (no stale `healthy` after either), passing re-tests, correct desktop (1400x900) and narrow-viewport (390x844, no horizontal overflow) rendering, and clean scoped logs; the owner separately reported Companion App Android rendering as fine. Only duplicate-click protection and transport-failure reproduction remain. Evidence: `docs/evidence/2026-08-25-loc-004-provider-ui.md`; manifest `LOC-004-PROVIDER-UI-002.json`. |
| LOC-005 | Add read-only entity/area/device catalog | `REVIEW` | LOC-001 | Exact candidate `989917fd4229f528c142a9ecebeeea3934c394da` provides stable registry identity, effective area/device relationships, availability, integration/domain metadata, search, responsive layout, explicit `AI access: none`, and strict privacy omissions. Both independent pre-live reviewers found no action, state-value, secret, or authorization regression. 2026-09-05 live testing recorded a redacted inventory of 2,193 entities / 173 devices / 19 areas, live domain-prefix search filtering, a stable-count refresh, clean desktop/narrow-viewport rendering with no console errors, and (with owner approval) a real reversible entity rename that the catalogue correctly reflected, then correctly reflected again after revert; the owner separately reported Companion App Android rendering as fine. Only removal/disable/unavailable/area-device-change checks remain. Evidence: `docs/evidence/2026-08-27-loc-005-registry-catalog.md`, `docs/evidence/2026-08-28-loc-005-read-only-catalog.md`; manifest `LOC-005-REGISTRY-CATALOG-002.json`. |
| LOC-006 | Add read-only panel chat | `DONE` | LOC-003, LOC-005 | Implemented local-only admin text chat, bounded session history, static failures, concurrency/replay guards and no HA context/tools/actions/cloud. 378 backend tests pass on each named Core; 112 frontend tests plus build/sync/identity; independent review approved exact source fingerprint and 91,291-byte bundle. Live acceptance observed against Core 2026.9.0: actual reply, context-bearing follow-up, New chat reset, provider test, catalogue health, and clean scoped logs. Evidence: `docs/evidence/2026-09-05-loc-006-local-chat.md`. |
| LOC-008 | Fix chat layout: app-shell scrolling and Home Assistant-consistent density | `REVIEW` | LOC-006 | Owner reported that on mobile the whole chat page scrolled instead of only the message area, and that desktop spacing was too loose versus the rest of the app. The chat view is now an app shell: the panel host is sized to the space Home Assistant actually gives it, the section header/provider controls/composer stay fixed, and only the transcript scrolls. Density was tightened, the composer auto-grows and resets, new turns auto-scroll into view, and the privacy text collapses into a disclosure whose destination line stays visible. Frontend passes 116 browser tests (4 new layout regressions), lint, typecheck, build, sync and byte identity; bundle is 95,427 bytes, SHA-256 `d24d6b50aa09cf805822f7ec06af94bfdd84813c153e700d328003701677dce2`. Live install and owner confirmation on desktop and Companion App Android remain. Evidence: `docs/evidence/2026-09-05-loc-008-chat-layout.md`. |
| LOC-007 | Phase 1 release gate | `TODO` | LOC-003 through LOC-006, LOC-008, DOC-001 | Quality gate, redaction check, Home Assistant Green smoke test |

## Phase 2 — AI notification workflows

| ID | Task | Status | Depends on | Required evidence |
|---|---|---|---|---|
| WFL-001 | Implement versioned workflow schema and migrations | `TODO` | LOC-007 | Schema tests and migration fixtures |
| WFL-002 | Implement curated deterministic triggers and conditions | `TODO` | WFL-001 | Trigger/condition and restart tests |
| WFL-003 | Implement compose/classify/extract/branch AI steps | `TODO` | WFL-001, LOC-002 | Structured-output and malformed-output tests |
| WFL-004 | Discover notification and media actions | `TODO` | LOC-005 | Real registry schema validation; no invented action fields |
| WFL-005 | Build visual workflow studio | `TODO` | WFL-001 through WFL-004 | UI tests and accessibility review |
| WFL-006 | Implement side-effect-free dry run and context preview | `TODO` | WFL-003, WFL-005 | Proof no Home Assistant action executes in dry-run mode |
| WFL-007 | Recreate the confirmed window-to-Echo use case without YAML | `TODO` | WFL-004 through WFL-006, ENV-004 | Live trace with user-provided entity/action targets |
| WFL-008 | Phase 2 release gate | `TODO` | WFL-007 | Independent end-to-end and restart verification |

## Phase 3 — safe actions, chat, and Assist

| ID | Task | Status | Depends on | Required evidence |
|---|---|---|---|---|
| AST-001 | Add conversation entity and Assist pipeline support | `TODO` | WFL-008 | Text and selected voice pipeline tests |
| AST-002 | Add per-agent observation/action scopes | `TODO` | AST-001 | Unauthorized target tests |
| AST-003 | Add bounded tool-call loop and schema validation | `TODO` | AST-002 | Hallucinated/malformed/loop-limit tests |
| AST-004 | Add risk classification and one-time confirmations | `TODO` | AST-003, ENV-005 | Replay, expiry, and changed-state tests |
| AST-005 | Add explainable chat/action trace | `TODO` | AST-003 | Redacted trace verification |
| AST-006 | Phase 3 release gate | `TODO` | AST-001 through AST-005 | Independent voice/chat/action safety verification |

## Phase 4 — Azure, Bedrock, and routing

| ID | Task | Status | Depends on | Required evidence |
|---|---|---|---|---|
| CLD-001 | Add Microsoft Foundry/Azure OpenAI adapter | `TODO` | LOC-002, ENV-006 | Official API contract tests plus user-authorized live test |
| CLD-002 | Add AWS Bedrock Converse adapter | `TODO` | LOC-002, ENV-006 | Official SDK/API contract tests plus user-authorized live test |
| CLD-003 | Add named routing/privacy policies | `TODO` | CLD-001, CLD-002 | Policy matrix tests |
| CLD-004 | Add health, circuit breaker, and safe failover | `TODO` | CLD-003 | Chaos tests; no replay after side effects |
| CLD-005 | Add usage/latency reporting without sensitive content | `TODO` | CLD-001, CLD-002 | Redaction and accounting tests |
| CLD-006 | Phase 4 release gate | `TODO` | CLD-003 through CLD-005 | Local-only and opt-in cloud routes verified |

## Phase 5 — security/event workflows and hardening

| ID | Task | Status | Depends on | Required evidence |
|---|---|---|---|---|
| SEC-001 | Add deterministic security-event templates | `TODO` | CLD-006 | Primary alert works with all AI providers offline |
| SEC-002 | Add optional constrained enrichment/classification | `TODO` | SEC-001 | Uncertain/malformed/offline paths verified |
| SEC-003 | Add repairs, backup/restore, and bounded audit retention | `TODO` | CLD-006 | Restore and migration test |
| SEC-004 | Complete threat-model and prompt-injection suite | `TODO` | SEC-001, SEC-002 | Independent security report |
| SEC-005 | Daily-use release gate | `TODO` | SEC-003, SEC-004 | User acceptance plus documented rollback |

## Resume protocol

Before stopping work, update these four items:

1. `Last completed` in the active snapshot.
2. Every active task's real status and evidence.
3. The exact current blocker or missing fact.
4. `Current resume point` at the top of this file.

When resuming, start at the resume point and inspect the linked evidence before creating new tasks.
