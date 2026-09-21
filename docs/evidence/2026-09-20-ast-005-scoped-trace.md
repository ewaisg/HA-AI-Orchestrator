# AST-005 scoped question trace

Implemented the existing validated ordered trace in the scoped question result under
Entities & Permissions. The display identifies local provider responses and reads
of permitted entity states in their original order, with provider/read/action
counts. The answer remains outside the trace. No prompt, state value, provider
payload, credential, or new backend field is added to trace rendering.

The trace is ephemeral and disappears with the answer when scope selection is
cleared. The UI states that the trace is not saved as history. Ordinary Chat and
Assist remain text-only; this does not enable actions or persistent auditing.

Verification on 2026-09-20:

- `npm run test -- test/agent-scopes.browser.test.ts`: 22 tests passed.
  The successful scoped-question test checks the exact three-operation ordering,
  absence of prompt/answer content in the trace, retention disclosure, and clearing
  on scope revocation. Existing parser tests reject unknown trace markers and
  answers claiming actions.
- `npm run typecheck`: passed.
- Focused ESLint for the changed view and browser test: passed.

This is a source-level UI result. The release bundle and live deployment are the
parent task's responsibility; no live household question was sent for this change.
