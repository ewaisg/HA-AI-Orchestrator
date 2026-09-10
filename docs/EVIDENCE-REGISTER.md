# Evidence and unknowns register

This register prevents environment details from being guessed or silently copied from stale context. Secrets must never be entered here.

## Verified project facts

| ID | Fact | Evidence | Verified |
|---|---|---|---|
| PRJ-001 | The project directory contained no source files before foundation setup | Local directory inspection; only generated `outputs/` and `work/` folders existed | 2026-08-22 |
| PRJ-002 | `SUPERSEDED`: no implementation existed at initial inspection; the FND-015 foundation skeleton now exists while real provider/workflow features remain absent | Repository inspection and FND-015 manifest | 2026-08-23 |
| PRJ-003 | The product is for private personal use initially | Direct user statement | 2026-08-22 |
| PRJ-004 | The user requires multi-agent collaboration and evidence-backed work | Direct user statement | 2026-08-22 |
| PRJ-005 | The local repository is on `main`; the renamed public remote is `https://github.com/ewaisg/HA-AI-Orchestrator` and remote `main` resolves to the same `4095f569ff70e356580bce0c9c6b0770baf4db2d` revision as local before the FND-015 review changes | Local Git and `git ls-remote` output | 2026-08-23 |
| PRJ-006 | `SUPERSEDED`: development is currently on local `main`, not `codex/foundation-skeleton` | Local Git inspection | 2026-08-23 |
| PRJ-007 | Native Windows still cannot initialize the Home Assistant pytest helper because it imports Unix-only `fcntl`; Docker Desktop 4.75.0 Linux engine now provides the approved isolated path, where the full pinned suite passed 102 tests | Real Windows and Docker Linux command output; FND-015 manifest | 2026-08-23 |
| PRJ-008 | The project owner manually installed the Phase 0 bundle and reported the sidebar panel, default Home section, and placeholder sections visible | `docs/evidence/2026-08-23-fnd-015-live-install.md` | 2026-08-23 |
| PRJ-009 | On the named Core 2026.8.3 target, the current AI Orchestrator integration management route is `/config/integrations/integration/ai_orchestrator`; the read-only live UI inspection showed the existing entry and an `Add hub` control | `docs/evidence/2026-08-25-loc-004-provider-ui.md`; live authenticated DOM inspection with no form submission | 2026-08-25 |
| PRJ-010 | Docker Desktop 4.75.0 could not start its Linux engine for the 2026-08-28 working-tree gate because its optional inference manager failed while removing the `dockerInference` listener socket; no Docker reset or settings mutation was authorized or performed | Bounded Docker startup attempts and local Docker backend log; `docs/evidence/2026-08-28-loc-005-read-only-catalog.md` | 2026-08-28 |
| PRJ-011 | The Docker Linux engine responded again without a project-side settings mutation, allowing exact Git-archive candidate `989917fd4229f528c142a9ecebeeea3934c394da` to complete its clean Linux gate | `docker version` output and exact Git-archive test command; LOC-003/LOC-004/LOC-005 `-002` manifests | 2026-08-29 |

## Live Home Assistant verification

### 2026-09-05 repository review

- Live About-page inspection during the owner's continuation now confirms
  Home Assistant OS, Core 2026.9.0, Supervisor 2026.08.0, OS 18.2, and Frontend
  20260826.4. The historical Core 2026.8.3 scope does not approve this version;
  COMP-001 reopens the compatibility gate for LOC-003 through LOC-007.
- WSL Ubuntu successfully installed the frozen Core 2026.8.3 test environment
  using uv 0.12.1; Docker is no longer the only Linux runner. Full test results
  are recorded separately after execution.

- REV-001 verified that application/test/build source on local `main` at
  `0596de456e8bd6e4e8663cc27f769d99b491ac96` matches accepted candidate
  `989917fd4229f528c142a9ecebeeea3934c394da`. Current source checks and historical
  test gates are distinguished in
  [`the review`](evidence/2026-09-05-repository-review.md).
- The committed frontend bundle matches its acceptance hash; Windows checkout
  CRLF conversion changes its physical bytes. Prepare the exact installation
  artifact from the accepted Git archive (LOC-003/LOC-004/LOC-005).
- The current workstation lacks installed project test dependencies and its
  Docker Linux engine failed to start. Earlier PRJ-011 remains historical
  evidence; it does not establish a working Linux runner today. Restore the
  pinned development environment before LOC-006 implementation verification.

The redacted read-only inspections are recorded in [`docs/evidence/2026-08-22-home-assistant-environment.md`](evidence/2026-08-22-home-assistant-environment.md) and [`docs/evidence/2026-08-23-home-assistant-backup.md`](evidence/2026-08-23-home-assistant-backup.md). The source UI remains authoritative; the snapshots must be revalidated where a fact can drift.

| ID | Resolution | Evidence | Remaining unknown |
|---|---|---|---|
| ENV-001 | `RESOLVED FOR CURRENT-VERSION MVP` | HA-LIVE-001 through HA-LIVE-003; FND-011-LIVE-001 through FND-011-LIVE-007 in `docs/evidence/2026-08-23-fnd-011-panel-lifecycle.md`; DEC-023 | Revalidate before claiming another Core version or when the owner chooses to evaluate an upgrade |
| ENV-002 | `PARTIAL` | HA-LIVE-003 through HA-LIVE-005 | Exact processor architecture; not required for the architecture-independent Phase 0 skeleton |
| ENV-004 | `RESOLVED FOR PHASE 0 DISCOVERY` | HA-LIVE-012 through HA-LIVE-016 and HA-LIVE-025 through HA-LIVE-027, plus the user's prior successful audible test | Exact identifiers were verified live but are intentionally not committed to the public repository; revalidate and select current targets from discovery for WFL-007 |
| ENV-007 | `RESOLVED FOR PHASE 0` | HA-LIVE-008 through HA-LIVE-011 plus DEC-016 | Manual-copy development bundle; later HACS distribution is tracked by ENV-011 |
| ENV-009 | `RESOLVED` | HA-OWNER-004 through HA-OWNER-006; DEC-017 through DEC-019 | Revalidate only if the owner changes the policy; workflow-specific cloud opt-ins remain future explicit decisions |
| ENV-010 | `RESOLVED FOR PHASE 0` | HA-LIVE-006, HA-LIVE-022 through HA-LIVE-024, HA-LIVE-028 through HA-LIVE-029, HA-OWNER-001 through HA-OWNER-003, LM-LIVE-008, LM-LIVE-016 through LM-LIVE-018, and HA-BACKUP-001 through HA-BACKUP-008 in `docs/evidence/2026-08-23-home-assistant-backup.md` | Firewall and same-subnet network protections are verified. Recommended daily encrypted backups retain three copies and completed once to two locations. Emergency-kit custody and the six-month/major-change isolated restore policy are owner-confirmed. The first restore artifact is due by 2027-02-23 or earlier after a major change; revalidate after topology or backup-policy changes |
| ENV-003 | `RESOLVED FOR PHASE 0` | LM-LIVE-001 through LM-LIVE-017 and LM-PROBE-001 through LM-PROBE-002 in `docs/evidence/2026-08-23-lm-studio-environment.md` | Revalidate after server, model, credential, endpoint, Home Assistant transport, or network-policy changes and during LOC-003 implementation/release gates |

## Prior proof requiring live revalidation

| ID | Prior evidence | Why it is not treated as current fact | Required revalidation |
|---|---|---|---|
| PRIOR-001 | `SUPERSEDED`: Home Assistant received HTTP 200 from an LM Studio OpenAI-compatible chat-completions endpoint | The earlier conversation was stale context; LM-LIVE-011 through LM-LIVE-013 now provide current redacted live evidence | Revalidate again for LOC-003 and release gates after adapter, server, model, credential, or network changes |
| PRIOR-002 | An AI-written window announcement played through an Echo speaker | Captured in the referenced conversation; exact entity/action IDs were not provided here | Identify the live trigger entity and output action through HA discovery/user evidence |
| PRIOR-003 | A Home Assistant Green was described as the HA host | `SUPERSEDED`: installation type, hardware, and versions were revalidated by HA-LIVE-001 through HA-LIVE-003 | Only exact processor architecture remains under ENV-002 |

## Environment facts needed

| ID | Needed fact | Why needed | Safe evidence to provide | Blocks |
|---|---|---|---|---|
| ENV-001 | Current HA installation type and versions | Determines supported extension, app, and test paths | Settings → System → Repairs → System information, with identifiers redacted if desired | Resolved for FND-010 under DEC-023; future cross-Core compatibility claim |
| ENV-002 | HA hardware architecture and available storage/memory | Sets dependency and performance limits | System information; no credentials | First architecture-sensitive dependency spike, especially Bedrock transport |
| ENV-003 | Current LM Studio base URL, authentication enabled state, model ID, and tested capabilities | Required for the first real adapter | Redacted server settings and test response; never the token | LOC-003 |
| ENV-004 | Exact window trigger entity and Echo/notification action target | Required to recreate the first workflow accurately | Entity/action names or screenshots from HA; no secrets | WFL-007 |
| ENV-005 | User-approved action risk and confirmation policy | Cannot be inferred safely | Written policy choices during Phase 3 review | AST-004 |
| ENV-006 | Desired Azure and AWS account endpoints, regions, deployed models, and auth method | Provider setup is account-specific | Resource/deployment/model/region names; credentials entered only into the eventual secure UI | CLD-001, CLD-002 |
| ENV-007 | Intended private installation/update method | Determines packaging and release checks | Phase 0: manual copy. Later: manual-only or a public GitHub custom repository used privately and not submitted to HACS defaults | Resolved for FND-009; later HACS work uses ENV-011 |
| ENV-008 | Intended administrator and non-admin user roles | Determines panel/chat/approval authorization | Role description without names if preferred | AST-002, AST-004 |
| ENV-009 | Sensitive-data, cloud-disclosure, and retention defaults | These are user policy decisions, not technical defaults | Written choices after reviewing the UI/security plans | FND-010, CLD-003 |
| ENV-010 | Backup encryption and network protections | Determines credible credential and LAN-provider operating guidance | Redacted backup/network settings; never keys or recovery material | FND-010, LOC-007 |
| ENV-011 | Repository hosting, owner/organization metadata, and desired distribution visibility | Required before HACS validation or update claims | Hosting choice and non-secret repository metadata | HACS distribution; does not block manual Phase 0 builds |
| ENV-012 | PARTIAL: owner URL supplied; Chrome has an existing authenticated Home Assistant session; AI Orchestrator's admin-only status succeeds and reports provider connections available. Current Core version, installed candidate, provider health, and catalogue behavior remain unverified | Previous live evidence does not approve today's environment or the changed candidate | `docs/evidence/2026-09-05-repository-review.md`, browser handoff and visible panel status; no credentials or private URL committed | LOC-003, LOC-004, LOC-005 live acceptance |

## Rule for resolving an unknown

Record the source, date, and scope of the evidence. If a value can drift, add a revalidation step to the consuming task. Never place a secret, access token, full diagnostic archive, or unredacted credential screen in this repository.

## September 5 LOC-006 and compatibility revalidation

- ENV-012 is now partially resolved by direct current-version inspection:
  Core 2026.9.0, Frontend 20260826.4, Supervisor 2026.08.0, OS 18.2, HA OS.
  Explicit provider test passed and read-only catalogue refreshed successfully.
  These observations predate the chat update and do not prove its live behavior.
- Development-runner absence above is superseded: persistent WSL Ubuntu test
  environments on Python 3.14.5 passed 378 full tests on each named Core
  2026.8.3 and 2026.9.0. Frontend gate passed 112 browser tests and bundle identity.
- LOC-006's exact source and package have independent pre-live safety approval.
  Remaining unknowns are actual live generation and changed-candidate lifecycle,
  Android, registry-mutation and scoped-log results. Track under LOC-006,
  COMP-001 and LOC-003 through LOC-005; do not infer a completed Phase 1 release.
- Evidence and the live resume procedure:
  [LOC-006 local chat](evidence/2026-09-05-loc-006-local-chat.md).

## September 9 repository resume

- Superseding the older LOC-006 unknown above: September 5 evidence records an
  actual local reply, follow-up context and New chat reset on Core 2026.9.0.
- ENV-013: LOC-009's committed content-hash code required executor offloading
  and a real byte-change regression. Live installation of the repaired candidate
  and an update observed without manual cache clearing remain unverified.
  Consuming tasks: LOC-009 and LOC-007. Do not infer live success from local tests.
- LOC-008 Android keyboard/transcript/spacing acceptance remains unconfirmed for
  this layout candidate. Consuming tasks: LOC-008, COMP-001 and LOC-007.

- ENV-013 resolved for LOC-009 behavioral acceptance: owner explicitly confirmed
  updated panel/chat worked without clearing caches after the candidate handoff.
  See the owner acceptance addendum in `evidence/2026-09-09-loc-009-resume.md`.
  No live URL trace, Android confirmation or unrelated acceptance is inferred.
