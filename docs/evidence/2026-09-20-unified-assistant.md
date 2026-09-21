# AST-008 unified assistant candidate

One provider/composer offers explicit conversation, permitted-state, action-proposal and automation-draft requests. Its shared visual transcript does not enter household observations, action targets or workflow definitions into general conversation context. Existing backend scopes, exact confirmation and disabled-draft review remain authoritative.

Primary wired the assistant into Chat and validated disabled handoffs into both workflow editors without saving or enabling. A regression exposed the preview editor clearing a draft on first mount; initial-session application now follows context reset, while later session changes discard drafts. Independent review exposed an accepted-handoff/session-change race and vertically clipped controls. Both were fixed: parent content is remounted on connection/function/user changes and disconnect, retained drafts clear, and the assistant uses a bounded scroll body plus pinned composer. The reviewer added four connection/disconnect regressions.

Final full frontend gate: **421 browser tests across 24 files**, lint, typecheck, build, sync and byte identity passed. Bundle 265816 bytes; SHA-256 `6f638214f69fa91e35a642586d9c306ac285cc343eb6e61f1305252dd08a518a`. Independent final targeted review: **62 tests passed in 2.02 seconds**, no remaining blockers. Tests cover 390px panels at 320/420px heights with reachable review/confirm/send controls, no implicit actions, disabled handoffs, separated chat context and late response/session discard.

This is a candidate only. Live deployment, actual visual inspection and assistant acceptance remain pending. Physical light choice remains pending; no device was operated by these tests.
