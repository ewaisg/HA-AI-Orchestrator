# Data-flow and control-to-test traceability

Status: FND-013 implementation under review

Catalog: [`traceability/traceability.json`](traceability/traceability.json)

Schema: [`traceability/traceability.schema.json`](traceability/traceability.schema.json)

## Purpose and claim boundary

This record gives the project stable IDs for product requirements, protected data, trust-zone nodes, data flows, security controls, and test specifications. The JSON catalog is the machine-checkable source; this document is its readable map.

`planned` means the product behavior or test does not yet exist. `phase0_verified` and `phase0_passed` mean only the narrow foundation evidence named in the catalog exists. They do not mark a provider adapter, workflow engine, chat agent, cloud route, or action-capable product feature delivered. Every product requirement remains planned at FND-013.

No live hostname, address, entity, person, target, credential, recovery key, backup identifier, prompt, provider response, or account identifier belongs in either traceability artifact.

## Condensed data-flow view

```mermaid
flowchart LR
    U[Authorized user] -->|FLOW-001 intent and configuration| F[Bundled panel]
    H[Home Assistant authoritative runtime] -->|FLOW-002 panel and safe state| F
    F -->|FLOW-003 typed authenticated commands| B[Orchestrator backend and policy]
    H -->|FLOW-004 selected state events registries Assist| B
    B -->|FLOW-005 versioned config and bounded history| S[HA config entries and storage]
    B -->|FLOW-006 local-only filtered request| L[Explicit local provider]
    B -->|FLOW-007 explicitly opted-in filtered request| C[Named cloud provider]
    L -->|FLOW-008 untrusted output| B
    C -->|FLOW-009 untrusted output| B
    B -->|FLOW-010 validated authorized structured action| H
    B -->|FLOW-011 redacted UI result and trace| F
    H -->|FLOW-012 deterministic alert or approved output| O[Notification media or voice target]
    H -->|FLOW-015 approved physical side effect| D[Device target]
    B -->|FLOW-013 redacted artifact only| A[Logs diagnostics exports evidence]
    H -->|FLOW-014 encrypted local backup| RL[Local backup storage]
    H -->|FLOW-016 encrypted off-device backup| RO[Off-device backup storage]
    RL -->|FLOW-017 authorized restore ingress| RH[Spare isolated or replacement HA]
    RO -->|FLOW-018 authorized restore ingress| RH
```

The critical asymmetry is intentional: model output returns only to the backend. It cannot call Home Assistant, an output target, storage, or a browser directly. `FLOW-010` is the sole planned model-influenced crossing into Home Assistant's action runtime; Home Assistant alone reaches notification/media targets through `FLOW-012` or device targets through `FLOW-015`. Those crossings remain guarded by typed tools, current authorization, exact validation, risk policy, confirmation, idempotency, and rate/concurrency controls.

Backup egress and restore ingress are deliberately different flows. `FLOW-014` and `FLOW-016` write encrypted recovery data. `FLOW-017` and `FLOW-018` bring stored data back into an authoritative recovery runtime, where decryption, integrity, version, migration, and restored-secret risks must be checked. Routine restore tests target only a spare or isolated instance; a replacement instance is used only for an authorized real recovery.

### Node register

| ID | Trust-zone component |
|---|---|
| NODE-USER | Authorized administrator or permitted household user |
| NODE-FRONTEND | Bundled panel in an authenticated HA session |
| NODE-BACKEND | Integration backend, policy, workflow, redaction, provider contract |
| NODE-HA | Authoritative HA authentication, state, registries, events, actions, Assist, notifications |
| NODE-STORE | HA config entries and versioned integration storage |
| NODE-LOCAL-PROVIDER | Explicit local AI endpoint |
| NODE-CLOUD-PROVIDER | Explicit cloud provider endpoint |
| NODE-OUTPUT | Approved notification, media, or voice target |
| NODE-DEVICE | HA-controlled target for an approved physical/device side effect |
| NODE-ARTIFACT | Logs, diagnostics, traces, exports, fixtures, evidence |
| NODE-BACKUP-LOCAL | Encrypted backup storage on the HA system |
| NODE-BACKUP-OFFSITE | Encrypted backup storage outside the HA device |
| NODE-RESTORE-HA | Authorized spare, isolated, or replacement HA recovery runtime |

## Protected data classes

| ID | Data | Required handling |
|---|---|---|
| DATA-CREDENTIAL | Provider credentials, HA auth context, approval tokens, recovery keys | A newly typed secret may exist transiently in the authenticated form; never returned/persisted/echoed in browser state; transport auth goes only from backend to its normalized credential destination and never into model-visible context or artifacts |
| DATA-HOUSEHOLD | State, events, presence, security, location, calendar, camera, voice, targets | Deny by default; explicitly scope, minimize, destination-filter, redact |
| DATA-CONTENT | User input, prompts, model context/output, tool arguments/results | Untrusted; delimit, validate, retain only by policy; no hidden reasoning |
| DATA-CONFIG | Provider options, workflows, routes, policies, UI settings, schemas | Admin-authorized, versioned, validated, migratable; exports omit secrets |
| DATA-CONTROL | Tools, action arguments/targets, approvals, execution state, HA context | Typed, allowlisted, reauthorized immediately before action; no blind replay |
| DATA-TELEMETRY | Health, duration, usage, errors, audit metadata, diagnostics | Bounded and recursively redacted; content excluded by default |
| DATA-RECOVERY | Encrypted backup, emergency-kit material, migration/restore evidence | Off-device protection; no committed key; isolated restore only |

## Trust zones and flows

| Flow | From → to | Boundary and data | Enforcing controls | Required tests |
|---|---|---|---|---|
| FLOW-001 | User → panel | Authenticated intent/configuration and any newly typed transient secret enter browser session | CTRL-AUTH-001, CTRL-SECRET-001 | TEST-AUTHORIZATION-MATRIX, TEST-NO-BROWSER-PROVIDER, TEST-SECRET-EGRESS |
| FLOW-002 | HA → panel | Platform state becomes browser-visible | CTRL-AUTH-001, CTRL-SECRET-001, CTRL-RED-001, CTRL-COMPAT-001 | TEST-AUTHORIZATION-MATRIX, TEST-SECRET-EGRESS, TEST-REDACTION-CANARY, TEST-COMPAT-LIFECYCLE |
| FLOW-003 | Panel → backend | Browser input, including a newly submitted secret, enters privileged integration code | CTRL-AUTH-001, CTRL-SECRET-001, CTRL-OUTPUT-001 | TEST-AUTHORIZATION-MATRIX, TEST-SECRET-EGRESS, TEST-OUTPUT-SCHEMA |
| FLOW-004 | HA → backend | Selected authoritative data becomes untrusted workflow context | CTRL-AUTH-001, CTRL-PRIVACY-001, CTRL-INPUT-TRUST-001, CTRL-TOOL-001, CTRL-RATE-001 | TEST-AUTHORIZATION-MATRIX, TEST-CLOUD-PRIVACY, TEST-PROMPT-INJECTION, TEST-TOOL-ALLOWLIST, TEST-STORM-CONCURRENCY |
| FLOW-005 | Backend → HA storage | Runtime data becomes persistent configuration/history | CTRL-SECRET-001, CTRL-RETENTION-001, CTRL-RED-001, CTRL-COMPAT-001 | TEST-SECRET-EGRESS, TEST-RETENTION-DELETION, TEST-REDACTION-CANARY, TEST-COMPAT-LIFECYCLE |
| FLOW-006 | Backend → local provider | Filtered prompt/context plus transport auth leave HA for an explicit LAN endpoint; auth is not model context | CTRL-SECRET-001, CTRL-PRIVACY-001, CTRL-ENDPOINT-001, CTRL-PROVIDER-001, CTRL-SUPPLY-CHAIN-001 | TEST-SECRET-EGRESS, TEST-CLOUD-PRIVACY, TEST-ENDPOINT-SSRF, TEST-PROVIDER-CONTRACT, TEST-LOCAL-AUTH-NETWORK, TEST-DEPENDENCY-REVIEW |
| FLOW-007 | Backend → cloud provider | Opted-in filtered prompt/context plus transport auth leave the private network; auth is not model context | CTRL-SECRET-001, CTRL-PRIVACY-001, CTRL-ENDPOINT-001, CTRL-PROVIDER-001, CTRL-SUPPLY-CHAIN-001 | TEST-SECRET-EGRESS, TEST-CLOUD-PRIVACY, TEST-ENDPOINT-SSRF, TEST-PROVIDER-CONTRACT, TEST-DEPENDENCY-REVIEW |
| FLOW-008 | Local provider → backend | Untrusted local model output re-enters privileged code | CTRL-PROVIDER-001, CTRL-INPUT-TRUST-001, CTRL-OUTPUT-001, CTRL-TOOL-001, CTRL-RED-001 | TEST-PROVIDER-CONTRACT, TEST-PROMPT-INJECTION, TEST-OUTPUT-SCHEMA, TEST-TOOL-ALLOWLIST, TEST-REDACTION-CANARY |
| FLOW-009 | Cloud provider → backend | Untrusted remote model output re-enters privileged code | CTRL-PROVIDER-001, CTRL-INPUT-TRUST-001, CTRL-OUTPUT-001, CTRL-TOOL-001, CTRL-RED-001 | TEST-PROVIDER-CONTRACT, TEST-PROMPT-INJECTION, TEST-OUTPUT-SCHEMA, TEST-TOOL-ALLOWLIST, TEST-REDACTION-CANARY |
| FLOW-010 | Backend → HA | Validated model-influenced structure approaches HA action runtime | CTRL-TOOL-001, CTRL-ACTION-001, CTRL-IDEMPOTENCY-001, CTRL-ALERT-001, CTRL-RATE-001 | TEST-TOOL-ALLOWLIST, TEST-ACTION-CONFIRMATION, TEST-IDEMPOTENT-RESTART, TEST-DETERMINISTIC-ALERT, TEST-STORM-CONCURRENCY |
| FLOW-011 | Backend → panel | Redacted status, destination, validation, result, and trace become visible | CTRL-SECRET-001, CTRL-RED-001, CTRL-PRIVACY-001, CTRL-RETENTION-001 | TEST-SECRET-EGRESS, TEST-REDACTION-CANARY, TEST-CLOUD-PRIVACY, TEST-RETENTION-DELETION |
| FLOW-012 | HA → notification/media/voice output | Deterministic alert or approved communication leaves HA | CTRL-AUTH-001, CTRL-ALERT-001, CTRL-ACTION-001 | TEST-AUTHORIZATION-MATRIX, TEST-DETERMINISTIC-ALERT, TEST-ACTION-CONFIRMATION |
| FLOW-013 | Backend → artifact | Runtime data becomes persistent/shareable evidence or support material | CTRL-SECRET-001, CTRL-RED-001, CTRL-RETENTION-001 | TEST-SECRET-EGRESS, TEST-REDACTION-CANARY, TEST-RETENTION-DELETION |
| FLOW-014 | HA → local backup | Encrypted protected installation data enters on-system recovery storage | CTRL-BACKUP-001, CTRL-SECRET-001, CTRL-RED-001 | TEST-BACKUP-CREATE, TEST-SECRET-EGRESS |
| FLOW-015 | HA → device | Authorized action produces a physical/device-side effect | CTRL-AUTH-001, CTRL-ACTION-001, CTRL-IDEMPOTENCY-001, CTRL-RATE-001 | TEST-AUTHORIZATION-MATRIX, TEST-ACTION-CONFIRMATION, TEST-IDEMPOTENT-RESTART, TEST-STORM-CONCURRENCY, TEST-DEVICE-SIDE-EFFECT |
| FLOW-016 | HA → off-device backup | Encrypted protected installation data leaves the HA device | CTRL-BACKUP-001, CTRL-SECRET-001, CTRL-RED-001 | TEST-BACKUP-CREATE, TEST-SECRET-EGRESS |
| FLOW-017 | Local backup → recovery HA | Stored recovery data re-enters an authoritative runtime | CTRL-RESTORE-001, CTRL-SECRET-001, CTRL-RED-001, CTRL-UPGRADE-001 | TEST-BACKUP-RESTORE, TEST-SECRET-EGRESS, TEST-COMPAT-CORE-UPGRADE |
| FLOW-018 | Off-device backup → recovery HA | Externally stored recovery data re-enters an authoritative runtime | CTRL-RESTORE-001, CTRL-SECRET-001, CTRL-RED-001, CTRL-UPGRADE-001 | TEST-BACKUP-RESTORE, TEST-SECRET-EGRESS, TEST-COMPAT-CORE-UPGRADE |

## Control register

| Control | Enforced rule | Current status |
|---|---|---|
| CTRL-AUTH-001 | Preserve HA authentication/context and authorize configuration, approval, and use | Phase 0 verified only for current admin-bounded foundation surfaces |
| CTRL-SECRET-001 | Transient authenticated form entry only; backend storage/use; no browser return/persistence/echo; transport auth only to normalized credential destination and never model context | Design only |
| CTRL-RED-001 | Recursive secret/household redaction plus deterministic canary scanning | Phase 0 canary/evidence harness verified; product redactor not implemented |
| CTRL-PRIVACY-001 | Minimal explicit context, local default, cloud opt-in, prohibited-field filtering | Design only; owner defaults recorded |
| CTRL-ENDPOINT-001 | Validate provider scheme/origin/redirect/DNS/IP and credential destination | Design only |
| CTRL-PROVIDER-001 | One provider contract with probed capability and normalized failure behavior | Design only |
| CTRL-OUTPUT-001 | Strictly validate all provider output before structured use | Design only |
| CTRL-INPUT-TRUST-001 | Immutable policy plus typed, delimited untrusted context; injected text cannot expand data/tools/targets/actions | Design only |
| CTRL-TOOL-001 | Typed narrow tools only; no generic action executor | Design only; Phase 0 probe is action-free but product tools do not exist |
| CTRL-ACTION-001 | Risk policy, prohibited actions, exact confirmation, current state/context recheck | Design only; owner action matrix remains a later decision |
| CTRL-IDEMPOTENCY-001 | Journal side effects and prevent duplicate/replayed/recursive action | Design only; Phase 0 lifecycle probe has no side effect |
| CTRL-RATE-001 | Debounce, deduplicate, bound concurrency/rates, circuit-break, and prevent re-entry storms | Design only |
| CTRL-ALERT-001 | Deterministic primary safety/security path unaffected by AI | Design only |
| CTRL-RETENTION-001 | Bounded owner-approved retention and deletion semantics | Design only; owner defaults recorded |
| CTRL-COMPAT-001 | Exact named-version setup/unload/reload/restart/panel/non-admin behavior | Phase 0 same-version scope verified |
| CTRL-UPGRADE-001 | Actual Core-upgrade, migration, rollback, and post-upgrade lifecycle evidence | Design only; FND-011 upgrade artifact remains open |
| CTRL-BACKUP-001 | Encrypted local/off-device backup creation and protected recovery-material custody | Phase 0 backup creation/policy verified |
| CTRL-RESTORE-001 | Authorized decrypt/integrity/version/migration/restored-secret handling in spare/isolated or real replacement recovery | Design only; first isolated restore artifact remains due |
| CTRL-SUPPLY-CHAIN-001 | Pinned/minimal dependencies, reproducible build, SBOM, vulnerability/license review, stop-ship disposition | Design only |

## Requirement traceability

All rows remain `planned`. The IDs map the approved source text; they do not replace it.

| Requirement | Short meaning | Primary flows | Primary controls | Acceptance tests |
|---|---|---|---|---|
| REQ-CAP-001 | UI-configured provider connections behind one contract | FLOW-001, 003, 005–009 | CTRL-AUTH-001, SECRET-001, ENDPOINT-001, PROVIDER-001, SUPPLY-CHAIN-001 | TEST-AUTHORIZATION-MATRIX, SECRET-EGRESS, ENDPOINT-SSRF, PROVIDER-CONTRACT, DEPENDENCY-REVIEW |
| REQ-CAP-002 | Live HA entity/device/area/state/action discovery | FLOW-004, 011 | CTRL-AUTH-001, PRIVACY-001, RED-001 | TEST-AUTHORIZATION-MATRIX, CLOUD-PRIVACY, REDACTION-CANARY |
| REQ-CAP-003 | Per-agent/workflow observation/action/privacy/confirmation scopes | FLOW-003–005, 010, 015 | CTRL-AUTH-001, PRIVACY-001, INPUT-TRUST-001, TOOL-001, ACTION-001 | TEST-AUTHORIZATION-MATRIX, CLOUD-PRIVACY, PROMPT-INJECTION, TOOL-ALLOWLIST, ACTION-CONFIRMATION, DEVICE-SIDE-EFFECT |
| REQ-CAP-004 | Visual deterministic workflow with constrained AI and failures | FLOW-004–010, 015 | CTRL-INPUT-TRUST-001, OUTPUT-001, TOOL-001, ACTION-001, IDEMPOTENCY-001, RATE-001, COMPAT-001, UPGRADE-001 | TEST-PROMPT-INJECTION, OUTPUT-SCHEMA, TOOL-ALLOWLIST, ACTION-CONFIRMATION, IDEMPOTENT-RESTART, STORM-CONCURRENCY, DEVICE-SIDE-EFFECT, COMPAT-LIFECYCLE, COMPAT-CORE-UPGRADE |
| REQ-CAP-005 | Compose/classify/extract/branch/bounded conversation-tool modes | FLOW-006–009 | CTRL-PROVIDER-001, INPUT-TRUST-001, OUTPUT-001, TOOL-001 | TEST-PROVIDER-CONTRACT, PROMPT-INJECTION, OUTPUT-SCHEMA, TOOL-ALLOWLIST |
| REQ-CAP-006 | Chat and Assist conversation agent | FLOW-001, 003, 004, 006–009, 011 | CTRL-AUTH-001, PRIVACY-001, INPUT-TRUST-001, PROVIDER-001, TOOL-001, RETENTION-001 | TEST-AUTHORIZATION-MATRIX, CLOUD-PRIVACY, PROMPT-INJECTION, PROVIDER-CONTRACT, TOOL-ALLOWLIST, RETENTION-DELETION |
| REQ-CAP-007 | Live-available HA announcements/notifications | FLOW-004, 010, 012 | CTRL-AUTH-001, ACTION-001, IDEMPOTENCY-001, RATE-001 | TEST-AUTHORIZATION-MATRIX, ACTION-CONFIRMATION, IDEMPOTENT-RESTART, STORM-CONCURRENCY |
| REQ-CAP-008 | Named routes, health, safe failover, visible destination | FLOW-006–009, 011 | CTRL-PRIVACY-001, INPUT-TRUST-001, ENDPOINT-001, PROVIDER-001, IDEMPOTENCY-001 | TEST-CLOUD-PRIVACY, PROMPT-INJECTION, ENDPOINT-SSRF, PROVIDER-CONTRACT, IDEMPOTENT-RESTART |
| REQ-CAP-009 | Dry run, exact context preview, redacted trace, restart safety | FLOW-003, 005, 010, 011, 013 | CTRL-RED-001, PRIVACY-001, INPUT-TRUST-001, IDEMPOTENCY-001, RETENTION-001, COMPAT-001, UPGRADE-001 | TEST-REDACTION-CANARY, CLOUD-PRIVACY, PROMPT-INJECTION, IDEMPOTENT-RESTART, RETENTION-DELETION, COMPAT-LIFECYCLE, COMPAT-CORE-UPGRADE |
| REQ-CAP-010 | AI cannot replace life-safety detection or unrestricted action policy | FLOW-004, 010, 012, 015 | CTRL-INPUT-TRUST-001, TOOL-001, ACTION-001, ALERT-001, IDEMPOTENCY-001, RATE-001 | TEST-PROMPT-INJECTION, TOOL-ALLOWLIST, ACTION-CONFIRMATION, DETERMINISTIC-ALERT, IDEMPOTENT-RESTART, STORM-CONCURRENCY, DEVICE-SIDE-EFFECT |
| REQ-CON-001 | Private personal-use distribution | FLOW-001–003 | CTRL-AUTH-001, COMPAT-001, UPGRADE-001, SUPPLY-CHAIN-001 | TEST-AUTHORIZATION-MATRIX, COMPAT-LIFECYCLE, COMPAT-CORE-UPGRADE, DEPENDENCY-REVIEW |
| REQ-CON-002 | HA is authoritative for state and action | FLOW-004, 010, 012, 015 | CTRL-AUTH-001, ACTION-001, COMPAT-001, UPGRADE-001 | TEST-AUTHORIZATION-MATRIX, ACTION-CONFIRMATION, DEVICE-SIDE-EFFECT, COMPAT-LIFECYCLE, COMPAT-CORE-UPGRADE |
| REQ-CON-003 | Newly typed secret is transient; stored credentials never return to browser; provider requests are backend-only | FLOW-001–003, 006, 007 | CTRL-SECRET-001, ENDPOINT-001 | TEST-NO-BROWSER-PROVIDER, SECRET-EGRESS, ENDPOINT-SSRF |
| REQ-CON-004 | No generic unrestricted model action tool | FLOW-008–010, 015 | CTRL-INPUT-TRUST-001, TOOL-001, ACTION-001 | TEST-PROMPT-INJECTION, TOOL-ALLOWLIST, ACTION-CONFIRMATION, DEVICE-SIDE-EFFECT |
| REQ-CON-005 | No cloud disclosure without workflow authorization | FLOW-007, 009, 011 | CTRL-PRIVACY-001, INPUT-TRUST-001, RED-001 | TEST-CLOUD-PRIVACY, PROMPT-INJECTION, REDACTION-CANARY |
| REQ-CON-006 | YAML is not the primary UX | FLOW-001, 003, 005, 011 | CTRL-AUTH-001, OUTPUT-001, COMPAT-001, UPGRADE-001 | TEST-AUTHORIZATION-MATRIX, OUTPUT-SCHEMA, COMPAT-LIFECYCLE, COMPAT-CORE-UPGRADE |
| REQ-CON-007 | No unverified capability claim | FLOW-004, 006–009 | CTRL-PROVIDER-001, COMPAT-001, UPGRADE-001 | TEST-PROVIDER-CONTRACT, COMPAT-LIFECYCLE, COMPAT-CORE-UPGRADE, LOCAL-AUTH-NETWORK |
| REQ-CON-008 | No inferred high-risk owner policy | FLOW-001, 003, 010, 015 | CTRL-AUTH-001, INPUT-TRUST-001, ACTION-001, TOOL-001 | TEST-AUTHORIZATION-MATRIX, PROMPT-INJECTION, ACTION-CONFIRMATION, TOOL-ALLOWLIST, DEVICE-SIDE-EFFECT |
| REQ-ACC-001 | UI-configurable, safe test, destination-transparent, offline-tolerant, redacted acceptance | FLOW-001, 003, 006, 007, 010, 011, 013, 015 | CTRL-AUTH-001, PRIVACY-001, INPUT-TRUST-001, PROVIDER-001, ACTION-001, RED-001, IDEMPOTENCY-001, RATE-001, SUPPLY-CHAIN-001 | TEST-AUTHORIZATION-MATRIX, CLOUD-PRIVACY, PROMPT-INJECTION, PROVIDER-CONTRACT, ACTION-CONFIRMATION, DEVICE-SIDE-EFFECT, REDACTION-CANARY, IDEMPOTENT-RESTART, STORM-CONCURRENCY, DEPENDENCY-REVIEW |

## Test registry and current evidence state

| Test ID | Required proof | Status |
|---|---|---|
| TEST-AUTHORIZATION-MATRIX | Admin/non-admin configure/read/approve/invoke matrix with HA context | Planned |
| TEST-NO-BROWSER-PROVIDER | Newly typed secret is transient only; stored secret never returns/persists/echoes; browser makes no direct provider request | Planned |
| TEST-SECRET-EGRESS | Credential lifecycle and every egress remain secret-free | Planned |
| TEST-REDACTION-CANARY | Synthetic secret/household canary absent from artifacts | Phase 0 passed for existing harness/artifacts only |
| TEST-CLOUD-PRIVACY | Sanitized requests prove local default, opt-in, minimization, deny rules, failover boundary | Planned |
| TEST-ENDPOINT-SSRF | URL/redirect/DNS/IP/userinfo/metadata corpus | Planned |
| TEST-PROVIDER-CONTRACT | Common capability/error/timeout/cancel/stream/tool/schema behavior | Planned |
| TEST-OUTPUT-SCHEMA | Malformed/extra/ambiguous/stale/policy-expanding output rejected | Planned |
| TEST-PROMPT-INJECTION | Adversarial entity/event/calendar/message/provider/tool-result text cannot change immutable policy or expand access | Planned |
| TEST-TOOL-ALLOWLIST | Prompt/output cannot expand tool, target, argument, or permission scope | Planned |
| TEST-ACTION-CONFIRMATION | Risk/prohibition/exact confirmation/expiry/state/auth recheck | Planned |
| TEST-IDEMPOTENT-RESTART | Retry/failover/reload/restart/cancel/re-entry yields zero or one side effect | Planned |
| TEST-STORM-CONCURRENCY | Burst, concurrency, recursion, circuit-breaker, and rate-bound exact counts | Planned |
| TEST-DETERMINISTIC-ALERT | Primary alert survives every AI failure and injection mode | Planned |
| TEST-RETENTION-DELETION | Retention defaults, deletion, exports, and no hidden reasoning | Planned |
| TEST-COMPAT-LIFECYCLE | Exact named-version setup/unload/reload/restart/panel/non-admin behavior | Phase 0 passed for the recorded same-version scope |
| TEST-COMPAT-CORE-UPGRADE | Actual Core upgrade plus migration, panel, rollback, and post-upgrade lifecycle | Planned; FND-011 artifact open |
| TEST-LOCAL-AUTH-NETWORK | Missing/invalid auth rejection, valid HA request, hardened reachability | Phase 0 passed for observed LM Studio environment |
| TEST-BACKUP-CREATE | Encrypted automatic/off-device backup, emergency-kit custody, schedule | Phase 0 passed for observed HA environment |
| TEST-BACKUP-RESTORE | Spare/isolated restore on cadence and after major changes | Planned; first artifact due by 2027-02-23 or earlier trigger |
| TEST-DEVICE-SIDE-EFFECT | Harmless live target proves exact context/target/arguments/confirmation/audit and zero-or-one physical effect | Planned |
| TEST-DEPENDENCY-REVIEW | Reproducible lock/build, SBOM, vulnerability/license review, mitigation | Planned |
| TEST-CATALOG-INTEGRITY | Schema, unique IDs, resolved refs, requirement coverage, evidence status | Implemented by `tests/quality/test_traceability.py`; acceptance pending FND-013 review |

## Maintenance rule

Every future implementation task must reference at least one `REQ-*`, `CTRL-*`, and `TEST-*` ID in its tracker/evidence. If the task adds a new data class, node, boundary, or egress, update the JSON catalog and this map in the same reviewed change. A test may move from `planned` only when its evidence reference exists and the evidence says exactly what passed. A requirement may move from `planned` only when all applicable phase-gate acceptance evidence exists; foundation evidence alone is insufficient.
