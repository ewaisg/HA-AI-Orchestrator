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
| Log review | Owner reported the supplied checklist appeared to work; exact error-search result was not returned | Preliminary |
| Config-entry removal and clean reinstallation | Not yet run | Pending |
| Exact `panel_custom` YAML fallback | Not yet run | Pending |
| Survival across one Core upgrade | Requires results from two named Core versions | Pending |

## Next controlled action

Remove only the field-free AI Orchestrator config entry, verify that the
integration-owned sidebar panel is removed, add the integration again, and
verify that the panel and foundation summary return. The custom-component files
remain installed during this test. Record every observation before beginning
the separate YAML-fallback scenario.

