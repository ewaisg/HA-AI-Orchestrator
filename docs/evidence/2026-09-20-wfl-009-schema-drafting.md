# WFL-009 deterministic light schema and drafting slice

Owner: provider/backend subagent. Scope: `workflow_schema.py`, `workflow_steps.py`, `workflow_draft_schema.py`, `workflow_draft_api.py`, and focused tests. Runtime authorization, audit dispatch, publication receipts, and UI are owned by separate agents and require independent integration review.

## Explicit design policy

The user's broad automation/control request authorizes building this feature. It does **not** authorize the agents to grant unattended access to or activate any live light. The product requires a separate explicit administrator authorization bound to the exact saved workflow and physical target, a provider-free dry run, and a separate Enable action. Draft generation, parsing and planning create no grants and perform no device actions. Existing manual action grants or confirmation tokens cannot authorize unattended workflows.

This bounded slice supports exactly one `light_control` step with `step_id`, `target_registry_id` and `operation` (`turn_on` or `turn_off`). Unknown fields, toggle, brightness, arbitrary services, mixed steps and runtime provider bindings are rejected. Existing AI/notification workflows retain their previous schema. The deterministic light workflow has `provider_connection_id: null`; AI may author its draft but is absent from runtime execution.

The side-effect-free step planner accepts `provider=None` for the light shape and reports the exact registry target and operation as planned, with zero provider calls and zero actions. Real AI steps still require a provider.

## Draft and source boundaries

The existing public draft request still accepts explicitly selected entity IDs. The backend derives eligible physical light registry identities using the runtime agent's shared `workflow_actions.resolve_light` helper and an active administrator. Only selected entity/registry IDs are sent to the model; identity hashes, state, attributes, device configuration and grants are omitted. The structured schema permits only those selected registry IDs and the two fixed operations.

After generation, fresh user authorization, provider ownership, source revision, selected references and selected light identity/permissions are revalidated. Generated light workflows are new disabled unsaved copies with null runtime provider. The source lookup includes the light target's resolved entity ID so refinement requires explicit selection of that light. Missing source identities fail closed. Normal on/off state changes do not replace physical identity.

## Verification

```sh
python -m pytest tests/quality/test_light_workflow_schema.py tests/home_assistant/test_light_workflow_draft_api.py tests/home_assistant/test_workflow_draft_api.py tests/quality/test_workflow_schema.py tests/quality/test_workflow_steps.py tests/test_workflow_draft_schema.py -q
```

Home Assistant Core 2026.9.3: **217 passed in 9.96 seconds**. Checks include exact shape and roundtrip, mixed/provider-bound/authority fields rejected, zero model calls during planning, no saves/services during generation, selected-only mapping, changed device/registry/service/group/disabled identity refusal, source refinement without authority inheritance, and existing workflow/draft regression suites.

Ruff lint and format checks pass for all seven owned Python files. The first owned diff check flagged Windows CRLF as trailing whitespace in two files; normalized owned files to LF and reran successfully. No semantic change followed the passing test run.

Independent primary review, integrated runtime/UI checks, exact artifact release, and live owner acceptance remain separate gates. No live authorization or light operation was performed in this slice.

Primary independent schema/draft review approved: closed single light operation, no runtime provider, selected-registry mapping and fresh authorization/identity checks, no grants in generated output. Independent focused new-light plus prior-draft gate returned 116 passed in 10.00s. Runtime, UI, publication, full exact-artifact and live acceptance remain open.
