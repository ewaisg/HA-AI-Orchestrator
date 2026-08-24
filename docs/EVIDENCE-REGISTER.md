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

## Live Home Assistant verification

The redacted read-only inspection is recorded in [`docs/evidence/2026-08-22-home-assistant-environment.md`](evidence/2026-08-22-home-assistant-environment.md). The source UI remains authoritative; the snapshot must be revalidated where a fact can drift.

| ID | Resolution | Evidence | Remaining unknown |
|---|---|---|---|
| ENV-001 | `REVALIDATED FOR FND-011` | HA-LIVE-001 through HA-LIVE-003; FND-011-LIVE-001 and FND-011-LIVE-002 in `docs/evidence/2026-08-23-fnd-011-panel-lifecycle.md` | Revalidate again for a later upgrade or release gate |
| ENV-002 | `PARTIAL` | HA-LIVE-003 through HA-LIVE-005 | Exact processor architecture; not required for the architecture-independent Phase 0 skeleton |
| ENV-004 | `RESOLVED FOR PHASE 0 DISCOVERY` | HA-LIVE-012 through HA-LIVE-016 and HA-LIVE-025 through HA-LIVE-027, plus the user's prior successful audible test | Exact identifiers were verified live but are intentionally not committed to the public repository; revalidate and select current targets from discovery for WFL-007 |
| ENV-007 | `RESOLVED FOR PHASE 0` | HA-LIVE-008 through HA-LIVE-011 plus DEC-016 | Manual-copy development bundle; later HACS distribution is tracked by ENV-011 |
| ENV-009 | `RESOLVED` | HA-OWNER-004 through HA-OWNER-006; DEC-017 through DEC-019 | Revalidate only if the owner changes the policy; workflow-specific cloud opt-ins remain future explicit decisions |
| ENV-010 | `PARTIAL` | HA-LIVE-006, HA-LIVE-022 through HA-LIVE-024, HA-LIVE-028 through HA-LIVE-029, HA-OWNER-001 through HA-OWNER-003, LM-LIVE-008, and LM-LIVE-016 through LM-LIVE-017 | The LM Studio host firewall is now narrowly scoped and revalidated. Backup encryption/emergency-kit/restore readiness and router/VLAN policy remain unknown |
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
| ENV-001 | Current HA installation type and versions | Determines supported extension, app, and test paths | Settings → System → Repairs → System information, with identifiers redacted if desired | FND-010 |
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

## Rule for resolving an unknown

Record the source, date, and scope of the evidence. If a value can drift, add a revalidation step to the consuming task. Never place a secret, access token, full diagnostic archive, or unredacted credential screen in this repository.
