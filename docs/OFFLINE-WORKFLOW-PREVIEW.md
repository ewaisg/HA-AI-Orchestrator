# Offline workflow preview

WFL-002A adds a local command for evaluating a workflow against a supplied
snapshot. It does not need Home Assistant or a provider connection. This command
also has an administrator panel editor under **Automations**. Previewing never
activates a workflow; saving and enabling one (WFL-002) is a separate explicit
step described below.

## Build a workflow with pickers (WFL-005)

**Build a workflow** at the top of Automations assembles a document from what
Home Assistant actually has: a name, mode (observe or execute), the local
provider for AI steps, one trigger (an entity changing to a state, chosen from
the read-only catalogue with search; a time of day; or manual), any number of
deterministic conditions (time window, entity state, numeric bound), and
ordered steps (compose, classify, notification with a target chosen from the
discovered notify entities and services). Field problems are listed until the
document is valid; **Save workflow** stores it, **Open in JSON editor** hands
the same document to the editor below for preview or dry run. Nothing is sent
until you save.

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

## Dry-run the AI steps (WFL-003)

In the panel, after saving a workflow (or loading a stored one into the
editor), choose a local provider under **Local provider for a dry run** and
select **Dry run AI steps**. The result lists each step: composed text or the
chosen category for AI steps, `planned, not sent` for notifications, and a
static reason for a failed step. The control is disabled until the editor
holds a stored workflow id, the snapshot is non-empty, and a local provider
is available; a dry run of an unsaved draft is refused by the backend.

The underlying command `ai_orchestrator/workflows/dry_run` takes a stored `workflow_id`, a local
provider `connection_id`, and a `snapshot_json` in the same shape as the
preview snapshot. Triggers and conditions are evaluated offline against that
snapshot first; if the scenario is not eligible, no provider is contacted and
`steps` is empty. Otherwise each AI step is run once, in order, against the
selected local provider with a 60-second deadline and no retries:

- `ai_compose` sends a fixed instruction, the step prompt, and a bounded
  context block (workflow name, time, the event, and only the states of the
  entities named by the workflow's conditions). The reply must be non-empty
  text of at most 2,000 characters with no tool calls or structured output.
- `ai_classify` additionally requests structured output whose only field is
  `category`, constrained to the step's categories; anything else is rejected.
- `notify` never runs; it is reported as `planned` with the step whose text
  would have been used.
- `ai_extract` requests structured output with exactly the step's typed
  fields and reports the accepted `values`; a missing, extra, or wrongly typed
  field is `invalid_output`.
- `branch` makes no provider call: it is `taken` when the named earlier
  classify step produced the named category, otherwise `not_taken`, after
  which later steps are `skipped` and the run still completes.

Malformed or off-schema output is reported as `invalid_output` and stops the
run; later steps are `skipped`. Provider failures use the normalized error
codes. `actions_executed` is always 0. Results go back to the administrator
who asked and are not stored. One dry run per administrator runs at a time.

## Run a workflow live (execute mode, WFL-004)

A stored workflow runs its steps only when its document says so:

```json
"run_mode": "execute",
"provider_connection_id": "<connection id of a local provider>"
```

`run_mode` defaults to `observe`; a document without it, including every
document saved before this version, never executes. `provider_connection_id`
is required when an executing workflow has AI steps and must name a loaded
local provider (the same ids the chat and dry-run provider selects use).
Enable the workflow as usual. When a trigger fires and every condition passes,
the foundation runs, in order: each AI step once (as in a dry run), then each
`notify` step, delivering the last composed text with the workflow name as the
title. A `notify_service` reference `notify.<name>` is resolved at delivery
time against Home Assistant itself: a notify entity with that id is sent
through `notify.send_message`; otherwise a legacy notify service with that
name is called; otherwise the step fails as `notify_target_missing` and
nothing is guessed. The editor lists the targets Home Assistant actually has.

One execution runs per workflow at a time; an eligible event that arrives
while a run is in progress is counted as skipped, never queued or replayed.
The first failure stops the run and later steps are skipped. Deliveries are
never retried. The list shows executions, failures, skips, and a redacted
last-execution record (statuses, error codes, provider calls, deliveries);
message text is not retained.

Observation stays the default. An eligible outcome in `observe` mode means
"this workflow would have started", not that anything happened. Enabling a
workflow that has no trigger or no step is refused.

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
