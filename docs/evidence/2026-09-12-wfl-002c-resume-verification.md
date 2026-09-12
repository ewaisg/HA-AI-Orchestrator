# September 12 main-branch re-verification, independent review, and LOC-010/011 fixes

Date: 2026-09-12. Performed on local `main` at `1f71fc4` before the
`claude/sharp-sagan-xl2abm` branch was fetched. That branch had already
recorded owner acceptance of WFL-002C (archive 7150189) and landed WFL-002
stored workflows (d63e39a, installed live). The fixes below were cherry-picked
onto d63e39a; the r2 archive described here was never installed and is
superseded by the r3 archive built from the rebased commit.

## What was checked

The prepared WFL-002C candidate was re-verified against the current HEAD, and
every automated gate was rerun from the current source. Logs are retained
locally under `artifacts/review-2026-09-12/` (ignored directory).

| Check | Observed result | Log |
|---|---|---|
| Per-file SHA-256 in `outputs/workflow-preview-panel/identity.json` vs `git show HEAD:` (LF-normalized) | 21 of 21 files match; no mismatch | Tool output |
| `ai-orchestrator-workflow-preview.zip` SHA-256 | Matches `a8a7f0fe…c071` | Tool output |
| `uv run python scripts/run_pure_tests.py` (Windows) | 388 passed; 5 dependency deprecation warnings | `pure.txt` |
| Core 2026.9.0 full pytest (WSL, `venv-202690`) | 576 passed | `full-backend-202690.txt` |
| Core 2026.8.3 full pytest (WSL, `venv-202683`) | 576 passed | `full-backend-202683.txt` |
| `npm --prefix frontend run check` | 150 tests across 11 files; scripts, lint, typecheck, build, sync, identity passed | `frontend.txt` |
| `node scripts/verify-frontend-bundle.mjs` | 105,464 bytes, SHA-256 `c3434c67…aa0f` | Tool output |
| `uv run ruff check .` | Exit 0 | `ruff.txt` |
| `uv run python scripts/canary_scan.py` | Exit 0, no findings | `canary.txt` |
| `git diff --check` | Exit 0, line-ending notices only | Tool output |

The WSL run used a fresh extraction of `outputs/workflow-preview-panel/candidate.tar`
at `~/.local/share/ha-ai-orchestrator/candidate-head-20260911` with the
existing sibling `venv-202690` and `venv-202683` environments.

## Installer prepared and dry-run

`work/install_workflow_preview_candidate.py` (ignored `work/` directory) adapts
the independently reviewed LOC-006 installer to this candidate: it requires the
exact archive hash, exactly 21 members under `custom_components/ai_orchestrator/`,
path-traversal and symlink rejection, Python compilation, the exact bundle hash,
a byte-verified scoped rollback copy, atomic per-file replacement, and
post-install byte verification. A local dry run over an extracted LOC-009
candidate reported `INSTALLED: 21 reviewed files, all bytes verified`, and all
21 installed files matched `identity.json`; the rollback directory was created.
This is a local simulation, not a Home Assistant installation.

## Blocker at the time, later resolved

At this point no Home Assistant address, Chrome session, or SMB mapping was
available to agents. The owner then supplied the address; the branch's record
shows ENV-014 was already resolved by the owner's own installation of archive
7150189. Later sections of the day are recorded in
`docs/evidence/2026-09-12-wfl-002-stored-workflows.md` and the live-session
record that follows this file.

## Independent code review

See the review section appended below.

An independent read-only review subagent inspected every integration source file
and the frontend sources against `AGENTS.md` boundaries. It found no admin-check,
secret-leak, blocking-I/O, preview-validation, chat-lifecycle or stale-response
defect, and no contradiction between the code and the installation or offline
preview guides. It reported three confirmed defects; the primary re-verified each
against the code before acting.

| Finding | Verification | Disposition |
|---|---|---|
| Chat generated request identifiers with `crypto.randomUUID()`, which browsers expose only in secure contexts. Over plain-HTTP LAN access every send fails with the generic error before contacting the backend. | Confirmed at `frontend/src/panel/chat-view.ts` (single call site); backend requires a canonical v1–v5 UUID. | Fixed as LOC-010: `newRequestId()` in `chat-client.ts` builds a canonical lowercase v4 UUID from `crypto.getRandomValues`. New browser test removes `Crypto.prototype.randomUUID`, checks 200 canonical unique ids, and sends a chat message successfully. The test fails against the previous code (1 failed / 20 passed) and passes with the fix. |
| `config_flow.py` finishes reauth/reconfigure through `async_update_reload_and_abort`, whose default reasons `reauth_successful` and `reconfigure_successful` had no entry in `translations/en.json`. | Confirmed: Core `config_entries.py` defaults those reasons; the two tests asserting them exist; `en.json` lacked both keys. | Fixed as LOC-011: both keys added. New pure test `tests/quality/test_translations.py` derives every explicit `async_abort` reason from source plus the two implicit ones and requires a non-empty translation. It fails without the fix and passes with it. |
| The catalogue WebSocket returns every registry entity/device/area with no cap, while `catalog-client.ts` rejects lists longer than 10,000 items, so a registry above that size renders as a permanent load error. | Confirmed: no bound in `catalog.py`; `MAX_CATALOG_ITEMS = 10_000` in the client. The owner's recorded inventory (2,193 entities) is below the limit. | Not changed. Recorded as LOC-012 (TODO) because the remedy is a contract change (paging or a bounded, truncation-flagged response) that needs a design decision. |

## Revised candidate (r2) after the fixes

| Check | Observed result | Log |
|---|---|---|
| `uv run python scripts/run_pure_tests.py` | 389 passed | `pure-r2.txt` |
| `npm --prefix frontend run check` | 151 tests across 11 files; lint, typecheck, build, sync, identity passed | `frontend-r2.txt` |
| Bundle | 105,753 bytes, SHA-256 `9b709dc0eaf709b118814c0501348cd690573e6d4ff11bbbf017d4be3096fd14` | `frontend-r2.txt` |
| Core 2026.9.0 full pytest (WSL, fresh extraction of `outputs/wfl-002c-r2/candidate.tar`) | 577 passed | `full-backend-r2-202690.txt` |
| Core 2026.8.3 full pytest (same snapshot) | 577 passed | `full-backend-r2-202683.txt` |
| `uv run ruff check .` after one import-order autofix in the new test | All checks passed | Tool output |
| `uv run python scripts/canary_scan.py` | Exit 0 | Tool output |

Complete 21-file integration archive: `outputs/wfl-002c-r2/ai-orchestrator-workflow-preview-r2.zip`,
SHA-256 `051ac97aa3d1c4dae25a65ad0630a355da0c04332952b3927c872293cfd7be4a`;
per-file hashes in `outputs/wfl-002c-r2/identity.json`. This r2 archive was built from `main` only and was
never installed; it is superseded by the r3 archive built from the branch. `work/install_workflow_preview_candidate.py` was
re-pointed at the r2 hashes and dry-run over an extracted copy of the September 9
candidate; see the installer section above for what it verifies.

## Exact resume point

Superseded: see the tracker's current resume point (branch line, ENV-015).
