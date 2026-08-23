# FND-012 restricted workflow lifecycle probe - 2026-08-23

## Scope

FND-012 adds one deliberately restricted Phase 0 lifecycle probe. It is not the
product workflow runtime and does not make the panel's workflow feature
available. The probe exists only to prove event-listener setup, unload, reload,
restart initialization, and duplicate-registration behavior before any
action-capable workflow is built.

## Fixed behavior

- Trigger: one integration-owned internal Home Assistant event.
- Invocation: one admin-only WebSocket command with no caller-controlled data.
- Execution: increment one in-memory counter.
- Provider calls: none.
- Home Assistant action calls: none.
- Persistence: none; execution and registration counts reset on a real Home
  Assistant restart.
- Acceptance signal: every command must report `executions_for_trigger: 1`.
  Any other value is rejected by the panel as an unsupported result.

The Automations panel labels this as lifecycle evidence and does not present it
as a published automation, provider workflow, or device action.

## Automated working-tree evidence

The acceptance manifest is
`docs/evidence/manifests/FND-012/FND-012-WORKFLOW-LIFECYCLE-001.json`.

Current verified results:

- Clean copied-source Linux suite: 113 passed on Python 3.14.5 and Home
  Assistant Core 2026.8.3.
- Focused Linux lifecycle/WebSocket suite: 22 passed.
- Native pure suite: 81 passed; five dependency deprecation warnings.
- Frontend: lint and type checks passed; 29 browser tests passed; production
  build and byte-identical bundle verification passed.
- Ruff format and lint passed.
- Repository canary scan passed.
- Frontend dependency audit reported zero vulnerabilities.

These results do not substitute for the required live reload and restart
scenario. Independent workflow/safety re-review approved the working-tree
implementation on 2026-08-23 after verifying the provider/action spies, exact
context propagation, backend duplicate fail-closed behavior, manager-level
reload, and bounded frontend failure handling. Clean committed-source
test/release review remains pending.

## Pending live sequence

1. Replace the installed `ai_orchestrator` custom-component directory with the
   complete directory from one committed revision and restart Home Assistant.
2. Open **AI Orchestrator -> Automations** and run the lifecycle probe once.
3. Confirm it reports exactly one execution, provider contacted `no`, and Home
   Assistant action called `no`.
4. Reload the AI Orchestrator config entry, run the probe again, and confirm the
   execution delta remains exactly one.
5. Restart Home Assistant, run the probe again, and confirm the fresh runtime
   reports execution `1`, listener registration `1`, and the same two `no`
   safety results.
6. Search Home Assistant logs for `ai_orchestrator` and record the exact result.

FND-012 cannot move to `DONE` until this sequence and the required independent
workflow/safety review are recorded.
