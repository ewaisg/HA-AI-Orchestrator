# Project tracker

Last updated: 2026-08-24
Overall state: **Phase 1 — local provider and onboarding MVP**
Current resume point: **LOC-003 synthetic implementation is working-tree complete: built-in LM Studio registration, exact private-LAN config and SSRF boundary, Home Assistant shared async session, authenticated `/v1/models` and `/v1/chat/completions`, disabled redirects, bounded timeout/body/strict-JSON parsing, safe error normalization, model validation, non-streaming text/structured/tool-call normalization without execution, and unload/reload ownership tests. Local provider/security/quality and pure suites each pass 222 tests; focused adapter passes 54. Next: exact Linux full/focused gates, immutable artifact, independent pre-live reviews, then push a testable bundle and obtain redacted live Home Assistant revalidation. No live adapter request has been made by this implementation.**

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
| Last completed | LOC-001 provider-neutral config-entry lifecycle, independently accepted |
| Active work | LOC-003 authenticated LM Studio/OpenAI-compatible adapter |
| Evidence/input needed | Future cross-Core evidence only when the owner chooses to evaluate an upgrade; first isolated restore artifact by 2027-02-23 or earlier after a major backup/migration change |
| Next gate | LOC-003 bounded adapter implementation, synthetic transport/security matrix, redacted live Home Assistant revalidation, and independent acceptance |
| Production code | The foundation, action-free lifecycle probe, provider-neutral contract, and provider config-entry lifecycle are implemented; live provider transport, provider UI, and product workflows remain absent |
| Repository | Local `main` tracks the public `ewaisg/HA-AI-Orchestrator` repository; LOC-001 is accepted and its closeout push is the immediate next repository action |

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
| LOC-003 | Add authenticated LM Studio/OpenAI-compatible adapter | `IN PROGRESS` | LOC-001, LOC-002, ENV-003 | Synthetic implementation uses the shared HA session; private-address-only SSRF boundary; exact `/v1` paths; required backend-only token/model config; no redirects; 60-second and 2 MiB bounds; strict JSON; safe normalized failures; configured-model validation; non-streaming generation; structured output; and tool-request parsing without execution. Local provider/security/quality and pure suites pass 222; adapter-focused passes 54. Next: exact Linux gates, immutable artifact, independent pre-live reviews, push/install, and redacted live revalidation. Evidence: `docs/evidence/2026-08-24-loc-003-lm-studio-adapter.md`. |
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
