# LOC-006: local chat test candidate

Date: 2026-09-05. Status: **DONE — implementation, independent pre-live review,
and live generation acceptance complete.**

## Delivered behavior

Administrators can open Chat, select a saved local provider, send a message,
continue with bounded conversation context, and start a new chat. Only the
typed conversation and a fixed system instruction reach the provider. No Home
Assistant registry/state context, tools, device actions, cloud route, streaming,
or persistent transcript is enabled. Unknown generation capability is visibly
disclosed as an explicit trial, under ADR-0003's September 5 clarification.

The backend allows one pending generation per user and four globally, times out
after 60 seconds, rejects duplicate request IDs, caps replay metadata at 256
records for 120 seconds, and rejects late output from replaced/unloaded providers.
Each request is capped at 21 messages, 4,000 UTF-16 units per message/response and
16,000 per request. The frontend trims whole old pairs and reports omissions.
Leaving the view, account/provider changes, missing HA context and disconnects
clear the transcript. New chat discards any late reply; an already dispatched
provider request can finish. Provider-side logging is outside this retention rule.

## Exact candidate

- Canonical source fingerprint:
  `2dad75b07572b63adf5bd47fc2d1510c4b29993efc0dbd7e2860f46c23488dfd`.
- Algorithm: SHA-256 of sorted UTF-8 `path<TAB>SHA256(canonical file)<LF>`
  records for all source files under `custom_components/ai_orchestrator` and
  `frontend/src`; canonical files normalize CRLF to LF, exclude generated caches.
- Bundled JavaScript: **91,291 bytes**, SHA-256
  `7b034887f4187293469e1262a5369e15bb668df941cc6d931e2be87c4609ea83`.
- Local deliverables: `outputs/loc-006/ai-orchestrator-local-chat.zip`,
  `candidate-identity.json`, and `candidate.tar`. The ZIP contains only the
  integration directory with canonical LF content. These generated artifacts
  are ignored by Git; the source fingerprint identifies the reviewed content.

## Verification actually run

An isolated canonical source snapshot was extracted in persistent WSL Ubuntu
storage, outside the mounted Windows checkout and dependency directories.

| Check | Observed result |
|---|---|
| Full backend, Python 3.14.5 / Core 2026.8.3 / test helper 0.13.357 | 378 passed, 3.89 s |
| Full backend, Python 3.14.5 / Core 2026.9.0 / test helper 0.13.363 | 378 passed, 4.12 s |
| Independent chat + LM Studio backend tests, current Core | 99 passed |
| Full frontend `npm --prefix frontend run check` | lint, typecheck, script syntax, 112 browser tests, build, sync and byte identity passed |
| Independent chat browser subset | 17 passed |
| Pure tests, current-Core environment | 234 passed; five upstream deprecation warnings |
| Canonical Linux Ruff formatting | 36 files already formatted |
| Checkout Ruff lint | All checks passed |
| Canonical snapshot canary scan | Exit 0, no findings |

Counts overlap; they are not summed as unique tests. Browser tests include
keyboard and narrow-screen accessibility checks, plain-text rendering, follow-up
history, duplicate clicks, stale replies, account/disconnect cleanup, backend
failures, and strict protocol validation. Synthetic tests do not prove actual
LM Studio model behavior or Companion App operation.

The independent workflow/safety reviewer approved the source fingerprint above
and exact bundle after reviewing context-loss cleanup, keyboard submission
guards, and configured-token preflight/reflection protection. No scoped blocker
remains. Protection concerns the configured provider token; it does not claim
to detect every secret a user might manually type. This is pre-live approval,
not completion of LOC-007 or the compatibility matrix.

## Current environment and remaining acceptance

The authenticated HA About page reported Core **2026.9.0**, Frontend
**20260826.4**, Supervisor **2026.08.0**, OS **18.2**, and HA OS installation.
COMP-001 reopens the upgrade gate required by DEC-023. The existing installed
panel returned admin status; explicit provider Test connection passed; catalogue
refresh showed 2,193 entities, 173 devices and 19 areas with AI access none.
These observations precede chat installation and do not establish candidate
identity. Household IDs, endpoint, credentials, names and model IDs are withheld.

Remaining: install the exact reviewed integration with a rollback copy, restart
Core to load Python changes, then test a harmless prompt, follow-up, new-chat
reset, provider health, registry refresh and scoped logs. Record actual results
before marking LOC-006 done. Android, registry-mutation/lifecycle acceptance
for LOC-003 through LOC-005 and broader release gates remain open.

## Live installation observed

The File editor add-on exposes the configuration volume at `/homeassistant`
(its `/config` path is absent); its command interpreter reported Python 3.14.5
with optimization disabled. The previous installed frontend hash matched the
historical accepted 75,409-byte bundle. No provider credential/config file was
changed for this update.

The browser file chooser rejected file selection, so the existing File editor
command console transferred the archive as base64 data with exclusive file
creation and exact SHA-256 validation. Archive SHA-256:
`bfb663d25e0d496f3758d920301a4bae189973b99e0e931ff1612689c057b608`.
The independently reviewed installer (SHA-256
`8304a9098316a6d5dc5e1763d19dc9799596da3c4e4a6adca928e3e35350d0b5`)
validated paths, rejected symlinks, compiled Python, made and byte-verified a
scoped backup, atomically replaced each member, and verified all 17 installed
files against the package. Visible output reported `INSTALLED: 17 reviewed
files, all bytes verified; restart required` and the exact new bundle hash above.

Rollback directory in the File editor mount:
`/homeassistant/.ai-orchestrator-backups/before-loc006-3pcm8d5v/ai_orchestrator`.
Restore that directory as the integration and restart Core if needed. No storage
migration is included.

## Live generation acceptance observed

Performed against the owner's authenticated Home Assistant instance (Core
2026.9.0) through the browser session the owner supplied. No credential,
household identifier, or endpoint was recorded here.

| Check | Observed result |
|---|---|
| Panel loads and provider list resolves | Chat view opened with no console error scoped to `ai_orchestrator`; provider dropdown resolved from "Loading providers…" to a single configured local provider automatically |
| First harmless prompt | Sent "Say hello in one short sentence."; an actual generated reply "Hello!" was rendered under "AI reply" after a brief wait state |
| Follow-up with bounded context | Sent "What did I just ask you to say?" in the same session; the reply was "I was asked to say \"hello\" in one short sentence.", proving prior-turn context reached the provider correctly and only through the conversation, not device state |
| New chat reset | Pressing "New chat" cleared both prior turns and restored the "A fresh conversation" empty state |
| Provider health / manual test | Providers view showed the configured local provider status "Healthy" with a prior timestamp; pressing "Test connection" produced a fresh "Connection test passed" status and an updated timestamp |
| Catalogue health (unrelated regression check) | Entities & Permissions view reported 2,193 entities, 173 devices, 19 areas, "AI access: none", matching the previously recorded read-only inventory with no state values exposed |
| Scoped logs | No JavaScript console error attributable to the `ai-orchestrator-panel` bundle or `ai_orchestrator` WebSocket commands was observed during panel load, chat send/receive, provider test, or catalogue navigation; unrelated dashboard resource warnings predate panel navigation and are outside this integration's scope |

Only the typed conversation reached the provider; no entity state, device
action, or household registry data was included in either chat request. This
satisfies the LOC-006 outstanding live acceptance gate recorded above. LOC-006
is now `DONE`. LOC-007 (Phase 1 release gate) may proceed; LOC-003 through
LOC-005 and COMP-001 retain their own separately tracked live acceptance items
recorded elsewhere in this evidence trail and the tracker.

## 2026-09-05 later session: full Core restart survives chat generation

With the owner's explicit approval, a full Home Assistant Core restart was
performed later the same day (see the matching LOC-003 evidence entry for the
exact restart procedure: Developer Tools → YAML → Check configuration →
Restart → "Restart Home Assistant", confirmed at the "All integrations will be
reloaded" prompt). Home Assistant's own "Home Assistant has started!" banner
confirmed a genuine process restart, not a page reload.

After restart, the Chat view reopened with a fresh conversation and the
provider auto-selected. A prompt asking the model to confirm it was working
after the restart returned an actual reply: "I am ready and functioning
normally after restart." This proves LOC-006 chat generation survives a full
Core restart, not only a browser reload, closing that additional gap for the
Phase 1 release gate.
