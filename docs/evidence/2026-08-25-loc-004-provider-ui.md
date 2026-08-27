# LOC-004 bounded provider setup and test UI evidence — 2026-08-25

## Scope

LOC-004 replaces the empty Providers panel with an administrator-only view of provider connections already owned by Home Assistant config entries. It provides a deliberate connection-test action and a link to Home Assistant's native AI Orchestrator integration management page. Provider setup and credentials remain in the backend config flow; the panel does not implement its own credential form.

This task does not add chat, prompts, model output display, entity access, Home Assistant actions, workflow execution, cloud routing, provider capabilities inferred from protocol support, or a browser-to-provider network path.

## Live route evidence

A read-only inspection of the owner's authenticated Home Assistant Core `2026.8.3` UI on 2026-08-25 observed:

- Settings exposed `Devices & services` at `/config/integrations`.
- Home Assistant resolved the integrations dashboard to `/config/integrations/dashboard`.
- The installed AI Orchestrator card linked to `/config/integrations/integration/ai_orchestrator`.
- That integration page displayed the existing entry and an `Add hub` control.

No setup flow was opened, no form was submitted, and no live state changed. This exact route is claimed only for the named Core version under DEC-023.

## Implemented boundaries

- Both provider WebSocket commands require a Home Assistant administrator.
- The list response contains only schema version, canonical connection ID, adapter type/display name, user-visible entry title, and normalized health. Stored configuration, token, base URL, model ID, Home Assistant config-entry ID, and provider object never enter the response.
- A connection test accepts only the canonical ID of a currently loaded provider entry. It cannot receive an endpoint, credential, prompt, entity, tool, action, or request body from the browser.
- The backend calls the selected provider's bounded `validate_connection` method, maps failures to the provider-neutral error taxonomy, suppresses exception text, and permits only one in-flight test per connection.
- The frontend accepts exact version-1 response shapes, canonical identifiers, a closed health-state set, and a closed error-code set. Extra fields, mismatched connection IDs, arbitrary error strings, and malformed responses fail closed.
- The provider list loads without contacting a provider. A provider is contacted only after an administrator selects `Test connection`. The request contains only the configured connection ID and remains inside Home Assistant; the backend owns the provider request.
- Visible states include `Checking`, `Healthy`, `Degraded`, `Unavailable`, `Authentication required`, and `Not tested`; labels accompany color.
- The setup/manage link uses the exact current-Core route observed above. Empty, ready, failure, test-success, test-failure, and retry behavior are covered by browser tests.

## Observed remediation during implementation

The first browser run failed seven tests because the standalone test view had not registered its custom element and the error colors failed automated WCAG contrast. After registration and contrast fixes, one test exposed a duplicate provider-list request during mount. A single scheduled-load guard removed the duplicate. The final frontend gate passes all tests. These earlier failures are not counted as passes.

A focused Linux backend run then exposed an incorrectly placed test assertion while adding the duplicate-test control. The test was corrected and the final focused and full artifact gates pass.

## Exact artifact verification

Immutable implementation artifact `079d93f14fbbe9bd2da0658072d65a969f8b954d` was reconstructed from a Git archive in clean Linux with Python `3.14.5`, Home Assistant `2026.8.3`, and pytest Home Assistant plugin `0.13.357`.

| Check | Observed result |
|---|---|
| Full clean Linux suite | 330 passed |
| Provider WebSocket focused suite | 16 passed |
| Security/evidence/traceability suite | 30 passed |
| Pure test runner | 228 passed; five known upstream dependency deprecations |
| Ruff format/lint | Passed |
| Canary scan | Passed with no findings |
| Revision diff check | Passed |
| Canonical artifact hashes | Passed; recorded in the LOC-004 manifest |
| Frontend lint/type/browser/build/sync gate | 61 browser tests passed; 6 files; self-contained 64,066-byte bundle verified byte-identical |
| Frontend bundle SHA-256 | `934b0339a19e219311a11a569601ce2804ed85c2ce266ede85d80518b57561b9` |

## Remaining gates

1. Install the accepted artifact bundle on the named Home Assistant Core `2026.8.3` target.
2. Use the owner's existing backend config flow to add the LM Studio connection. Never copy the token or full private endpoint into evidence.
3. Record desktop and Companion App Android screenshots for empty and configured provider states, with private identifiers redacted.
4. Record redacted positive connection-test behavior, isolated invalid-credential behavior, duplicate-click behavior, reload/unload/restart behavior, Home/foundation health, mobile layout, and scoped logs.

## Acceptance status

Independent workflow/safety review approved exact artifact `079d93f14fbbe9bd2da0658072d65a969f8b954d` at `2026-08-27T03:45:04Z`; no acceptance-blocking privacy, authorization, duplicate-test, or browser-provider transport defect was found. Independent test/release review approved the same artifact at `2026-08-27T03:45:05Z` after reproducing the clean archive and frontend gates. These approvals cover synthetic artifact quality only. `REVIEW — LIVE ACCEPTANCE PARTIAL`: the approved UI is installed on the owner's authenticated local Home Assistant page. The Providers view showed one saved LM Studio connection as `Healthy`; after browser reload, Home still displayed `None contacted`, Providers still displayed the saved connection, and a second explicit connection test displayed `Connection test passed`. Reconfiguration with an intentionally invalid API key was rejected with the bounded message `The provider rejected the authentication details.`; the invalid value was not saved. Reconfiguration with the valid key then saved successfully. No token, full endpoint, or model identifier was recorded. Duplicate-click behavior, integration reload/unload/restart, Companion App Android, screenshots, and scoped-log evidence remain outstanding. LOC-004 cannot be `DONE` until the remaining redacted live checks pass.
