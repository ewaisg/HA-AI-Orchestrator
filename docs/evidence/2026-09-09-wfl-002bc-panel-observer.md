# WFL-002B/C observer harness and panel workflow preview

Date: 2026-09-09. Starting HEAD: d73890b (clean checkout).
WFL-002B is DONE for its isolated harness scope. WFL-002C is REVIEW pending owner
live desktop/Android acceptance of this new bundle. LOC-007 remains open.

## Concrete result and ownership

Automations now contains an offline workflow/snapshot JSON editor with explicit
synthetic evening/daytime examples. It sends only supplied JSON to an admin-only
preview endpoint, displays redacted trigger/condition outcomes and planned step
kinds, and saves or executes nothing. The existing lifecycle probe remains below
it. The Workflow runtime availability flag stays false.

Primary owned workflow_preview_api.py, registration in websocket_api.py,
test_workflow_preview_api.py, docs and packaging. UI subagent owned the client,
view, minimal Automations insertion, fixtures and browser tests. Backend subagent
owned workflow_observer.py and its HA tests. A separate reviewer inspected all
paths and independently reran API, UI and observer focused tests.

The observation-only harness uses actual HA state/time helpers but is not wired
into integration startup or exposed by any endpoint. It snapshots only condition
entities, retains one redacted outcome and saturating counters, deduplicates
listeners, and invalidates stale callbacks across stop/restart. Creation/removal
events without a complete transition are skipped. Failed unsubscribe handles are
retained for retry; new start is blocked until cleanup succeeds. No execution
callback, provider or action capability is accepted. Harness recreation tests are
not a claim of a real production Core restart or persisted workflow recovery.

## Verified contracts and review fixes

The preview endpoint is ai_orchestrator/workflow/preview with workflow_json and
snapshot_json strings, each bounded to 131072 characters. It requires an admin
and loaded foundation. Duplicate keys, nonstandard numbers, excessive nesting,
size violations and invalid schemas return static invalid_preview errors.
Results add schema_version=1 to the offline evaluator contract. Actual WebSocket
tests assert zero service/provider calls and zero live state reads.

Browser client validates the exact bounded result shape, enums, consistency and
zero counters. The view suppresses stale responses after edits, reset, removal,
connection loss and session changes, and blocks duplicate submissions. Review
found and fixed loss of disconnect protection on same-element reattachment.
The observer's intermediate invalid type import was fixed and tests rerun;
parent review then required failed-cleanup retry retention, also covered by tests.
No unresolved finding remains in the independently reviewed source scope.

Primary documentation checked against installed Core source:
[HA event helpers](https://developers.home-assistant.io/docs/integration_listen_events/)
and [callback thread safety](https://developers.home-assistant.io/docs/asyncio_thread_safety/).
Accessed 2026-09-09. The installed named Core versions, rather than assumed future
API behavior, are the tested compatibility boundary.

## Actual verification

| Check | Observed result |
|---|---|
| Actual Core 2026.9.0 preview WebSocket focused suite | 20 passed; independently rerun |
| Observer focused suite on each named Core | 19 passed each; 100% observer statement/branch coverage recorded by backend subagent |
| Independent final observer rerun, Core 2026.9.0 | 19 passed |
| npm --prefix frontend run check | 150 browser tests; lint/typecheck/build/sync/identity passed |
| Independent preview client/view tests | 34 passed |
| Final canonical source full Core 2026.9.0 pytest | 576 passed in 5.43s |
| Final canonical source full Core 2026.8.3 pytest | 576 passed in 5.18s |
| uv run ruff check . | All checks passed |
| uv run python scripts/canary_scan.py | Exit 0, no findings |
| node scripts/verify-frontend-bundle.mjs | One self-contained byte-identical bundle verified |
| git diff --check | Exit 0, line-ending notices only |

Raw backend logs: artifacts/workflow-panel-2026-09-09/{api.txt,
observer-core-202690.log,observer-core-202683.log,full-202690.txt,full-202683.txt}.
Final full tests ran from ~/.local/share/ha-ai-orchestrator/candidate-workflow-final-20260909
extracted from outputs/workflow-preview-panel/candidate.tar, with sibling
venv-202690 and venv-202683 Python using -m pytest -q.

The synthetic isolated component screenshot at
frontend/test/__screenshots__/workflow-preview-390px.png shows stacked editors.
It uses isolated inherited font styling and is not a production panel or live
Android screenshot. Container-width and accessibility tests passed. An attempted
page-viewport test extension hung and was removed; the complete final browser
gate was rerun successfully. No broad live mobile acceptance is inferred.

## Installable artifact and exact resume

Complete 21-file integration ZIP:
outputs/workflow-preview-panel/ai-orchestrator-workflow-preview.zip.
Archive SHA-256:
a8a7f0fe995a439b79ac3e965b9e0242d9eef542e2206c1928bcf564746ec071.
Per-file hashes: outputs/workflow-preview-panel/identity.json.
Bundle: 105464 bytes, SHA-256
c3434c673e13a7a3ee06c01aebfcbe4fa458676941a47786446a0927bb34aa0f.

Install the complete ZIP using docs/INSTALLATION.md, restart Core, then reopen
Automations. Load the evening example and preview: scenario passes with two
planned kinds. Load the daytime example and preview: time condition fails and
no steps are planned. Confirm both editors work on desktop and Android and that
the lifecycle probe remains accessible. This is the WFL-002C/ENV-014 live resume
point; no install, restart or live acceptance was performed by agents this turn.
Remaining LOC-003/004/005/008 evidence and LOC-007 still gate runtime publication.
