# Live r3 install: LOC-009 path fix proven, WFL-002C observed, ENV-015 started

Date: 2026-09-12 (owner's local morning, America/Denver). Instance:
Home Assistant OS on Home Assistant Green, Core **2026.9.2** (outside the two
named test Cores; recorded, not claimed), reached over HTTPS through the
owner-supplied address, using the owner's existing authenticated Chrome
session via Claude in Chrome. No credential was entered by the agent.

## State found before any change

- Live directory `/homeassistant/custom_components/ai_orchestrator` held the
  24-file d63e39a build from branch `claude/sharp-sagan-xl2abm` (bundle SHA-256
  `29d03967…2d243`, matching the owner's `Downloads/ai-orchestrator-d63e39a.zip`),
  not any candidate recorded on `main`.
- The backend was live d63e39a (the `ai_orchestrator/workflows/list` command
  answered), but the Automations view showed no stored-workflow controls.
- Cause, observed in the page: the panel requested
  `/api/ai_orchestrator/static/ai-orchestrator-panel.js?hash=29d0396789ff5bae`
  and received a 105,464-byte body; the Workbox runtime cache held that body
  under `?hash=c3434c673e13a7a3` (the 7150189 bundle). A `cache: 'no-store'`
  fetch with an additional random query parameter returned the same stale body
  with `Last-Modified: Thu, 10 Sep 2026 02:05:20 GMT`.
- Cause, confirmed in the packaged frontend service worker source
  (`hass_frontend/sw-modern.js`): a cache-first route for
  `/\/(static|frontend_latest|frontend_es5)\/.+/` with
  `matchOptions: {ignoreSearch: true}`, registered before the network-only
  `/\/(api|auth)\/.*/` route. The LOC-009 query-string hash therefore could
  never defeat the cache; LOC-009 was reopened.

## Candidate installed (r3)

Built in a worktree from d63e39a plus three commits: LOC-010 (chat request ids
without `crypto.randomUUID`), LOC-011 (reauth/reconfigure abort translations),
and the LOC-009 repair (bundle served at
`/api/ai_orchestrator/panel/<hash>/ai-orchestrator-panel.js`, registered once
per fingerprint after the collision check; the `/static/` URL kept only for the
documented YAML fallback). Gates before install: 635 backend tests on each of
Core 2026.9.0 and 2026.8.3 (`artifacts/review-2026-09-12/full-backend-r3-*.txt`),
390 pure, 187 browser tests with byte-identical bundle 123,040 bytes SHA-256
`a9efec55bf6e4d8211ea8faa1bec0cf083509a3bd65b27d60ed80987ecf70c5b`
(`frontend-r3.txt`), Ruff, format, canary. Archive
`outputs/wfl-002c-r3/ai-orchestrator-r3.zip`, SHA-256
`7c9137d145de00db042efd0c1272ce4345173bde4b3d379ab0e40c25b3d12cdc`, 24 files,
per-file hashes in `identity.json`; installer `install_r3.py` dry-run locally
over a copy of the live tree.

Transfer: the archive was uploaded through the File editor add-on's own upload
dialog into the integration directory and the installer into `/homeassistant`;
`sha256sum` in the add-on's shell dialog matched both local hashes. The owner
explicitly authorised uploading and running the installer. Output:
`VERIFIED_ROLLBACK: /homeassistant/.ai-orchestrator-backups/before-r3-q39eksl4/ai_orchestrator`,
`INSTALLED: 24 reviewed files, all bytes verified; restart required`, bundle
hash `a9efec55…70c5b`.

Core was restarted from Settings → System → Restart Home Assistant. After
startup the integration loaded (`ai_orchestrator` in components) and the panel
registered `module_url` `/api/ai_orchestrator/panel/a9efec55bf6e4d82/ai-orchestrator-panel.js`.

## LOC-009 live proof (no cache clearing of any kind)

Opening the panel loaded the new path with `decodedBodySize` 123,040 and
`Cache-Control: public, max-age=2678400`, while the stale runtime-cache entry
`/api/ai_orchestrator/static/ai-orchestrator-panel.js?hash=c3434c673e13a7a3`
was still present in `workbox-runtime-<origin>/`. The Automations view showed
`Save as workflow`, `Stored workflows` and `Reload workflows`. Nothing was
cleared, hard-reloaded, or reinstalled in the browser.

## WFL-002C observed by the agent (previously owner-reported only)

Load synthetic evening example → Preview: "Scenario passes — steps planned",
trigger 1 Matched, conditions 1 and 2 Matched, planned Compose text and
Notification (not executed), provider calls 0, actions executed 0.
Load synthetic daytime example → Preview: "Scenario blocked — no steps planned",
condition 1 "Outside the time window", no steps planned.

## ENV-015 stored workflows (in progress at time of writing)

- Saved the synthetic evening example: listed as Disabled, 1 trigger, 2
  conditions, 2 steps, Observations 0, Listeners 0. Enable → Active, Listeners 1.
- Saved a second workflow `ENV-015 clock trigger 07:27` (time trigger at 07:27
  Denver, no conditions, one notify step) and enabled it, so a real trigger
  fires from the clock without touching any household device.
- At 07:27 Denver the clock trigger fired on the live Core. After `Reload
  workflows`: `Observations 1 · Ignored events 0 · Listeners 1 · Latest
  observation: triggered yes · conditions passed · 1 step(s) planned, none
  executed`. The evening workflow (synthetic entity) stayed at 0 observations.
- `.storage/ai_orchestrator.workflows` existed in the configuration volume.
- Home Assistant Core log page showed no `ai_orchestrator` error or warning;
  the only mention was inside Core's routine bootstrap setup-timing warning.
- Second Core restart from Settings → System. After startup the panel again
  loaded the content-addressed bundle (123,040 bytes) and the list showed both
  workflows `Active`, `Listeners 1`, `Observations 0` (counters are in-memory
  and reset by design; documents persisted and re-activated from the store).
  ENV-015 is met for its observation-only scope.

## Chat on the r3 bundle (LOC-010 live check)

Chat → provider `LM Studio …` → prompt "Reply with exactly the two words:
install verified" → AI reply `install verified`. The request id produced by
the new generator was accepted by the backend over the owner's HTTPS access;
the plain-HTTP case is covered by the browser test only.

## Cleanup

Both test workflows were deleted through the panel's two-step delete
(`Delete` → `Confirm delete`); the list then read "No stored workflows".
The uploaded installer and archive were removed from the host (`rm` exit 0;
`ls` then reported both missing). Rollback directories retained:
`/homeassistant/.ai-orchestrator-backups/before-loc006-3pcm8d5v` and
`before-r3-q39eksl4`. To roll back, restore `before-r3-q39eksl4/ai_orchestrator`
over the integration directory and restart Core. The ingress shell dialog
silently returned nothing after the Core restart until the File editor was
re-entered through Home Assistant's sidebar (ingress session refresh).

## Not covered here

Companion App Android rendering, LOC-004 duplicate/transport reproduction,
LOC-003 timeout reproduction, LOC-005 registry mutations, a Core 2026.9.2
test environment, and any step execution. The r3 commits are local only
(worktree branch on the owner's workstation); nothing was pushed.
