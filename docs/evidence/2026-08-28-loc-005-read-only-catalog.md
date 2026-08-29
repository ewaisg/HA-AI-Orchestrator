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

## Exact candidate verification and next gate

The Docker Linux engine later responded without a project-side settings mutation. Exact Git-archive candidate `989917fd4229f528c142a9ecebeeea3934c394da` passed 340 full tests, 98 focused Home Assistant/provider-contract/catalog tests, 30 security/evidence/traceability tests, 231 pure tests, Ruff format/lint, and canary. The frontend passed 95 browser tests plus lint, typecheck, build, sync, and byte identity. Independent workflow/safety and test/release reviewers approved the exact candidate for synthetic/pre-live acceptance and found no catalog action, state-value, provider-secret, or authorization regression.

Live acceptance must record a redacted inventory sample on Core `2026.8.3`, desktop and Companion App Android rendering, a real entity rename or approved reversible equivalent, removal/missing, disabled/unavailable, area/device relationship changes, refresh, reload, and scoped logs. No household entity or device names belong in committed evidence.

## Acceptance status

`REVIEW — LIVE ACCEPTANCE REQUIRED`. The exact code candidate has both independent synthetic/pre-live approvals. It is not `DONE`, installed, or live-verified. Manifest: `docs/evidence/manifests/LOC-005/LOC-005-REGISTRY-CATALOG-002.json`.
