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
