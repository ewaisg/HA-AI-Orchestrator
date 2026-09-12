# Independent review of 2026-09-12 commits and the r10 fixes

Scope: commits `9afc1b6..3c75d9e` (LOC-009 path fix, LOC-010, LOC-011,
WFL-003 including extract/branch, WFL-004, WFL-005 builder, LOC-012, the
editor lookup fix). A read-only reviewer subagent inspected the code against
`AGENTS.md` and the tracker claims and ran the Windows pure suite (437 passed).

## Findings and dispositions

| # | Severity | Finding (verified in code) | Fix |
|---|---|---|---|
| 1 | High | The list client threw on an execution record with `completed: true` and `skipped` steps, which is exactly what a not-taken branch produces live, so one such execution would blank the whole stored-workflows list. | `workflow-client.ts`: completed now means "no error"; a failed step implies not completed; skipped steps are accepted after a failure, after a not-taken branch, or when no provider was available. Contract tests cover a not-taken record and a no-provider record. |
| 2 | Medium | In-flight executions survived disable/delete/unload: nothing cancelled the task, `_running` was not cleared, and after a reload a fresh manager could run the same workflow concurrently. | `workflow_manager.py` tracks the task per workflow; `_deactivate` and `async_stop` cancel it and clear `_running`; a run whose evidence was reset while it ran records nothing. Tests: disable mid-run delivers nothing and resets evidence; stop mid-run cancels and a restarted manager runs cleanly. |
| 3 | Medium | Builder edit round-trip erased `description` and narrowed an any-transition state trigger to `to_state: "on"`. | Builder has a description field and treats an empty target state as "any change" (omits `to_state`); loading keeps both. Test round-trips a description and an any-transition trigger unchanged. |
| 4 | Low | A dry run kept running against an unloaded provider for up to 60 s and held the user's slot. | Dry runs run as tracked tasks; provider-entry unload cancels them (`async_cancel_provider_dry_runs`, wired in `__init__.py`). Test: unload during a run yields `dry_run_provider_unavailable` and clears the slot. |
| 5 | Low | Stored-workflows copy still said no step ever runs. | Copy now distinguishes observe and execute modes and states the notify-only scope. |

The reviewer also flagged that "one run per workflow at a time" was not held
across a foundation reload (now held by cancellation on stop) and that the
edit-in-builder claim did not cover description/any-transition (now it does).
Areas the reviewer checked with no defect: admin gating, notify-only service
scope, local-only provider selection, closed schema key sets and bounds,
context bounds, evidence redaction, event-loop hygiene, dry-run and
per-workflow busy guards, Lit stale-response guards, the content-addressed
panel path, and the catalogue bound contract.

## Gates after the fixes

| Check | Result | Log |
|---|---|---|
| Full backend, Core 2026.9.2 / 2026.9.0 / 2026.8.3 | 713 passed each | `artifacts/review-2026-09-12/full-backend-review-*.txt` |
| `scripts/run_pure_tests.py` | see `pure-reviewfix.txt` | |
| `npm --prefix frontend run check` | 244 browser tests; bundle 168,643 bytes SHA-256 `faaf9cc8…1333` | `frontend-reviewfix.txt` |
| Ruff, canary | clean, exit 0 | tool output |

## Live r10

Archive `outputs/r10/ai-orchestrator-r10.zip` (SHA-256
`8ef74df6c8153e2fcd329857b4ec091845e02e3ba41d9aa604436cb2548b1a46`, 29 files,
bundle 168,643 bytes) uploaded through the File editor, hashes matched,
installer reported `VERIFIED_ROLLBACK:
/homeassistant/.ai-orchestrator-backups/before-r10-2z2r5mvm/ai_orchestrator`
and `INSTALLED: 29 reviewed files, all bytes verified`; files removed. Core
restarted from Settings → System (no running automation reported). After
startup the panel registered
`/api/ai_orchestrator/panel/faaf9cc84ffef1cf/ai-orchestrator-panel.js`.
