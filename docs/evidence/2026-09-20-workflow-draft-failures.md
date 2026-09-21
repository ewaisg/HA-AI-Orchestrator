# WFL-005 draft failure usability

Bounded follow-up to the live r13 draft request that returned a generic failure.
The cause of that live failure remains unverified; these changes distinguish
failures without exposing provider output or automatically retrying.

The panel maps only own data-property error codes from a closed allowlist to
static actionable text: timeout, provider unavailable/failed, invalid selection,
invalid draft, changed/unavailable source, busy, cancelled, authorization and
unloaded integration. Unknown, inherited, accessor or malformed codes use a
generic message. Backend messages and payloads are never rendered. Request text
is retained, controls recover, and stale-session failures are ignored.

The backend reads normalized ProviderError codes through
safe_provider_error_code. Timeout/cancelled and connection/authentication/model
availability failures remain distinct from model draft validation failures.
Other normalized or malformed provider failures use draft_provider_failed.
An expired deadline still rejects a provider that suppresses cancellation.
No save, enable, action, cloud fallback or retry authority was added.

Verification on 2026-09-20:

- Core 2026.9.3 draft API tests: 70 passed in 7.91 seconds.
- Workflow draft browser tests: 38 passed in 2.77 seconds.
- Frontend typecheck and focused ESLint passed.
- Focused Python Ruff check and format passed.

Independent review requested from bedrock_completion. Live corrected-message
acceptance remains pending deployment and a fresh request.

## Follow-up: closed validation stages and corrected examples

After live r14 identified draft_invalid_response, inspection found concrete
prompt inconsistencies: a one-category classification example violated the
parser minimum of two, step examples omitted required step_id fields, and the
top-level instruction did not explicitly require all five fields. Examples now
include unique step IDs, valid classification categories and explicit field
bounds; a test extracts all five SYSTEM step examples and parses them together
through the real draft validator after substituting the selected notify target.

Six static stage codes distinguish unsupported/oversized result, JSON parsing,
top-level fields, workflow schema, unselected references and notify-before-compose.
Codes come only from a closed enum, not exception text or model output. The panel
maps each to a fixed actionable message. Forged diagnostic stages fall back to
the generic response error. No structured-output mode, fallback generation,
automatic repair or execution authority was added.

Verification: 76 transport tests passed in 11.53 seconds; 44 browser tests passed
in 2.53 seconds; typecheck, scoped ESLint, Ruff and diff checks passed. Independent
review requested from bedrock_completion. The exact stage of the live r14 failure
remains unknown until this change is deployed and a fresh request is tested.

## Independent WFL-008 startup recovery review

Reviewed workflow_manager.py and startup recovery tests without editing them.
Retries retain the original exact publication receipt and current provider,
document and target bindings; they never issue a new approval. The bounded timer
uses the current store record, skips an active mutation lock, removes disabled
or deleted workflows, and invalidates old callbacks on stop/restart. No blocking
finding. Independent startup recovery suite: 10 passed in 1.11 seconds.
