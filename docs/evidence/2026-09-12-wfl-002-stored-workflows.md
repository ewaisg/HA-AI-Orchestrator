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
| Browser tests (13 files) | 184 passed (186 after the review fixes below) |
| Build, sync, verify:bundle | 122,271 bytes, SHA-256 `5eee8a4ab742a130642cd4dc5310a146c0f9cffa4c8d0c920e01b874e08d0cae` (before review fixes); 122,523 bytes, SHA-256 `562edaf7f9d9c1c43eca9ad38e17880bbd574c190f3f828d4e60cdfffbe1c40c` (after) |

Restart evidence is the simulated kind: the manager test seeds the mocked
storage, sets up the foundation entry, observes a state change, unloads,
confirms the old listener is inert, sets up again, and observes again. A real
Core restart on the owner's instance is still required (ENV-015).

The bundle was built under Node 22 rather than the pinned 24; earlier this
session the same toolchain reproduced the committed September 9 bundle byte for
byte, which is the basis for trusting this build. Core 2026.9.0 was not rerun.

## Independent review and fixes (same day)

A separate read-only reviewer agent examined commit f10d227 plus the panel
change, reproduced its findings in scratch scripts, and returned **reject
(narrowly)** on two blocking findings. Both were real and are fixed:

| Finding | What was wrong | Fix and proof |
|---|---|---|
| B1 write failures reported as success | Home Assistant's `Store.async_save` logs `WriteError`/`SerializationError` and returns normally, so the store's `except` could never fire; memory and the WebSocket result diverged from disk. The original test patched `async_save` itself, which HA never raises from. | `_commit` now reads the store back after saving and rejects the write when the persisted payload differs. Test patches `Store._async_write_data` (the layer HA actually calls) with `WriteError` and `OSError`, including a first write into an empty store. |
| B2 concurrent saves lost a write | Whole-collection replace with no lock; overlapping admin mutations returned two successes with one document missing, and the manager could hold an observer the list no longer showed. | `asyncio.Lock` in the store and in the manager. Tests interleave three store mutations and two manager saves with a yielding write and assert both memory, disk, and observers contain every document. |

Non-blocking findings fixed: a mutation completing after foundation unload no
longer activates an orphan listener (manager re-checks `started` after the
await; test blocks the write across `async_stop`); a Home Assistant read error
or unsupported storage version during setup now reports an unreadable store
instead of failing the foundation entry after the panel registered (test);
typed `WorkflowNotFoundError` replaces the message-string comparison; the dead
boolean check in the API was removed; the panel no longer strands a mutation
when a reload or identity change overlaps it and disables Reload during a
mutation (test); a handed-over draft is dropped when leaving Automations
(test); the unreadable-store copy now says what it means (structurally invalid
data this version cannot validate; a JSON-corrupt file is renamed aside by
Home Assistant itself and loads as empty). Reattachment now has a test proving
exactly one additional list load.

Recorded, not changed: a manager retained after a failed cleanup does not
re-read the store on the next setup until Core restarts; a draft handed to the
editor while a save is in flight suppresses that save's list refresh.

After the fixes: 628 backend tests, 388 pure, 186 browser tests, lint, format,
canary, and bundle identity pass. The reviewer's verdict on the fixed revision
is recorded separately below when available.
