# WFL-003 live dry run on the owner's instance (r4)

Date: 2026-09-12. Candidate r4 = `main@6a91fcd` (slice A backend + slice B
panel). Archive `outputs/wfl003-r4/ai-orchestrator-r4.zip`, SHA-256
`24bc9c7ad437405a54d49bb1167ec8ed23f1392eecab752afdcdf005f199545c`, 26
files; bundle 131,535 bytes SHA-256 `660567a5…8abe`. Gates before install:
664 backend on each of Core 2026.8.3/2026.9.0/2026.9.2
(`artifacts/review-2026-09-12/full-backend-r4-*.txt`), 207 browser tests
with byte identity (`frontend-wfl003.txt`), 406 pure, Ruff, canary.

## Install

Uploaded through the File editor add-on's own upload dialog; `sha256sum` on
the host matched both files; `python3 /homeassistant/install_r4.py` reported
`VERIFIED_ROLLBACK: /homeassistant/.ai-orchestrator-backups/before-r4-c3x8solm/ai_orchestrator`,
`INSTALLED: 26 reviewed files, all bytes verified`, bundle `660567a5…8abe`.
Installer and archive removed from the host afterwards (`ls` confirmed).
Core restarted from Settings → System (the first restart click did not take;
the server still served the r3 module until a second, confirmed restart).

## LOC-009 second confirmation

After the restart the panel registered
`/api/ai_orchestrator/panel/660567a5ca74a67b/ai-orchestrator-panel.js` and the
page loaded it with `decodedBodySize` 131,535, again with no cache clearing.
Before the restart the old-hash path served the new on-disk bytes (131,451
chars) and the new path returned 404, which is the expected behaviour of a
directory-mapped static path until registration runs again.

## Compose step, live LM Studio model

Automations → Load synthetic evening example → Save as workflow → provider
select showed `LM Studio 594e2b2e` → Dry run AI steps. Result after about
6 seconds: `Dry run completed — nothing was sent`; Trigger 1 Pass; Conditions
1 and 2 Pass; `Compose text — composed: **Reminder:** The synthetic window
has opened.`; `Notification — planned, not sent (would use text from step
compose)`; `Provider calls: 1 · Actions executed: 0 · Destination: local`.
The composed text came from the owner's configured local model; it is quoted
here because it contains only the synthetic example's fictional entity.

## Classify step, live LM Studio model (structured output)

Edited the saved workflow in the editor to prepend an `ai_classify` step
(prompt "Decide whether this window event needs attention now or can wait.",
categories `urgent`, `routine`), saved it again, and dry-ran it. Result after
about 6 seconds: `Classify text — category: routine`, then the compose step
(same text as before), notification planned, `Provider calls: 2 · Actions
executed: 0`. The adapter sent a `json_schema` response format with the
closed enum; the model returned `{"category": "routine"}`, which the closed
validator accepted. This is the first live evidence that the owner's model
honours the structured-output request; the capability record still stays
`UNKNOWN` by design (DEC-010: an explicit trial does not promote a record).

## Ineligible scenario, live

Changing the snapshot time to 12:00 and dry-running again returned
`Dry run: scenario blocked — no AI step ran`, Condition 1 `Fail — Outside the
time window`, `No steps ran`, `Provider calls: 0 · Actions executed: 0`. The
provider was not contacted for an ineligible scenario.

## Cleanup and state left behind

The test workflow was deleted through the panel (`Delete` → `Confirm delete`);
the list then read "No stored workflows". Rollback directories on the host:
`before-loc006-3pcm8d5v`, `before-r3-q39eksl4`, `before-r4-c3x8solm`. The r4
build remains installed. No notification was sent and no Home Assistant
action was called at any point; every dry-run result showed
`Actions executed: 0`.
