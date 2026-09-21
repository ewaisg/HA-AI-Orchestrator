# AST-005A durable metadata schema and store

Status: backend schema/store slice verified; independent review and runtime
wiring remain required. This is not completion of AST-005 or SEC-003 and is not
included in the frozen r13 deployment.

## Implemented scope

`audit_schema.py` defines a closed version-one metadata schema and one-way
requested → authorized → started → committed/failed/unknown transitions.
Terminal rows cannot reopen. Exact counters distinguish attempted dispatch from
successful service return; a failed result cannot imply a known zero effect
after an unmatched dispatch. Unknown results explicitly have nonfinal counts.

Rows contain generated audit identities, generated parent audit references,
sequence, UTC timestamps, closed operation/kind/risk/phase/error enums, bounded
step index and counters. They accept no household/user/provider/workflow/entity
identity, label, state, argument, message, category, prompt, response, token,
credential or arbitrary error string. The store mints new identities itself;
parent references must already exist in its collection.

`audit_store.py` owns a separate Home Assistant private atomic Store:
`ai_orchestrator.audit`, major/minor versions 1/1. Writes are serialized and
read back from disk before the in-memory collection changes. A cancelled,
failed, ambiguous or externally changed write makes the store unavailable.

DEC-018 supplies the 90-day default retention. The root agent accepted the
additional implementation bounds of 4096 rows and 2 MiB for the actual serialized
Home Assistant envelope. Old terminal rows expire at the exact 90-day boundary;
capacity pruning removes oldest terminal rows earlier if necessary. Pending
rows are never evicted to admit a new request: saturation rejects new entries.
The limits are ceilings, not a guarantee that every row is retained for 90 days.

Loading durably converts all unfinished rows to `unknown`/`interrupted` with
nonfinal counts. It never reconstructs an approval, schedules a retry, calls a
provider or invokes a Home Assistant service. Clock reversal cannot decrease a
recovered record's timestamp. Normal transitions reject reversed timestamps.

## Storage handling

The installed Core Store implementation was inspected: `async_save` envelopes
use exact `version`, `minor_version`, `key`, `data`; native `async_load` renames
invalid JSON and returns an empty result. That behavior conflicts with preserving
an unreadable journal unchanged. The root explicitly approved a bounded,
executor-backed read-only envelope reader while retaining HA Store for every
atomic write. No direct filesystem write is implemented by the integration.

The reader rejects unknown envelope/payload fields and versions, duplicate JSON
keys, symlink/non-directory storage directories, symlink/nonregular files,
oversize files, changed file identity and changed metadata while reading.
Corrupt and unsupported files remain untouched. Native HA serialization is used
to measure the exact serialized file size before committing. There is no schema
downgrade or automatic import of old in-memory execution traces. Missing storage
is an empty first-install collection.

## Verification

Linux Home Assistant Core 2026.9.3, Python 3.14.5:

```text
python -m pytest tests/quality/test_audit_schema.py tests/home_assistant/test_audit_store.py --cov=custom_components.ai_orchestrator.audit_schema --cov=custom_components.ai_orchestrator.audit_store --cov-branch --cov-report=term-missing -q
65 passed in 2.92s
audit_schema.py: 62 statements,22 branches,100%
audit_store.py: 158 statements,44 branches,100%
```

Ruff passed. Checks include schema/redaction rejection, state/counter invariants,
terminal no-replay, actual HA Store envelope/write round trips, recovery write
failure, corrupt/forward-version preservation, read races, external edits,
write cancellation, concurrent updates, stale transitions, 90-day boundary,
clock reversal, byte/row saturation, pending retention and symlink rejection.

Early HA tests revealed the standard `hass` fixture replaces disk writes with
an in-memory mock. The focused fixture now scopes restoration of HA's original
writer to each test, so passing tests exercise real temporary-file writes and
actual disk readback. A first restoration attempt leaked a mock across fixture
teardown; its lifetime was corrected before the complete passing run. Those
earlier failed runs are not counted as behavior verification.

## Future wiring contract

`AuditStore(hass)` exposes `loaded`, `async_load()`,
`async_begin(operation, parent_id=None, step_index=None)`,
`async_transition(audit_id, expected_phase=..., phase=..., counters..., error_code=...)`,
`async_prune()` and `list(after_sequence=0, limit=100)`.

Runtime must instantiate one owner, load before accepting side effects, schedule
regular pruning, and shut down prior execution tasks before recovery. Hooks must
persist started intent before dispatch, then recheck real user/policy/provider/
target/state after that persistence await before consuming confirmation and
dispatching. A final-write failure must preserve uncertainty and must never
cause action retry. Query/auth/UI/repair hooks, callback cleanup, backup/restore
acceptance and live rollout are not implemented in this slice. Until wired, no
existing workflow/action execution is claimed to have durable audit records.

Resume: independent security review, followed by a separately tracked runtime
integration and failure-boundary test task. Preserve the frozen r13 artifact.

## Subsequent ActionManager integration

The root authorized an additional bounded ActionManager-only integration.
Its constructor now requires the shared loaded `AuditStore`; there is no
unaudited fallback. Proposal creation persists requested metadata before issuing
the human token. Confirmation persists authorized and started intent, then
refreshes initiating user permissions, target state/registry/service identity,
provider and grant revisions after every journal await. Only after these final
checks does it consume the token and dispatch with no intervening await.

Failed/ambiguous pre-dispatch persistence prevents the action. A successful
service return followed by an unconfirmed final write reports unknown; it does
not retry or recreate approval. Timed-out/cancelled effects remain uncertain.
Task ownership begins before proposal/confirmation persistence, so unload and
provider cancellation cover those phases as well as service dispatch.

The store retains an owned shielded writer across caller cancellation. Recovery
waits for that writer before reading or writing a fresh recovered collection.
An actual blocked executor write test exercises double cancellation and concurrent
reload, proving the old write finishes before recovery changes its requested row
to unknown. Python 3.14 reports exceptions from a cancelled shield even when a
later waiter retrieves them; the worker therefore returns a closed success flag
instead of raising through a cancelled shield. Caller-facing failures remain
static and fail closed. The first error-injection run exposed this behavior and
failed teardown; the final passing run includes that regression.

Supported lifecycle order for a retained manager is `stop()` →
`await async_wait_stopped()` → drain maintenance/load/recover the shared audit
store → `await async_start()`. A failed task-drain bound must not allow audit
recovery or new actions while an old task can still make a terminal write.

Current combined Core 2026.9.3 result:

```text
169 passed in 10.43s
action_manager.py: 254 statements,80 branches,100%
audit_schema.py:    62 statements,22 branches,100%
audit_store.py:    176 statements,48 branches,100%
```

The command includes `test_action_manager.py`, `test_action_api.py`,
`test_action_ai_api.py`, `test_audit_schema.py` and `test_audit_store.py` with
branch coverage for the three modules above. Cases include actual persistence
phase ordering, no household identifier/token content, permission/state/grant/
service/expiry changes during persistence, ambiguous writes at every phase,
predispatch cancellation, suppressed cancellation, duplicate proposals and
restart-no-replay. Dedicated audit-store tests use real HA atomic disk writes;
manager fixtures use an explicit memory disk double for deterministic await
fault injection. No live action or runtime/API/UI rollout is claimed by this
result. Root owns those files and tests separately.

The isolated 65-test schema/store revision received independent approval. The
writer-ownership and manager integration revisions are awaiting renewed review.
An open maintenance detail is expiring abandoned unconfirmed proposal records:
pending rows intentionally cannot be evicted for capacity; until maintenance is
wired, saturation fails closed and restart recovery marks them unknown.

## Final expiry maintenance and reviewed gate

That maintenance detail is now implemented as
`ActionManager.async_expire_proposals()`, for the root-owned lifecycle callback
to invoke before audit pruning. It scans at most 4096 rows, in pages of at most
100, and closes only requested records whose server timestamp age is at least
300 seconds or whose matching live token has reached its monotonic expiry.
It uses a requested-phase compare-and-swap before revoking matching token
bindings. Authorized/started rows and concurrent confirmation winners are
untouched. The scan also finds abandoned rows after provider unload cleared the
in-memory token. Unload tracks and cancels maintenance tasks.

Clock reversal cannot cause early expiry. If monotonic expiry has elapsed while
the wall clock remains behind a record's timestamp, its metadata transition
stays blocked until the clock catches up; the token itself is still expired.
Runtime audit-store identity is rechecked along with manager/grant-store identity.

Final owned-module gate on Core 2026.9.3:

```text
229 passed in 11.22s
action_confirmation.py:  47 statements, 8 branches,100%
action_manager.py:      288 statements,94 branches,100%
action_policy.py:        34 statements, 6 branches,100%
audit_schema.py:         62 statements,22 branches,100%
audit_store.py:         176 statements,48 branches,100%
```

This combines the prior five test files with the pure action policy and
confirmation suites. Ruff passed. The independent security reviewer approved
the final store, writer ownership, action hooks, audit-store ownership and
expiry boundary after separately running **213 integration tests in 12.53s**,
including lifecycle/init/WebSocket tests owned by root. No blocking findings
remained; whole-artifact testing and live rollout are still separate gates.
