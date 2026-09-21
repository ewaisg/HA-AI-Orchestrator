# WFL-005 local AI workflow draft API

The new administrator-only `ai_orchestrator/workflows/generate_draft` command
accepts an explicit request, a selected local connection, and at most eight
selected entity references plus eight notification references. The backend checks
each reference against the current Home Assistant environment before generation
and again before returning the draft. Only the request and selected identifiers
are sent to the model; registry attributes, state values, and unselected catalogue
entries are not included.

One bounded local generation returns strict JSON, validated against the existing
closed workflow schema. The model can propose only name, description, triggers,
conditions and steps. Supplying executable envelope fields such as `enabled`,
workflow identity or provider identity is rejected. The server assigns a fresh
workflow ID, the selected local provider, execute mode and `enabled: false`.
Trigger and condition entities must be selected; notify references must be
selected and follow a compose step. Other action kinds remain unsupported.

The response is an unsaved draft. The API does not touch workflow storage,
produce a publication receipt, call a service, or activate listeners. Review,
save, successful dry run and enable remain separate existing operations. No
structured-output capability is assumed: malformed, oversized, duplicate-key,
tool-bearing or fenced/non-JSON replies fail with static text.

Lifecycle contract: `runtime.workflow_draft_tasks` owns one task per user and at
most four concurrently. Provider/foundation unload cancellation is wired by the
parent integration task. The API rejects late results after provider replacement,
unload, foundation removal, selected-reference disappearance, or suppressed
cancellation. There is one provider attempt and a 60-second deadline.

Verification on 2026-09-20, Core 2026.9.3 isolated environment:

- `pytest tests/home_assistant/test_workflow_draft_api.py -q`: **32 passed in 3.41s**.
- Focused Ruff: **passed**.
- Checks cover non-admin rejection, invalid selections, explicit context boundary,
  guessed and existing-but-unselected references, attempted executable fields,
  malformed output, no service calls or storage changes, busy/global concurrency,
  cancellation including suppression, timeout, provider replacement and static
  failure responses.

The fixtures use synthetic identifiers and a fake local provider. No live model
draft generation, deployment, notification or device action is claimed here.
Frontend integration and independent security review belong to the parent task.
