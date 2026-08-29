# LOC-005 read-only registry catalogue evidence — 2026-08-28

## Scope

LOC-005 replaces the empty **Entities & Permissions** tab with an administrator-only, read-only view built from Home Assistant Core `2026.8.3` entity, device, and area registries. It supports search by returned entity ID, name, domain, integration platform, area, or device. Every row explicitly reports `AI permission: None`; this task does not create permissions, send context to a provider, expose state values or attributes, or call a Home Assistant action.

## Implemented boundary

- `ai_orchestrator/catalog/list` accepts no caller-controlled filter, target, entity, action, endpoint, or provider data and requires a Home Assistant administrator.
- Every request reads the current registries; no indefinite catalogue cache is created.
- Entity identity includes the Core registry entry ID and current entity ID. Area resolution records whether the current relationship comes from the entity or its device.
- The response includes only bounded metadata fields: area ID/name; device ID/name/area/manufacturer/model/disabled; and entity registry ID/entity ID/domain/platform/name/device/area/disabled/availability classification.
- Entity state values, attributes, device identifiers/connections, config-entry IDs, labels, aliases, credentials, provider configuration, and actions are absent.
- The frontend fails closed on an expanded or malformed version-1 response and limits each returned collection to 10,000 parsed items.
- Search and responsive table rendering are browser-local after the authenticated Home Assistant response. Refresh performs one new read-only registry request.

## Synthetic verification completed

| Check | Observed result |
|---|---|
| Registry unit/component source | Covers exact response shape, omission canaries, stable registry ID across entity rename, removal, entity/device area changes, area deletion, unavailable/not-loaded, disabled, admin authorization, and rejection of request fields |
| Focused LM Studio regression | 61 passed; five known upstream dependency deprecations |
| Windows-safe pure suite | 229 passed; five known upstream dependency deprecations |
| Frontend gate | 94 browser tests passed; lint, typecheck, build, sync, and bundle byte identity passed |
| Frontend bundle | 75,326 bytes; SHA-256 `c93f074889a31d1dfae23752b19ac3179bf118d7fe063774f0229aa1ae6a874d` |
| Ruff format/lint | Passed |
| Canary scan | Passed with no findings |
| Working-tree diff check | Passed; line-ending notices only |

## Incomplete evidence and next gate

The Home Assistant component tests were authored against the exact pinned Core registry APIs, but they have not yet completed in clean Linux for this working tree. Windows cannot collect the Home Assistant plugin because `homeassistant.runner` imports `fcntl`. Bounded Docker Desktop 4.75.0 startup attempts failed before the Linux engine started: the backend log reports that the optional inference manager could not remove its `dockerInference` listener socket. No Docker settings change, reset, or file removal was authorized or performed. This is recorded as an incomplete test, not a pass.

After clean-Linux verification and a committed candidate, independent workflow/safety and test/release reviews are required. Live acceptance must then record a redacted inventory sample on Core `2026.8.3`, desktop and Companion App Android rendering, a real entity rename or approved reversible equivalent, removal/missing behavior, refresh, reload, and scoped logs. No household entity or device names belong in committed evidence.

## Acceptance status

`IN PROGRESS`. The feature is implemented in the working tree and its Windows-safe gates pass. It is not accepted, published, installed, or live-verified.
