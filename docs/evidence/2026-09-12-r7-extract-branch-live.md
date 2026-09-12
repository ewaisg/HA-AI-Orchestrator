# r7 live: extract and branch step kinds, catalogue bound

Date: 2026-09-12. Commit `e140335`; archive `outputs/r7/ai-orchestrator-r7.zip`
(SHA-256 `08a5d9f7d190fbe36300bd5e00559e2f4488f3b4e62b3559288bdcf2b90ad951`,
29 files, bundle 162,644 bytes SHA-256 `bcb378e2…c743`).

## Gates before install

| Check | Result | Log |
|---|---|---|
| Full backend, Core 2026.9.2 / 2026.9.0 / 2026.8.3 | 710 passed each | `artifacts/review-2026-09-12/full-backend-loc012-*.txt` |
| `scripts/run_pure_tests.py` | 437 passed | `pure-wfl003c.txt` |
| `npm --prefix frontend run check` | 239 browser tests; identity | `frontend-loc012.txt` |
| Ruff, format, canary | clean | tool output |

## Install

Uploaded through the File editor (page `upload()` function), hashes matched
on the host, installer reported `VERIFIED_ROLLBACK:
/homeassistant/.ai-orchestrator-backups/before-r7-r6hb3pq8/ai_orchestrator`
and `INSTALLED: 29 reviewed files, all bytes verified`; files removed.
Backend Python changed, so Core was restarted from Settings → System; the
confirm dialog reported no running automation this time. After startup the
panel registered `/api/ai_orchestrator/panel/bcb378e2aaa7044f/ai-orchestrator-panel.js`
and the page loaded 162,644 bytes from it.

## Extract and branch against the owner's model

A stored copy of the synthetic evening example with steps classify → branch
(`when_category: routine`) → extract (`room: string`, `needs_action: boolean`)
→ compose → notify (`notify.hallway_famecho_dot_announce`) was dry-run over the
WebSocket command with the evening snapshot. Result in about 11 seconds,
three provider calls, `completed: true`: `classify ok routine`, `gate taken`,
`extract ok {"room": "", "needs_action": false}` (the model returned the
required typed fields; it chose an empty room string since the snapshot names
no room), `compose ok` with the reminder text, `notify planned` resolving to
a notify entity. Nothing was sent; `actions_executed` stayed 0.

## Panel defect found and fixed (r8)

Driving the same dry run through the panel left the dry-run control disabled
with no result and no error. Instrumenting the view showed its provider and
notify-target lists empty: the lookups were guarded by the editor's edit
sequence, so loading the example (or any edit) before the lookups resolved
discarded them. Fixed in commit `2393634` by tying lookups to the Home
Assistant identity only; a browser test now edits the editor before the
lookups resolve and asserts the provider select and target list still fill
and the dry run becomes available. 240 browser tests
(`artifacts/review-2026-09-12/frontend-lookupfix.txt`). Packaged as r8
(`outputs/r8/ai-orchestrator-r8.zip`, SHA-256
`bd5a829a8d17c4304cd26a52dfdc576709e51a932e6d7e9867283685fedaaed3`, bundle
`ee9a6e35…e561`) and installed with rollback `before-r8-kc1_afnb`.

After the foundation entry reload the panel registered
`/api/ai_orchestrator/panel/ee9a6e35da4fe0f9/ai-orchestrator-panel.js`
(162,672 bytes). Reproducing the earlier sequence through the panel (open
Automations and load the example immediately, then edit, save, dry run):
the provider select and the 17 targets were populated, and the dry run
rendered `Classify text — category: routine`, `Branch — not taken, later
steps skipped`, compose and notification `skipped`, `Provider calls: 1 ·
Actions executed: 0`, in about 3 seconds. The test workflow was deleted.

## r9: builder editing, live

Commit `3c75d9e`; archive `outputs/r9/ai-orchestrator-r9.zip` (SHA-256
`420c05dbedc086def69ffa0b7e22b8fd36cacaf4d37071f5444970043f8183a9`, bundle
`7a6b75fd…f011`, 167,772 bytes); installed with rollback `before-r9-plaq__sj`,
files removed, foundation entry reloaded; the panel registered
`/api/ai_orchestrator/panel/7a6b75fd3da22159/ai-orchestrator-panel.js`.
Live: saved the synthetic evening example, then **Edit in builder** switched
the builder to "Edit a workflow" with the stored name loaded; the builder
refused to save because the example's `notify.synthetic` target does not
exist on the instance ("choose a notification target that Home Assistant
has"), which is the intended fail-closed behaviour. The test workflow was
deleted. 243 browser tests (`artifacts/review-2026-09-12/frontend-builder2.txt`).
