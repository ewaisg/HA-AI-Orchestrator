# Project tracker

Last updated: 2026-08-22
Overall state: **Phase 0 — foundation and architecture validation**
Current resume point: **Continue claimed FND-015: build the Home Assistant config-entry/admin-WebSocket/fake-provider skeleton and the bundled Lit panel shell, then run pure tests plus frontend build checks. Home Assistant lifecycle acceptance still needs the recorded Linux or approved live-instance path. Live LM Studio ENV-003 remains a separate later review; ENV-004, ENV-009, and ENV-010 remain Phase 0 readiness evidence gates.**

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
| Last completed | FND-014 evidence/fixture harness independently approved; manifest `docs/evidence/manifests/FND-014/FND-014-FIXTURE-HARNESS-001.json` records the clean source revision and checks |
| Active work | FND-015 evidence-producing Home Assistant integration, fake-provider runtime, and Lit panel skeleton |
| Evidence/input needed | Exact window/Echo entity and action identifiers; later LM Studio non-secret settings; ENV-011 only before HACS distribution; and, before FND-010, ENV-009 privacy/retention choices plus remaining ENV-010 backup/network evidence |
| Next gate | Phase 0 architecture/repository readiness review |
| Production code | FND-015 bootstrap started; provider/backend, Home Assistant, and UI work is split across non-overlapping paths |
| Repository | Local Git repository on `codex/foundation-skeleton`; no remote configured |

## Phase 0 — foundation and architecture validation

| ID | Task | Owner/role | Status | Depends on | Acceptance evidence / next action |
|---|---|---|---|---|---|
| FND-001 | Record product requirements and boundaries | Primary | `DONE` | — | `docs/PRODUCT-REQUIREMENTS.md` |
| FND-002 | Record approved architecture | Primary | `DONE` | — | `docs/architecture/ARCHITECTURE.md` |
| FND-003 | Create durable tracker and resume protocol | Tracker steward | `DONE` | — | This file plus `AGENTS.md` |
| FND-004 | Validate Home Assistant and provider extension points | HA specialist | `DONE` | FND-002 | `docs/architecture/HA-PLATFORM-REVIEW.md`; findings reconciled into ADRs |
| FND-005 | Define complete UI/product behavior | UI specialist | `DONE` | FND-001 | `docs/product/UI-PRODUCT-PLAN.md`; unknowns UI-001 through UI-015 retained |
| FND-006 | Define test, release, and security gates | Test/security specialist | `DONE` | FND-001, FND-002 | `docs/quality/QUALITY-SECURITY-PLAN.md`; gates and stop-ship rules adopted |
| FND-007 | Gather Phase 0 live environment facts | User + HA specialist | `IN PROGRESS` | — | ENV-001 and Phase 0 ENV-007 resolved; ENV-002, ENV-004, and ENV-010 partially resolved in `docs/evidence/2026-08-22-home-assistant-environment.md`. Next: exact window/Echo IDs/action schema, later LM Studio review, and remaining readiness policy/network facts |
| FND-008 | Create ADRs for implementation-sensitive choices | Primary + reviewers | `DONE` | FND-004, FND-005, FND-006 | Six initial records in `docs/architecture/adrs/`; provisional mechanisms have named validation gates |
| FND-009 | Define repository bootstrap and dependency policy | Primary + Backend/UI | `DONE` | FND-008 | `docs/architecture/REPOSITORY-BOOTSTRAP.md`; exact HA/Python/Node/package baseline, permanent domain, manual Phase 0 bundle, HACS boundary, and build/test commands independently reviewed 2026-08-22 |
| FND-010 | Phase 0 readiness review | Test/release | `TODO` | FND-007, FND-011 through FND-015 | Independent checklist; no unresolved implementation-critical unknowns |
| FND-011 | Prove bundled panel registration and compatibility boundary | HA + UI | `TODO` | FND-015, ENV-001 | Desktop/mobile load, unload/reload, cache, upgrade, and fallback evidence |
| FND-012 | Prove restricted workflow lifecycle | HA + workflow | `TODO` | FND-015 | One harmless no-side-effect workflow across reload/restart with no duplicate trigger; any live-host gate uses only the relevant approved environment evidence |
| FND-013 | Define data-flow and control-to-test traceability records | Security + tracker | `TODO` | FND-007 | Redacted data-flow map and requirement/control/test IDs |
| FND-014 | Establish redacted evidence conventions and fake-provider fixture schema | Primary + Test/release | `DONE` | FND-009 | Independent review approved; 35-test current-tree verification passed; acceptance manifest: `docs/evidence/manifests/FND-014/FND-014-FIXTURE-HARNESS-001.json`. Runtime zero-network and repeatability proof belongs to FND-015. |
| FND-015 | Bootstrap evidence-producing integration/panel skeleton | Backend + UI | `IN PROGRESS` | FND-009, FND-014 | Claimed 2026-08-22. Expected files: `custom_components/ai_orchestrator/**`, `frontend/**`, sync/verification scripts, and bounded tests. Verification: deterministic fake-provider repeatability/no-network proof, admin-only WebSocket/config-entry tests, frontend check/build/bundle identity, redaction/canary checks, and HA lifecycle evidence on an approved Linux or live-instance path. |

## Phase 1 — local provider and onboarding MVP

| ID | Task | Status | Depends on | Required evidence |
|---|---|---|---|---|
| LOC-001 | Complete local provider connection lifecycle on the validated skeleton | `TODO` | FND-010 | HA integration tests and live dev-instance setup/reload/reauthentication |
| LOC-002 | Define provider contract and normalized errors/capabilities | `TODO` | FND-008 | Contract tests with fake providers |
| LOC-003 | Add authenticated LM Studio/OpenAI-compatible adapter | `TODO` | LOC-001, LOC-002, ENV-003 | Redacted real connectivity test plus failure tests |
| LOC-004 | Add provider setup/test UI | `TODO` | LOC-001, LOC-002 | Frontend tests and setup recording/screenshots |
| LOC-005 | Add read-only entity/area/device catalog | `TODO` | LOC-001 | Registry-change and rename tests |
| LOC-006 | Add read-only panel chat | `TODO` | LOC-003, LOC-005 | Streaming/non-streaming tests and tool access proven absent |
| LOC-007 | Phase 1 release gate | `TODO` | LOC-003 through LOC-006 | Quality gate, redaction check, Home Assistant Green smoke test |

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
