# WFL-004: notification discovery and bounded live execution

Date: 2026-09-12. Base: `main@98ab990` (r4 live).

## What exists now

- `workflow_notify.py`: `async_list_notify_targets` returns, from real Home
  Assistant registries only, every notify entity (`hass.states`, domain
  `notify`) and every legacy notify service except the generic
  `send_message` and `persistent_notification`. `async_resolve_notify_target`
  maps a step reference `notify.<name>` to `entity`, `service` or `missing`
  (entity wins when both exist). `async_send_notification` calls
  `notify.send_message` with `entity_id` for entities or `notify.<name>` for
  legacy services, always with `message` and `title`, blocking; a missing
  reference raises and is never guessed.
- Schema (still v1): optional `run_mode` (`observe` default, `execute`) and
  `provider_connection_id` (canonical UUID or null); `execute` with any AI step
  requires the provider id. Migration of older documents yields `observe`.
- `workflow_execution.py`: runs the AI steps (`run_ai_steps`) then each
  `notify` step with the last composed text; per-delivery 30 s deadline; the
  first failure stops the run and later steps are skipped; no retry. Records
  only statuses, error codes, counters and timestamps.
- `workflow_manager.py`: an `execute` document's observer gets an
  eligible-outcome hook; one execution per workflow at a time (`skipped_busy`
  counted otherwise); counters and a redacted `last_execution` in status;
  disabling or replacing a document clears its execution evidence.
- `ai_orchestrator/notify/targets` (admin) and dry-run `target` per planned
  notify step; panel list shows mode and execution evidence; editor lists
  discovered targets with the execute-mode instructions.

## Verification

| Check | Result | Log |
|---|---|---|
| Full backend, Core 2026.9.2 / 2026.9.0 / 2026.8.3 | 687 passed each | `artifacts/review-2026-09-12/full-backend-wfl004-*.txt` |
| `scripts/run_pure_tests.py` | 416 passed | `pure-wfl004.txt` |
| `npm --prefix frontend run check` | 217 browser tests; bundle 136,998 bytes SHA-256 `494a064e…6b3a` | `frontend-wfl004.txt` |
| Ruff check/format, canary | clean / clean / exit 0 | tool output |

Transport-level tests prove: a legacy service and a notify entity each receive
exactly one call with the composed message and the workflow title; `observe`
mode and ineligible outcomes never call a provider or a service; a missing
target, an unavailable provider and malformed model output all fail closed
with zero service calls; two eligible events during one run produce one
delivery and one `skipped_busy`; disabling stops delivery and resets evidence;
a notify step without composed text fails as `no_composed_message`; message
text never appears in the retained record.

## Not done

Live delivery on the owner's instance requires an owner-chosen trigger entity
and notify target (ENV-004). No media-player or TTS action exists; only the
notify namespace is callable. No independent review yet.

## Live r5 install (2026-09-12, later)

Archive `outputs/wfl004-r5/ai-orchestrator-r5.zip` (SHA-256
`501313382b2b707a025411b30cf0f44f1a6ee173fab6b601c4080e218bf8b8fa`, 29
files, bundle `494a064e…6b3a`) uploaded through the File editor, hashes
matched on the host, installer reported `VERIFIED_ROLLBACK:
/homeassistant/.ai-orchestrator-backups/before-r5-pnm88cuz/ai_orchestrator`
and `INSTALLED: 29 reviewed files, all bytes verified`; installer and archive
removed; Core restarted from Settings → System. After startup the panel
registered `/api/ai_orchestrator/panel/494a064e2339a444/ai-orchestrator-panel.js`.

Live discovery in the Automations editor listed **17** notification targets
from the owner's instance: notify entities for phones/tablets and the Echo
dots' `announce`/`speak` entities, plus the legacy `notify.mobile_app_*`
services, with `send_message` and `persistent_notification` excluded as
designed. No notification was sent in this session.

A dry run of the synthetic evening example with its notify step re-pointed at
`notify.hallway_famecho_dot_announce` returned the composed text and
`Notification — planned, not sent … target resolves to a notify entity`,
`Provider calls: 1 · Actions executed: 0`. The test workflow was then deleted.
Live delivery awaits the owner's choice of trigger entity and target (ENV-004).
