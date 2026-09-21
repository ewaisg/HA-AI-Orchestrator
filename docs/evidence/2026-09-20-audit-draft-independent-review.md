# Independent audit integration and draft diagnostics review

Reviewer: `bedrock_completion`, independent of the action/audit implementation, root lifecycle/API wiring, and final draft diagnostic changes. This review made no implementation edits.

## AST-005A audit boundary

Reviewed the closed metadata schema, bounded durable store, retained write ownership across repeated cancellation, action manager journal-before-dispatch gates, read-only administrator API, lifecycle, integration setup/unload, and history UI.

No blocking findings remain in the reviewed boundary. Action confirmation rechecks authorization, grants, service availability, provider identity, expiration, and target state after journal awaits and before consuming the confirmation token and dispatching. Interrupted records recover as unknown without replay. Unknown outcomes do not authorize retries. Records exclude prompts, generated text, household identities, entity IDs, arguments, and secrets. Workflow journaling remains outside this implemented action audit boundary.

The final lifecycle delta runs proposal expiration maintenance before pruning, catches static store/policy failures, revokes callback identity on stop, and avoids cancelling its own currently executing callback. A post-maintenance identity check prevents pruning after self-stop. Integration setup stops and drains the action manager before audit recovery and manager restart; setup failure cleanup stops owned lifecycle resources.

Independent final focused verification using the isolated Home Assistant Core 2026.9.3 environment:

```sh
python -m pytest tests/home_assistant/test_audit_api.py tests/home_assistant/test_audit_lifecycle.py tests/home_assistant/test_audit_integration.py tests/home_assistant/test_init.py tests/home_assistant/test_websocket_api.py -q
```

Result: **75 passed in 6.55 seconds**. Earlier independent checks of the audit/action/API/lifecycle/init/status boundary passed **213 tests in 12.53 seconds**; the history browser suite passed **34 tests in 1.86 seconds**. These are focused working-tree checks, not an immutable release gate.

## WFL-005 draft prompt and diagnostics

Reviewed the final backend and frontend diagnostic changes. Six validation stages are conveyed only through exact allowlisted enum members and static messages. Forged stages and exception subclasses fall back to a static generic failure. No provider exception text is exposed. Explicit selected-reference checks, source version checks, provider/user identity checks, and generation of a new disabled unsaved copy remain intact.

The prompt now requires the same five fields as the parser and supplies complete step examples. The regression test parses actual prompt examples through the production draft parser.

Independent verification:

- Core 2026.9.3: `python -m pytest tests/home_assistant/test_workflow_draft_api.py -q` — **76 passed in 7.39 seconds**.
- Frontend: `npx vitest run test/workflow-draft.browser.test.ts` — **44 passed in 1.58 seconds**.

No blocking findings. These results do not establish live audit persistence, physical device results, or successful generation by the user's live model. An exact frozen artifact gate remains required before the next deployment.
