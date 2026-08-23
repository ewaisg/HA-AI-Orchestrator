# FND-011 panel lifecycle evidence - 2026-08-23

## Scope and source

This record tracks the live compatibility matrix for the bundled AI
Orchestrator panel. The version baseline below was transcribed from a screenshot
of **Settings -> About** supplied directly by the project owner in the active
task on 2026-08-23. The screenshot displayed no credential, network address,
account identifier, entity, or household detail.

## Named compatibility baseline

| Evidence ID | Observed value | Result |
|---|---|---|
| FND-011-LIVE-001 | Installation method: Home Assistant OS | Confirmed |
| FND-011-LIVE-002 | Core 2026.8.3; Supervisor 2026.07.5; Operating System 18.2; Frontend 20260729.7 | Confirmed |
| FND-011-LIVE-003 | Config-entry removal and clean reinstallation completed; the panel and expected foundation state returned; the exact `ai_orchestrator` log search reported `No issues found for search term 'ai_orchestrator'` | Confirmed by direct project-owner report |
| FND-011-LIVE-004 | The exact supported `panel_custom` block passed Home Assistant configuration validation; after a full restart the panel, Home view, and `None contacted` summary loaded and the owner reported no matching log issue | Confirmed by direct project-owner report |
| FND-011-LIVE-005 | The fallback block was removed, the configuration passed validation, and a second full restart restored automatic registration with the panel, Home view, and `None contacted` summary present and no matching log issue | Confirmed by direct project-owner report |
| FND-011-LIVE-006 | Integration reload, Home render, `None contacted` summary, and a cache-bypassing desktop refresh succeeded; the owner reported no matching log issue | Confirmed by direct project-owner report |
| FND-011-LIVE-007 | The sidebar panel, Home view, and `None contacted` summary loaded in the Home Assistant Companion App for Android | Confirmed by direct project-owner clarification |

These values identify the current FND-011 test target. They do not imply
compatibility with another Home Assistant release.

## Lifecycle matrix

| Scenario | Current evidence | Status |
|---|---|---|
| Manual installation and initial desktop render | Direct project-owner report recorded in `docs/evidence/2026-08-23-fnd-015-live-install.md` | Confirmed |
| Expected foundation summary (`AI destination` / `None contacted`) | Direct project-owner report | Confirmed |
| Home Assistant restart recovery | Two itemized full-restart results in FND-011-LIVE-004 and FND-011-LIVE-005 | Confirmed |
| Integration unload/reload | Itemized reload result in FND-011-LIVE-006 | Confirmed |
| Hard-refresh/cache behavior | Itemized cache-bypassing refresh result in FND-011-LIVE-006 | Confirmed |
| Mobile rendering | Itemized Home Assistant Companion App for Android result in FND-011-LIVE-007 | Confirmed |
| Log review after clean reinstallation | Exact `ai_orchestrator` search reported no issues | Confirmed |
| Config-entry removal and clean reinstallation | Direct project-owner report for the supplied itemized procedure | Confirmed |
| Exact `panel_custom` YAML fallback | Fallback validated and loaded; subsequent removal restored automatic registration | Confirmed and reverted |
| Survival across one Core upgrade | Requires results from two named Core versions | Pending |

## Next controlled action

Upgrade survival remains the only pending FND-011 scenario. It requires results
before and after an actual Core version change and must not be simulated by
claiming another version. FND-012 proceeds as the next independent Phase 0
implementation task while that external upgrade opportunity is unavailable.
