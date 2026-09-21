# HA AI Orchestrator

HA AI Orchestrator is a private Home Assistant product for configuring local and cloud AI providers, building constrained AI-assisted automations, and using those agents through chat, Assist, notifications, and voice—with minimal YAML.

## Current state

Live r14 is installed and restarted on the observed Home Assistant Core 2026.9.3
installation. Local chat, tool support, a scoped window-state question and
workflow startup recovery are verified. An earlier
dining-room window workflow completed a local AI generation and three successful
notification calls; the owner confirmed receipt on Fold8Ultra. Receipt on the
other two phones remains unconfirmed. AI drafting still returns an invalid draft
on live r14; corrected prompt examples and precise validation-stage messages are
in the uninstalled r15 candidate. See the tracker for exact evidence.

- Config-entry lifecycle, authenticated LM Studio connections, provider setup
  and connection testing, a read-only entity/device/area catalogue (bounded
  to 10,000 records per list, with omissions reported), and a bundled
  TypeScript/Lit panel served at a content-addressed path.
- Administrator chat with a local provider (bounded, no household context, no
  tools, not persisted).
- One Assist conversation agent per local provider connection. It answers with
  model text only: the conversation's own turns go to the model, nothing else
  does, no tool is offered, and it is never presented as a device-control agent.
  Select it in Settings, then Voice assistants. Home Assistant's own assistant
  still handles device commands.
- Workflows (closed v1 schema, Home Assistant `Store` persistence): a
  structured builder with pickers backed by the real catalogue, discovered
  notification targets and loaded providers; a JSON editor with offline
  preview; stored workflows that observe their triggers and record redacted
  outcomes; AI-step dry runs (compose, classify with a closed category enum,
  extract with typed fields, branch on a classification) against a local
  provider; and `execute` mode, which runs the AI steps and delivers the
  composed text through a notify entity or legacy notify service that Home
  Assistant actually has. One run per workflow at a time, no retries, first
  failure stops, evidence is redacted.

Workflow execution calls only the notify namespace. It requires an enabled
`execute` workflow and a successful dry run bound to its current configuration.
Save a disabled draft, dry run it with its configured local provider, then enable
it. Observe now never runs steps or sends notifications.

Live r14 also includes explicit local observation policies, a synthetic tool
probe, independent questions about permitted states, and these interfaces:

- **Chat modes:** text conversation, questions about permitted entities, and
  device control with review and confirmation. Observation and action grants
  are separate and start empty.
- **Typed device actions:** explicitly grant individual light on/off and media
  play/pause/volume targets in Entities & Permissions. Local AI can propose one
  permitted action, or the user can choose it directly. Every dispatch requires
  a separate human confirmation bound to current permissions and state. Switch
  targets, critical actions and arbitrary services remain unavailable.
- **AI workflow drafting:** describe a notification workflow using selected
  entity/notification references. The returned draft is disabled and unsaved;
  review, save, successful dry run and enable are separate steps. Existing internal
  workflows can be selected explicitly to request a new draft copy. Live draft
  generation is not yet accepted; use the visual builder or JSON editor.
- **Activity:** latest redacted workflow results and ordered scoped-question
  traces. These are temporary runtime records, not persistent audit history.

The r15 candidate adds reviewed durable metadata for confirmed device actions,
with 90-day retention and a 4096-record bound. Workflow audit hooks are not wired.
No physical device-action acceptance is claimed. The latest frontend suite passed
363 tests; automated checks do not establish live acceptance.

Azure OpenAI v1 setup tests endpoint authentication only; the offline Bedrock
adapter remains unregistered. Neither enables cloud chat, workflow routing or
failover. Assist remains text-only. Persistent chat, complete workflow audit,
full Settings, broader entity control, native automation authoring and deterministic
security templates remain unfinished.
The Phase 1 release gate (LOC-007) and the Phase 2 gate (WFL-008) are open;
the tracker records exactly what has live evidence.

- [Manual installation and current usage](docs/INSTALLATION.md)
- [Preview, save, and observe a workflow in Automations](docs/OFFLINE-WORKFLOW-PREVIEW.md)

- [Project tracker](docs/PROJECT-TRACKER.md)
- [Product requirements](docs/PRODUCT-REQUIREMENTS.md)
- [Approved architecture](docs/architecture/ARCHITECTURE.md)
- [Home Assistant platform review](docs/architecture/HA-PLATFORM-REVIEW.md)
- [UI/product plan](docs/product/UI-PRODUCT-PLAN.md)
- [Quality and security plan](docs/quality/QUALITY-SECURITY-PLAN.md)
- [Architecture decision records](docs/architecture/adrs/README.md)
- [Decision register](docs/DECISIONS.md)
- [Evidence and unknowns](docs/EVIDENCE-REGISTER.md)

The tracker is the source of truth for what is done, what is active, what is blocked, and the exact resume point.

## Working principles

- Home Assistant remains the authoritative state, event, permission, voice, and action runtime.
- AI is constrained by deterministic workflows and explicit entity/action allowlists.
- Local/cloud routing and cloud disclosure are explicit per workflow.
- Credentials never enter workflow documents, browser storage, exports, prompts, or ordinary logs.
- A task is complete only when its acceptance evidence is recorded in the tracker.
- Unknown environment values are requested or verified; they are never guessed.
