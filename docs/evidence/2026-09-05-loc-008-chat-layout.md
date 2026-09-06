# LOC-008: chat app-shell layout and density

Date: 2026-09-05. Status: **REVIEW — implemented and gated by automated checks;
live owner confirmation on desktop and Companion App Android pending.**

## Reported defect

After LOC-006 live acceptance, the owner tested the Companion App on Android and
reported that rendering was otherwise fine, with one layout defect and one
appearance concern:

1. **Mobile scrolling (defect).** In the chat view the *entire page* scrolled up
   and down. The section header, provider controls and the message input all
   moved off screen. A chat client is expected to keep that chrome fixed and
   scroll only the message area.
2. **Desktop density (appearance).** Spacing and margins were too large and did
   not match the density of the rest of the Home Assistant UI or the other
   AI Orchestrator sections.

Both are user-facing behavior, so they are tracked rather than folded silently
into another task.

## Delivered behavior

The chat section is now an app shell instead of a normal scrolling document.

- **The panel host is sized to the space Home Assistant actually gives it.**
  Home Assistant renders this panel below its own toolbar and does not guarantee
  a height-constrained parent, so a plain `height: 100%` can either collapse or
  overflow. The panel measures its own offset from the top of the viewport and
  sets an explicit `--orchestrator-shell-height`, with a `320px` floor. It
  listens to `resize` and `visualViewport` `resize`, so the layout also survives
  an on-screen keyboard opening or a device rotation.
- **Only the transcript scrolls.** The frame, workspace and chat container are
  a nested flex column with `min-height: 0`; the transcript is the single
  `flex: 1 1 auto` child with `overflow-y: auto` and `overscroll-behavior:
  contain`. The header, provider controls, privacy disclosure, errors and the
  composer are fixed-size children.
- **This applies to chat only.** The host constraint and `chat-mode` class are
  added when the chat section is active and removed when leaving it, so every
  other section keeps its normal document scrolling.
- **Density was tightened** to match the rest of the app: smaller heading scale,
  reduced control and card padding, tighter message spacing, a narrower content
  column, and removal of a redundant intro line.
- **Composer behaves like a normal chat input.** It starts one row tall, grows
  with content up to a bounded maximum (`34vh`, `26vh` on small screens), then
  scrolls internally, and resets to one row after a message is sent.
- **New turns scroll into view automatically** when history changes or a request
  starts, so the latest reply is visible without manual scrolling.
- **Messages are visually attributed**: user turns align right, assistant turns
  align left, each capped at `88%` width (`94%` on small screens).
- **The privacy text collapses into a disclosure.** This recovers vertical space
  on phones. The safety-relevant destination line ("Destination: <provider> ·
  Local" or "Choose a local provider") remains visible at all times as the
  disclosure summary; only the longer explanation is collapsed, and it stays in
  the accessibility tree and in the DOM.

No backend file changed. No provider, privacy, permission, action, retention or
authorization behavior changed; this task is presentation only.

## Verification actually run

| Check | Observed result |
|---|---|
| Frontend `npm --prefix frontend run check` | Passed: script syntax, lint (`--max-warnings 0`), typecheck, 116 browser tests, build, sync and byte identity |
| New layout regression tests | 4 added: transcript-only scrolling, auto-scroll to newest turn, composer grow/reset, and panel-level chat-height constraint applied on entering chat and released on leaving |
| Existing chat tests | Still pass unchanged, including the narrow-layout axe run with no serious or critical WCAG 2.1 AA violations |
| Backend pure suite | 234 passed, five known upstream deprecation warnings |
| Ruff lint | All checks passed |
| Canary scan | Exit 0, no findings |
| Bundle identity | 95,427 bytes, SHA-256 `d24d6b50aa09cf805822f7ec06af94bfdd84813c153e700d328003701677dce2` |

Counts overlap between suites and must not be summed.

### Defect found and fixed by the development fixture

An intermediate implementation used `height: 100dvh` on the frame. Previewing
the development fixture at a 390x780 viewport showed the frame rendering 861px
tall inside a 780px viewport, pushing the composer below the fold — the same
class of defect being fixed. The measured-height approach described above
replaced it, after which the fixture reported the frame at exactly 780px, the
page not scrolling, and the composer fully visible. The panel-level regression
test covers this. That intermediate state is recorded as a failure, not a pass.

## Remaining acceptance

Install the rebuilt bundle and have the owner confirm, on both desktop and the
Companion App on Android:

1. Only the message area scrolls; header, provider controls and the input stay
   fixed.
2. The input stays visible and usable when the on-screen keyboard opens.
3. Spacing now reads as consistent with the rest of the Home Assistant UI.
4. Sending a message, receiving a reply, follow-up context and New chat continue
   to work as accepted in LOC-006.

Only the bundled panel JavaScript changed, and the panel is served with
`cache_headers=False`, so a hard refresh is expected to be sufficient; a Core
restart is not required for a frontend-only update. LOC-008 cannot be `DONE`
until the owner confirms the four items above.

## Deployment attempt and blocker

The updated bundle was **not** installed in this session. The installed file
remains the LOC-006 bundle, verified in place as SHA-256
`7b034887f4187293469e1262a5369e15bb668df941cc6d931e2be87c4609ea83`.

Two transfer paths were attempted through the File editor add-on and neither
completed:

1. **Chunked base64 through the "Execute shell command" console.** The console
   runs single commands through BusyBox without shell operators (`;`, `>`), so
   redirection is unavailable. Appending through `python3 -c` worked for a short
   probe (exit 0), but the full payload is 127,236 base64 characters across 43
   chunks, and the automation harness cannot read the local chunk file into the
   browser context to drive that loop.
2. **The File editor `#uploadfile` input.** The file was attached
   programmatically, but a subsequent `find /homeassistant -maxdepth 2 -name
   ai-orchestrator-panel.js` returned exit 0 with no match, so the upload did
   not land in the configuration volume.

No partial or corrupted file was left behind: the staging path
`/homeassistant/.ai-orch-stage.b64` was removed and its absence confirmed with
`ls` returning "No such file or directory". The integration directory was not
modified, so no rollback is required and the running panel is unchanged.

**Recommended install path.** Because only one file changed, the owner can copy
`custom_components/ai_orchestrator/frontend/ai-orchestrator-panel.js` from this
repository over the installed file at
`/homeassistant/custom_components/ai_orchestrator/frontend/ai-orchestrator-panel.js`
using Samba, SSH, or the File editor's own upload from the browser, then hard
refresh. Before accepting, confirm the installed file reports:

- size **95,427** bytes
- SHA-256 **`d24d6b50aa09cf805822f7ec06af94bfdd84813c153e700d328003701677dce2`**

A convenient verification command in the File editor shell console is
`sha256sum /homeassistant/custom_components/ai_orchestrator/frontend/ai-orchestrator-panel.js`.
Line endings matter: the canonical artifact uses LF, and the Windows checkout
may present CRLF, so copy from a Git archive or verify the hash after copying.

## Installed, and the service-worker caching trap

The owner copied the file successfully. The installed file was verified on the
configuration volume as **95,427** bytes, SHA-256
`d24d6b50aa09cf805822f7ec06af94bfdd84813c153e700d328003701677dce2`, single
inode, single filesystem, with no stale duplicate anywhere under
`/homeassistant` other than the intentional LOC-006 rollback copy.

The owner then reported that the **Chat and Providers sections had disappeared**.
Investigation showed they had not: the sidebar still listed every section and
the backend was healthy. The panel was simply running old code.

**Root cause: the Home Assistant frontend service worker.** Home Assistant
registers a Workbox service worker (`/sw-modern.js`, scope `/`) with a
`workbox-runtime` cache. That cache held the previous
`/api/ai_orchestrator/static/ai-orchestrator-panel.js` response and kept serving
the 91,291-byte LOC-006 bundle to the page.

This is worth recording because several normally reliable steps did **not** fix
it, and each produced a misleading signal:

| Attempt | Result |
|---|---|
| `fetch(..., { cache: 'no-store' })` from the page | Still returned the old 91,291-byte body |
| Config-entry reload of the hub entry | API reported `{"require_restart": false}`; served bytes unchanged |
| Full Home Assistant Core restart | Core reported "Home Assistant has started!"; served bytes still unchanged |
| Replacing the file through a fresh inode | New inode and mtime on disk; served `Last-Modified` did not move at all |
| `Network.clearBrowserCache` via CDP | No effect; the service worker sits in front of the HTTP cache |
| `curl` from outside the browser | **Correctly returned 95,427 bytes** with the new `Last-Modified` |

The `curl` result is what isolated the fault to the browser rather than the
server or the integration: the identical URL returned the new artifact to a
client with no service worker, while the authenticated page kept receiving the
old one. A frozen `Last-Modified` value that did not change even after the file
was rewritten through a new inode was the decisive clue that the response was
not coming from the filesystem.

**Fix.** Delete the cached entry from the Workbox runtime cache, then reload:

```js
const c = await caches.open('workbox-runtime-' + location.origin + '/');
for (const req of await c.keys()) {
  if (/ai-orchestrator-panel\.js/.test(req.url)) await c.delete(req, { ignoreSearch: true });
}
```

Equivalent manual routes are a browser hard reload that bypasses the service
worker, clearing site data for the Home Assistant origin, or on the Companion
App clearing the app's cache.

**Consequence for this project.** The claim in the section above that
"`cache_headers=False` means a hard refresh is sufficient" is **wrong for the
first load after a bundle change**, because the service worker caches the
response independently of the integration's own cache headers. Any future
frontend-only update must include a service-worker cache-clear step, and the
`LOC-007` release gate should state it in user-facing install instructions.
A durable code-side improvement would be to add a content hash or version query
string to `PANEL_MODULE_URL` so each build requests a distinct URL; that is not
implemented yet and should be tracked before wider distribution.

## Live verification after the cache clear

| Check | Observed result |
|---|---|
| Served bundle | 95,427 bytes and the new `chat-host` marker present |
| Sections restored | Home, Automations, Chat, Providers, Entities & Permissions, Voice & Notifications, Activity & Security, Settings all listed |
| Chat shell active | Panel host carried `chat-host`, `--orchestrator-shell-height` resolved to `973px`, and the frame carried `chat-mode` |
| Transcript-only scrolling | Transcript `overflow-y: auto`; `document.documentElement` did **not** scroll |
| Privacy disclosure | Rendered as a `details` element with the destination line visible as its summary |
| Provider | `LM Studio 594e2b2e` auto-selected |
| Generation | Prompt "Reply with one short sentence confirming the new layout is live." returned the actual reply "New layout is live." |

Desktop behavior is therefore confirmed live. Owner confirmation of the
on-screen-keyboard behavior and the spacing judgement on the Companion App for
Android is still outstanding, so LOC-008 remains `REVIEW`.
