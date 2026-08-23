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

These values identify the current FND-011 test target. They do not imply
compatibility with another Home Assistant release.

## Lifecycle matrix

| Scenario | Current evidence | Status |
|---|---|---|
| Manual installation and initial desktop render | Direct project-owner report recorded in `docs/evidence/2026-08-23-fnd-015-live-install.md` | Confirmed |
| Expected foundation summary (`AI destination` / `None contacted`) | Direct project-owner report | Confirmed |
| Home Assistant restart recovery | Owner reported the supplied checklist appeared to work; an itemized result was not returned | Preliminary |
| Integration unload/reload | Owner reported the supplied checklist appeared to work; an itemized result was not returned | Preliminary |
| Hard-refresh/cache behavior | Owner reported the supplied checklist appeared to work; an itemized result was not returned | Preliminary |
| Mobile rendering | Owner reported the supplied checklist appeared to work; the client type and itemized result were not returned | Preliminary |
| Log review after clean reinstallation | Exact `ai_orchestrator` search reported no issues | Confirmed |
| Config-entry removal and clean reinstallation | Direct project-owner report for the supplied itemized procedure | Confirmed |
| Exact `panel_custom` YAML fallback | Not yet run | Pending |
| Survival across one Core upgrade | Requires results from two named Core versions | Pending |

## Next controlled action

Keep the reinstalled config entry and custom-component files in place. Add the
exact supported `panel_custom` entry to `configuration.yaml`, validate the
configuration, restart Home Assistant, and verify that the compatible
YAML-owned panel loads the same foundation state without an `ai_orchestrator`
setup error. Remove that YAML entry and restart again after recording the test
so automatic integration-owned registration is restored.
