# WFL-002 stored workflows: persistence, activation, panel

Date: 2026-09-12. Starting HEAD: e123059 (clean). Owner direction this day:
continue toward running features while the LOC-007 live items stay open.

## What exists now

- `workflow_store.py`: workflow documents in `.storage/ai_orchestrator.workflows`
  through Home Assistant's `Store` (version 1, private, atomic writes). Load
  migrates and validates every document and fails closed on any invalid
  container, document, duplicate ID, or count above 50, without rewriting.
  Writes validate first, then commit the whole collection; a write failure
  leaves memory and disk unchanged.
- `workflow_manager.py`: created by the first loaded foundation entry. Loads
  the store, starts one `WorkflowObserver` per enabled document, stops all on
  the last foundation unload. Activation failures and cleanup failures are
  recorded per workflow; a workflow whose cleanup failed is not re-activated
  until the retry succeeds, and a manager with pending cleanup is retained
  across unload and reused by the next setup. An unreadable store leaves every
  workflow inactive and refuses writes while the rest of the panel works.
- `workflow_api.py`: admin-only `ai_orchestrator/workflows/list|save|delete|
  set_enabled|run_manual`. Static error codes; schema failures name a field only.
- Frontend: `workflow-client.ts` (closed parsers that reject any side-effect
  counter), `workflows-view.ts` (list, enable/disable, observe, load into
  editor, two-step delete, stale-response guards), editor `Save as workflow`
  and draft handoff, panel wiring.

Nothing executes a step. There is no provider call, notification, or Home
Assistant service call anywhere in this change; tests assert zero calls.
`features.workflows` in the status response stays false.

## Verification in this container (Core 2026.8.3, Python 3.14.5, Node 22.22.2)

| Check | Result |
|---|---|
| New HA tests: store 9, manager 7, API 18 (parametrized cases counted) | 46 passed |
| `uv run python -m pytest -q` | 622 passed |
| `uv run python scripts/run_pure_tests.py` | 388 passed |
| `uv run ruff check .` / `ruff format --check` | clean |
| `uv run python scripts/canary_scan.py` | exit 0 |
| Frontend scripts check, lint, typecheck | clean |
| Browser tests (13 files) | 184 passed |
| Build, sync, verify:bundle | 122,271 bytes, SHA-256 `5eee8a4ab742a130642cd4dc5310a146c0f9cffa4c8d0c920e01b874e08d0cae` |

Restart evidence is the simulated kind: the manager test seeds the mocked
storage, sets up the foundation entry, observes a state change, unloads,
confirms the old listener is inert, sets up again, and observes again. A real
Core restart on the owner's instance is still required (ENV-015).

The bundle was built under Node 22 rather than the pinned 24; earlier this
session the same toolchain reproduced the committed September 9 bundle byte for
byte, which is the basis for trusting this build. Core 2026.9.0 was not rerun.
