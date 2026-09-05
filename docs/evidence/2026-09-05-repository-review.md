# Repository review and resume handoff — 2026-09-05

Task: REV-001. Scope: repository orientation, current implementation and remaining
product scope, evidence integrity, and browser handoff. This is not a new
security approval or live acceptance result.

## Purpose and architecture

AI Orchestrator is a private Home Assistant custom integration with a bundled
TypeScript/Lit panel. Home Assistant owns household state, events, authentication,
registries, and eventual actions. The intended product lets an administrator
configure local/cloud AI, select context and permissions, build constrained
workflows visually, and use chat, Assist, notifications, and voice without routine
YAML editing. Its first complete workflow is a window event producing an
AI-written Echo/media announcement with discovered targets.

AI remains a constrained step inside deterministic execution. Provider secrets
stay in backend configuration; cloud disclosure requires workflow permission;
there is no unrestricted model-facing Home Assistant action executor. Future
security alerts must retain a deterministic primary path when AI is offline.

## Repository map

| Location | Responsibility and observed state |
|---|---|
| `custom_components/ai_orchestrator/` | Python integration: setup/migration/unload, provider config flows, admin WebSocket API, panel registration, read-only registry catalogue, and an action-free lifecycle probe |
| `custom_components/ai_orchestrator/providers/` | Provider-neutral request/result/error contract, deterministic fake provider, and the single real LM Studio adapter |
| `custom_components/ai_orchestrator/frontend/` | Committed self-contained panel bundle copied into Home Assistant with the integration |
| `frontend/src/` | Lit panel, provider and catalogue views, strict typed Home Assistant API clients, styles, and development fixture entry |
| `frontend/test/` | Browser interaction, API-contract, accessibility, provider, catalogue, and lifecycle-probe tests |
| `tests/` | Home Assistant integration/lifecycle tests; provider tests and synthetic fixtures; evidence/traceability schema tests; synthetic secret-canary tests |
| `scripts/` | Frontend sync and byte-identity checks, Windows-safe pure-suite entry point, and canary scanning |
| `docs/` | Requirements, tracker, decisions/ADRs, architecture, UI and security plans, installation instructions, and dated redacted evidence/manifests |
| Root metadata | Python and npm locks, integration instructions, Git line-ending/ignore policy; no tracked `.github` CI workflow or HACS configuration was found |

## Implemented versus accepted

Phase 0 and LOC-001/LOC-002 are recorded as DONE. LOC-003/LOC-004/LOC-005 are
implemented and independently approved for synthetic/pre-live acceptance, but
remain REVIEW until the changed candidate passes its live checks.

- **Provider lifecycle:** native Home Assistant setup, reconfiguration,
  reauthentication, migration, reload/unload ownership, and normalized failures.
- **LM Studio:** authenticated private-address-only HTTP transport; bounded model
  discovery and non-streaming generation; strict JSON parsing, fixed error
  messages, redirect refusal, and timeout/cancellation handling. Only model
  discovery is advertised as supported. Generation/tool/schema capabilities
  remain unknown pending live probes. `stream()` explicitly returns unsupported.
  Tool requests are data; no Home Assistant action executes them.
- **Provider panel:** native setup/manage links, loaded-provider list, explicit
  connection testing, timestamps, duplicate-test protection, and separate Home
  Assistant transport failure. The test checks model listing/authentication and
  selected model presence; it is not a generated-chat acceptance test. Setup and
  integration loading also validate the provider in backend lifecycle code.
- **Catalogue:** registry identity, current entity ID, entity/device area
  relationships, integration/domain metadata, disabled and availability flags,
  search, and refresh. It omits state values, attributes, actions, floors, and
  labels. `AI access: none` is explicit; an editable permission system is absent.
- **Other sections:** Home status and the bounded Automations lifecycle probe
  work. Chat, product workflows, voice/Assist, activity/audit, and policy settings
  remain placeholders or unimplemented product features.

## What remains for a complete app

| Order | Tracker scope | Deliverable |
|---|---|---|
| Immediate | LOC-003 through LOC-005 | Live acceptance of the approved provider, provider UI, and catalogue candidate |
| Phase 1 completion | LOC-006, LOC-007 | Read-only chat, honest streaming/non-streaming behavior, proof of absent action/tool access, and a local-provider MVP release gate |
| First complete announcement journey | WFL-001 through WFL-008 | Versioned workflow storage/migrations; deterministic triggers/conditions; constrained AI steps; discovered notification/media actions; visual builder; context preview/dry run; window-to-Echo test; restart/release evidence |
| Safe control and Assist | AST-001 through AST-006 | Conversation entity/Assist, observation/action scopes, bounded validated tool loop, risk policy and one-time confirmation, redacted action traces, independent safety acceptance |
| Cloud providers and routing | CLD-001 through CLD-006 | Azure and Bedrock adapters, explicit local/cloud privacy routes, safe failover/circuit breakers, usage reporting, and live account-specific tests |
| Daily-use completion | SEC-001 through SEC-005 | Deterministic security-event templates, optional enrichment, repairs, backup/restore, audit retention, prompt-injection/threat tests, user acceptance and rollback |

Later required inputs include action/confirmation policy and household roles
(ENV-005/ENV-008), exact selected workflow targets (ENV-004), cloud account/auth
details (ENV-006), and architecture before architecture-sensitive dependencies
(ENV-002). They do not prevent today's repository review. HACS distribution and
cross-Core compatibility are separate unproven claims. DEC-023 currently limits
the accepted target to Core 2026.8.3. The first isolated restore artifact remains
due by 2027-02-23, or earlier after a major backup/migration change.

## Review findings

1. **Documentation drift:** README and INSTALLATION still describe Phase 0 and
   absent provider connections; PRODUCT-REQUIREMENTS says implementation has not
   started. Architecture/quality/UI snapshots retain some decisions already
   resolved in DECISIONS and the tracker. Several panel strings still describe
   Phase 0. These should be reconciled in DOC-001 before LOC-007 acceptance.
2. **Exact artifact versus Windows checkout:** local Git uses
   `core.autocrlf=true`; the bundle has no explicit LF attribute. Its checkout is
   77,807 bytes with 2,398 CRLF pairs and SHA-256
   `6a8c633bb2154bcc26de4ed3e6cf0db2e77637ccef7767ce73052f56c69253be`.
   Normalizing CRLF to LF exactly reproduces the accepted 75,409-byte Git blob
   and SHA-256 `18f23c5e787ecce2bdb052ba1d1799a116a18f3833da70e6a481f423e6037450`.
   No application behavior defect was demonstrated. Use a Git archive of the
   accepted revision when preparing the exact live-install artifact.
3. **Workstation differs from the earlier gate:** Python is 3.14.7, Node is
   24.20.0, and `npm.cmd` is 11.19.0 (project packageManager pins 12.0.2). No
   `.venv`, frontend dependencies, `uv` command, or installed pytest/jsonschema/
   Ruff packages were found. `docker version` returned exit 1, reporting Docker
   Desktop unable to start. Before another implementation gate, restore the
   documented pinned development environment and a working Linux test runner.
   No Docker reset or workstation policy change was made.
4. **Live environment is not yet revalidated:** previous evidence cannot prove
   today's Core version, installed bundle, provider state, or registry behavior.
   ENV-012 records this gap against LOC-003/LOC-004/LOC-005.

## Verification performed today

Initial working tree was clean on `main`, HEAD
`0596de456e8bd6e4e8663cc27f769d99b491ac96`. Application code, frontend, tests,
scripts, and dependency metadata have no Git diff from accepted candidate
`989917fd4229f528c142a9ecebeeea3934c394da`; subsequent committed changes are docs
and evidence. The older tracker note about an untracked IDE file does not match
this checkout; no such file was present.

| Check | Observed result |
|---|---|
| Candidate source identity | `git diff --exit-code` on the source/test/build paths returned 0 |
| Python syntax | 37 tracked Python files parsed successfully using `ast.parse` |
| JSON syntax | 42 tracked JSON files parsed successfully; this is not JSON Schema validation |
| Latest LOC-003/004/005 manifests | All 21 artifact references across 19 distinct files match canonical Git SHA-256 values; all three manifests correctly remain `incomplete` |
| Bundle line-ending diagnosis | Checkout equals accepted canonical blob after CRLF-to-LF normalization |
| Canary scan | `python scripts/canary_scan.py` returned 0 with no findings |
| Build-helper syntax | `node --check` passed for both frontend sync and verification scripts |
| Whitespace | `git diff --check` returned 0; Windows line-ending notices only |

Local machine-readable output is in ignored
`artifacts/review-2026-09-05/integrity.json`, produced by ignored
`work/review_repository.py`. No runtime source changed.

The **historical** August 29 manifests record 340 full Linux tests, 98 focused
tests, 30 security/evidence/traceability tests, 231 pure tests, 95 frontend browser
tests, Ruff, build/sync/byte identity, and independent workflow/safety plus
test/release approvals. Suites overlap; counts must not be added together.
Those suites were not rerun today. Today's review does not claim new runtime,
accessibility, security, full-build, or live Home Assistant acceptance.

## Exact resume sequence

1. Browser sign-in is already available as recorded below. Inspect the current
   Home Assistant version, installed integration candidate, and provider panel
   without recording private values. Reopen the compatibility gate if Core
   differs from 2026.8.3.
2. Determine the installed candidate. Prepare a Git archive of
   `989917fd4229f528c142a9ecebeeea3934c394da` and verify the canonical bundle hash
   before the tracked installation/lifecycle acceptance work.
3. Record the named LOC-003 and LOC-004 provider/authentication, timestamp/reset,
   duplicate-test/transport, reload/unload/restart, bounded failure where safely
   reproducible, desktop/Android, foundation-health, and scoped-log checks.
4. Record LOC-005 redacted catalogue inventory and desktop/Android rendering,
   rename/removal/disabled/unavailable, area/device relationship changes,
   refresh/reload, and scoped logs using appropriate reversible test targets.
5. Complete required acceptance review, then claim LOC-006 read-only chat.
   Reconcile DOC-001 and complete LOC-007 before workflow implementation.

Browser handoff completed after the owner supplied the Home Assistant URL in
conversation. The former Edge connection was unavailable; browser selection for
the supplied URL returned Chrome. The page opened an existing authenticated
Home Assistant session without credential entry. The AI Orchestrator sidebar
link opened its panel, whose visible main content reported foundation connection
confirmed, successful authenticated `ai_orchestrator/status`, provider
connections available, and workflows/conversation/AI Task unavailable. The tab
was retained for the user. No provider test, configuration change, restart, or
Home Assistant action was performed. No private URL, account name, household
data, or credentials were copied into repository evidence.

REV-001 is DONE for review and browser handoff. This confirms access to the
installed panel and its admin-only status; it does not identify the installed
code revision, prove provider health, or establish today's Core version.
ENV-012 remains partial and LOC-003/LOC-004/LOC-005 remain REVIEW.
