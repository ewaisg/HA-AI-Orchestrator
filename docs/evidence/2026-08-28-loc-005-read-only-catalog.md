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

## 2026-09-05 live inventory, search, refresh, and rendering acceptance

Performed through the browser session on the owner's authenticated Home Assistant instance (Core 2026.9.0). No household entity name, device name, or area name was recorded; only bounded counts and structural behavior are reported.

| Check | Observed result |
|---|---|
| Redacted live inventory | The catalogue reported **2,193 entities, 173 devices, 19 areas**, `AI access: none`, consistent across two independent visits in this session |
| Search by domain prefix | Filtering to `sensor.` narrowed the rendered row count; filtering to a nonexistent term (`ai_orchestrator`, which is not an entity ID prefix on this instance) correctly produced "No entities match this search." with zero rows, proving search is live-filtered rather than a static placeholder |
| Refresh | Clearing the search and pressing "Refresh" issued a new registry read; post-refresh counts were unchanged at 2,193/173/19, showing stability across a real re-read |
| Desktop rendering | At 1400×900, the table rendered up to hundreds of matched rows without layout defect |
| Narrow/mobile-width rendering | At 390×844, `scrollWidth` equaled `clientWidth` (no horizontal overflow) while the catalogue view was active |
| Scoped logs | No JavaScript console error was observed during search, refresh, or viewport resize |

Rename, removal, disabled/unavailable-state, and area/device relationship-change checks require mutating a real registry entry and were not performed in this session to avoid an unreviewed household change. Companion App Android (native shell) rendering remains unobserved. Status remains `REVIEW — LIVE ACCEPTANCE REQUIRED` pending those items.

## 2026-09-05 live rename round-trip acceptance

With the owner's explicit approval, one reversible entity rename was performed
and then undone, using the owner-selected low-risk entity
`camera.diveway_looking_sw_fluent` (existing default friendly name "Fluent",
area "Outdoor", device "Driveway Looking SW", integration Reolink). No other
household data was recorded.

| Step | Observed result |
|---|---|
| Rename via Home Assistant's native entity settings dialog | Set friendly name to "Fluent (LOC-005 test rename)" and pressed Update; Home Assistant's own entities list immediately reflected the new name |
| Catalogue reflects the rename | Searching the AI Orchestrator catalogue for `diveway_looking_sw_fluent` showed the entity as **"Fluent (LOC-005 test rename)"**, `available`, area "Outdoor", device "Driveway Looking SW", integration `reolink`, `None` AI permission — an exact match to the live registry state, proving the catalogue reads current registry data rather than a cache |
| Revert via the same dialog | Cleared the custom name field and pressed Update; Home Assistant's entities list returned to the default name "Fluent" |
| Catalogue reflects the revert | Re-searching the same term in the AI Orchestrator catalogue showed the entity restored to **"Fluent"**, with the same area/device/integration/permission fields unchanged |

This closes the live rename/registry-relationship-change gate for LOC-005. No
entity was renamed, disabled, or removed permanently; the household entity is
back in its original state. Removal, disabled/unavailable-state, and
area/device reassignment checks remain unperformed, and Companion App Android
(native shell) rendering remains unobserved. Status remains
`REVIEW — LIVE ACCEPTANCE REQUIRED` pending those items.
