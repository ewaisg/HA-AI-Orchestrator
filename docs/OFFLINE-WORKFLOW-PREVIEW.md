# Offline workflow preview

WFL-002A adds a local command for evaluating a workflow against a supplied
snapshot. It does not need Home Assistant or a provider connection. This command
also has an administrator panel editor under **Automations**. Previewing never
activates a workflow; saving and enabling one (WFL-002) is a separate explicit
step described below.

## Use the panel

After installing the complete WFL-002C candidate, open **Automations**. The
**Workflow preview** editor accepts workflow JSON and a supplied snapshot. Load
an explicitly labeled synthetic example, select **Preview**, and inspect the
trigger/condition outcomes and planned step kinds. The daytime example should
fail its evening condition. The existing lifecycle probe remains below the editor.

## Save, enable, and observe

**Save as workflow** validates the editor's workflow JSON on the backend and
stores it; the saved document replaces the editor text in its normalized form.
The **Stored workflows** list then shows it. Enable it to activate its triggers
while the foundation entry is loaded. Each state change of a trigger entity, or
each configured time, records an observation: whether a trigger matched, whether
every condition passed, and which step kinds would have been planned. **Observe
now** records one manual observation at the current time (only a manual trigger
can match it). Counters and the latest outcome are shown per workflow; they reset
when the workflow is saved again, disabled, or the foundation entry reloads.

Observation is the whole runtime today. Steps are never executed, so an eligible
outcome means "this workflow would have started", not that anything happened.
Enabling a workflow that has no trigger or no step is refused.

This is an offline draft editor, not a visual workflow builder. It reads no live
household state and sends no data to an AI provider. JSON drafts stay in the open
view; reset or session loss clears them. Editing a draft invalidates its result.
Each panel JSON input is limited to 131,072 characters. An installation with an
older backend cannot serve this preview; replace backend and bundle together.

## Use the command

From the repository root, run the included synthetic window example:

```powershell
uv run python scripts/preview_workflow.py --workflow tests/fixtures/workflows/window-preview.json --snapshot tests/fixtures/workflows/evening-open.json
```

The example window opens at 20:00. Its evening condition passes, so the output
lists compose and notify as planned step kinds. Both execution counters stay
zero: no text is generated and no notification is sent. All entity and service
references in these fixtures are synthetic; none claims to exist in your home.

Change the snapshot to `tests/fixtures/workflows/daytime-open.json` to evaluate
the same event at noon. The time condition fails and no steps are planned.

## Inputs and results

The workflow uses the [v1 schema](architecture/WORKFLOW-SCHEMA.md). A snapshot
contains exactly `states`, `time` and `event`. State values are supplied strings;
the command does not read the current home state. Time is an explicit ASCII
`HH:MM` in the scenario's intended local clock. No timezone conversion, date,
DST or scheduling is implied. Time matching is at minute precision. The caller
is responsible for making the supplied event and states describe a consistent
scenario; the evaluator compares them as supplied.

Events are manual, time, or state changes. Triggers combine with OR, and
conditions combine with AND. Numeric limits are exclusive. Time windows include
their start and exclude their end, including windows crossing midnight.
Numeric strings use Python finite float conversion (including exponent notation
and surrounding whitespace). Missing, unknown, unavailable or nonnumeric values
fail applicable conditions.
An unchanged state event does not match a state-change trigger.

The result reports each trigger and condition by zero-based index with a static
reason. It omits names, entity IDs, state values, prompts and service targets.
`eligible` means this offline scenario matches and has steps to preview; it is
not execution permission. Disabled drafts may be previewed and are reported as
`enabled: false`. `planned_steps` describes kinds only, not generated content or
verified actions. `provider_calls` and `actions_executed` are always zero.

Each JSON file is limited to 1 MiB. Duplicate keys, nonstandard JSON numbers,
malformed input and unreadable files return a static `invalid_input` error and
exit code 2. Valid evaluations return code 0 even when conditions do not pass.

This is a deterministic preview component, not the full WFL-006 dry-run product.
Listeners, persistence, AI output, live state discovery, target authorization,
notification execution and the visual builder remain separate tracked work.
