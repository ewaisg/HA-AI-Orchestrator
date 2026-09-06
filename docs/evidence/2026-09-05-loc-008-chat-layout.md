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
