# Evidence and unknowns register

This register prevents environment details from being guessed or silently copied from stale context. Secrets must never be entered here.

## Verified project facts

| ID | Fact | Evidence | Verified |
|---|---|---|---|
| PRJ-001 | The project directory contained no source files before foundation setup | Local directory inspection; only generated `outputs/` and `work/` folders existed | 2026-08-22 |
| PRJ-002 | No production implementation has been created | Repository inspection | 2026-08-22 |
| PRJ-003 | The product is for private personal use initially | Direct user statement | 2026-08-22 |
| PRJ-004 | The user requires multi-agent collaboration and evidence-backed work | Direct user statement | 2026-08-22 |
| PRJ-005 | A local Git repository exists on branch `main`; no remote repository is configured | Local Git initialization/status inspection | 2026-08-22 |
| PRJ-006 | Development is active on branch `codex/foundation-skeleton` | Local Git inspection | 2026-08-22 |
| PRJ-007 | The pinned Home Assistant pytest helper cannot initialize natively on this Windows workstation because it imports Unix-only `fcntl`; Docker Desktop's Linux engine was installed but not running at inspection | Real command output from `uv run pytest` and `docker version` | 2026-08-22 |

## Live Home Assistant verification

The redacted read-only inspection is recorded in [`docs/evidence/2026-08-22-home-assistant-environment.md`](evidence/2026-08-22-home-assistant-environment.md). The source UI remains authoritative; the snapshot must be revalidated where a fact can drift.

| ID | Resolution | Evidence | Remaining unknown |
|---|---|---|---|
| ENV-001 | `RESOLVED` | HA-LIVE-001 through HA-LIVE-003 | Revalidate versions at compatibility/release gates |
| ENV-002 | `PARTIAL` | HA-LIVE-003 through HA-LIVE-005 | Exact processor architecture; not required for the architecture-independent Phase 0 skeleton |
| ENV-004 | `PARTIAL` | HA-LIVE-012 through HA-LIVE-016 plus the user's prior successful audible test | Exact entity IDs, action identifier, and action payload/schema |
| ENV-007 | `RESOLVED FOR PHASE 0` | HA-LIVE-008 through HA-LIVE-011 plus DEC-016 | Manual-copy development bundle; later HACS distribution is tracked by ENV-011 |
| ENV-010 | `PARTIAL` | HA-LIVE-006 and HA-LIVE-022 through HA-LIVE-024 | Backup encryption/emergency-kit/restore readiness; remote-access method, TLS termination, VPN/reverse-proxy use, and relevant LAN/firewall segmentation |

## Prior proof requiring live revalidation

| ID | Prior evidence | Why it is not treated as current fact | Required revalidation |
|---|---|---|---|
| PRIOR-001 | Home Assistant received HTTP 200 from an LM Studio OpenAI-compatible chat-completions endpoint | Captured in the referenced conversation; host/model/service configuration may have changed | Test through the live environment without exposing the API token |
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
