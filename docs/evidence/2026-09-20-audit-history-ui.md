# AST-005A durable history UI

Owned files: frontend/src/api/audit-client.ts,
frontend/src/panel/audit-view.ts and frontend/test/audit.browser.test.ts.
Parent owns API registration and panel integration. Frozen r14 is untouched.

The new ai-orchestrator-audit element accepts hass and reads only the audit/list
command. The client checks the exact version-one envelope and mirrors the closed
audit_schema.py record fields, operation/kind/risk mapping, timestamps, UUIDs,
count limits, outcome consistency and monotonic page sequences. Invalid pages
fail closed without displaying raw data. Cursor pagination is explicit, limited
to 100 rows per request and 4096 displayed rows. Refresh restarts the current
retained listing; there is no polling or automatic replay.

The UI explains 90-day bounded retention, confirmed device-action metadata scope,
workflows not yet wired, uncertain outcomes, non-final counts, and the distinction
between a returned service call and a verified physical device change. No audit
UUID, household identifier, prompt or generated content is displayed. Identity,
connection changes and unmount clear rows and revoke late responses. Transport,
permission and malformed-response failures use one static actionable message.

Checks on 2026-09-20:

- 34 focused browser tests passed in 2.26 seconds.
- Frontend typecheck and scoped ESLint passed.
- Tests cover malformed fields, unsupported operations, timestamp precision,
  response ordering/cursors, unknown outcomes, session cleanup, explicit refresh,
  4096-row limit, 390px fit, keyboard focus and status announcements.
- git diff --check passed.

Independent schema/client review and live acceptance remain with the parent
release gate. This evidence does not claim workflow audit coverage or delivery
to a physical device.
