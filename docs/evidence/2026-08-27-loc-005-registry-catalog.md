# LOC-005 read-only registry catalog evidence — 2026-08-27

## Scope

LOC-005 adds an administrator-only, read-only Home Assistant registry catalog for areas, devices, and entities. The catalog returns identity and relationship metadata only: names, canonical IDs, area/device relationships, and disabled status. It does not read current entity state, contact an AI provider, expose provider configuration, or execute Home Assistant actions.

The panel adds the catalog under **Entities & Permissions**. Responses are versioned and parsed fail-closed in the browser. Registry entries are sorted deterministically by ID. Empty, error, and refresh states are bounded.

## Exact artifact verification

Immutable implementation artifact `238928b518ee9b9c3e64e5a4dd3d52b9fcae0288` was tested from the working repository after commit. Home Assistant `2026.8.3`, Python `3.14.5`, and the project dependency lock were used for backend checks. The frontend used the repository's locked Node/npm dependencies and Playwright browser runtime.

| Check | Observed result |
|---|---|
| Full backend suite | 332 passed |
| Focused WebSocket suite | 18 passed |
| Backend Ruff format/lint | Passed |
| Canary scan | Passed |
| Frontend lint and typecheck | Passed |
| Frontend browser suite | 69 passed across 8 files |
| Frontend build/sync/bundle identity | Passed; 70,529 bytes; SHA-256 `db5384d05908422d5c76c04b9dd5c177fde819d49924dd26de15532c23de3f1f` |

## Security review points

- The catalog WebSocket command requires a Home Assistant administrator.
- Its request schema accepts only the command type; no caller-supplied entity, state, endpoint, credential, prompt, tool, or action is accepted.
- The response contains only registry identity metadata and does not call the provider runtime or Home Assistant action services.
- The frontend accepts only the exact version-1 response shape and fails closed on extra or malformed fields.
- The frontend has no catalog action controls and displays an explicit read-only boundary.

## Remaining gates

1. Independent workflow/safety and test/release review of exact artifact `238928b518ee9b9c3e64e5a4dd3d52b9fcae0288`.
2. Install the updated bundle on the named Home Assistant Core `2026.8.3` target.
3. Record a redacted live catalog result from the owner's registries, including areas, devices, entities, relationships, disabled entries, empty behavior where applicable, and no state/action/provider traffic.
4. Test registry rename, removal, disable, unavailable, and device/area relationship changes on the target before LOC-005 can be marked `DONE`.

## Acceptance status

`REVIEW — SYNTHETIC GATES PASSED; LIVE AND INDEPENDENT REVIEW PENDING`. No live registry inventory or rename/removal result is claimed. LOC-005 must not be marked `DONE` until the independent reviews and redacted live registry evidence pass.
