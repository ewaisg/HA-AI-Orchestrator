# AST-004 pure action policy and confirmation primitives

Status: implementation verified locally; independent security review and runtime
integration remain required. This is not an action-capable release.

## Scope and decisions

Two new pure modules, `action_policy.py` and `action_confirmation.py`, implement
explicit reviewed tool risk classification and one-use confirmation binding.
There is no action catalog, Home Assistant dispatch, runtime/API registration,
permission persistence, or frontend. No actual household action is permitted by
these files. The default empty rule set denies every request. Critical rules are
always rejected; model-supplied classifications cannot define trusted policy.

Every approval binds exact initiating user, agent, request, versioned tool,
registry identities, validated argument digest, state/revision digest, and
policy/scope/provider/workflow revisions. Tokens are cryptographically random,
stored only by hash in bounded process memory, and expire after 300 seconds.
At most 128 tokens can await use. Consumption is protected by a lock and removes
the token before rechecking fresh authority, expiry and all binding fields.
Failed consumption cannot be replayed. Restart/new instance or explicit clear
revokes pending approvals. All supported risk levels currently require an
approval; no policy claims that a low-risk action is automatically safe.

These bounds and API are implementation design decisions, not external platform
guarantees or owner approval of any action category.

## Verified checks

On Windows, repository Python virtual environment:

```powershell
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
.venv/Scripts/python.exe -m coverage run --branch --include='*/action_policy.py,*/action_confirmation.py' -m pytest -p pytest_asyncio.plugin tests/quality/test_action_policy.py tests/quality/test_action_confirmation.py -q
.venv/Scripts/python.exe -m coverage report -m
```

Result: **52 passed**, five dependency deprecation warnings. Both modules have
**100% statement and branch coverage** (78 statements, 14 branches total).
Ruff check of both modules and both test files passed after formatting.

Cases cover denied empty/ambiguous policies, malformed bindings, explicit risk
levels, always-denied critical, revoked authority, every changed binding field,
state/revision changes, exact expiry boundary, failed-use burning, unknown
tokens, concurrent replay, bounded capacity, expiry cleanup and restart/revoke.
All identities and arguments in tests are synthetic.

An initial coverage invocation using dotted `--source` module names failed
during collection through duplicate Home Assistant/bcrypt imports on Windows;
the file-pattern `--include` command above collected and passed without that
import side effect. No failed check is treated as passing.

## Integration requirements and open evidence

- A separately reviewed typed action catalog must establish actual allowed
  domains/operations, schemas, risk floor and target rules. No generic service
  executor may be exposed to a model.
- Backend builds canonical argument and state/revision digests, trusted revision
  identifiers and stable registry identities; none can be accepted as authority
  from browser/model input. A state revision must change for change-then-restore.
- Authenticated human UI receives the token and an exact action summary; the
  provider must never receive tokens. The runtime must recheck current user
  permissions and target availability immediately before consumption/dispatch.
- No intervening asynchronous wait after consumption and before dispatch;
  failure or unknown dispatch outcome must not recreate the token or retry.
- This primitive is one-use per token, not a durable execution journal or request
  deduplicator. Runtime still owns duplicate proposal/dispatch protection, audit
  phases, timeouts and cancellation. Do not claim exactly-once device effects.
- Runtime ownership must call clear on unload/revocation, or replace the store;
  scope and policy revisions must change on every edit.
- Independent security review, UI and Home Assistant integration tests, and a
  harmless owner-selected live action are still needed for AST-004/AST-006.

Resume: independently review these pure modules, then wire a reviewed typed
action proposal/confirmation path after the exact permitted action scope and
confirmation UI are resolved. Tracker/evidence-register updates belong to the
primary tracker steward; household action policy remains ENV-005.

## Subsequent wired backend slice

`action_store.py`, `action_manager.py` and `action_api.py` now implement a separate
persisted per-provider explicit grant store plus administrator-only catalog,
save, propose and confirm WebSocket commands. Root owns runtime registration,
frontend wiring and the separately tested AI interpretation path. This evidence
does not claim live installation or actual device operation.

The implemented catalog covers individual light on/off and media play/pause/
volume (0 through 1). Switch IDs are reserved but all switch resolution and
grants are denied until per-target risk classification exists. Security domains
and arbitrary actions are absent. Entity groups and media groups with any other
member are rejected. Discovery requires real registry identities, current
availability, installed services and reported media feature support.

The backend rechecks current active administrator and HA read/control
permissions, provider configuration/instance, grant revision, exact target
identity, current state, attributes and last-updated timestamp after the
permission lookup. Confirmation additionally requires the original service
registration object. The human approval token is never passed to a provider.
One dispatch receives the initiating HA user context and has a 10-second bound.
Timeout, failure or suppressed cancellation never becomes a success or retry.
`completed` means the service returned, not that physical hardware was observed.

Proposals are bounded to 128; recent user/request identities to 256 with
600-second retention. Token lifetime is 300 seconds. Request replay is denied
within retention, even after stop/start. Unload clears approvals and cancels
dispatches; restart refuses to reopen if prior dispatch tasks do not finish
within its bounded wait. Persistent grant writes are read back before activation;
failed/cancelled/ambiguous writes make all previous in-memory grants unavailable.

Verified on the named Linux Core 2026.9.3 environment:

```text
python -m pytest tests/home_assistant/test_action_manager.py tests/home_assistant/test_action_api.py tests/home_assistant/test_action_store.py --cov=custom_components.ai_orchestrator.action_manager --cov=custom_components.ai_orchestrator.action_store --cov=custom_components.ai_orchestrator.action_api --cov-branch --cov-report=term-missing -q
88 passed in 5.03s
action_api.py:     61 statements,  6 branches, 100%
action_manager.py: 202 statements, 68 branches, 100%
action_store.py:   91 statements, 30 branches, 100%
```

Ruff passed. Early test development failures (missing custom integration test
fixture and wrong WebSocket user fixture) were corrected using the repository's
existing synthetic local provider setup and access-token fixtures; a duplicate
test-helper argument was fixed. Those failed attempts did not verify behavior.

The independent workflow/security reviewer approved the pure primitives and
the subsequent 65-test backend revision, with findings fixed before approval.
See [independent review](2026-09-20-action-independent-review.md). The final
88-test run adds 23 regression cases and changes no production code from that
reviewed revision. Live owner-selected action acceptance, frontend gates and
the complete release remain open; no project completion is claimed.
