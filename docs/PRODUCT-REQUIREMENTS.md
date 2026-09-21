# Product requirements

Status: Approved product direction; r14 live, r15 source candidate awaiting deployment and live acceptance.

## Implementation snapshot

Live r14 includes authenticated local providers, administrator text chat,
registry discovery, explicit observation policies and scoped questions,
text-only Assist, visual workflow editing, dry runs and local AI notification
execution. The dining-room window test produced three successful notification
calls and owner-confirmed receipt on Fold8Ultra; the other handset receipts are
unconfirmed. The observed live Core version is 2026.9.3.

Installed interfaces include explicit light/media action grants and
one-time human confirmation, local AI action proposals, disabled unsaved AI
workflow draft/refinement controls, Chat modes and temporary Activity records.
After the r14 restart, local chat, tools, scoped window reads and workflow
startup recovery were verified. AI drafting still fails validation live; corrected
prompt examples and stage diagnostics are in the r15 candidate. Physical device
actions have not received live acceptance. Switches, critical
actions and arbitrary services remain unavailable. Azure supports endpoint
authentication testing only; Bedrock is offline-tested and unregistered. No
cloud route, persistent chat history or complete Settings surface exists.
The reviewed r15 candidate adds durable confirmed-device-action metadata only,
with 90-day/4096-record retention; workflow audit hooks remain unwired.
The latest frontend suite passed 363 tests, without claiming live feature acceptance.

The capabilities below remain the complete product target, including broader
device control and automation authoring. A partial typed action catalog does not
fulfil that entire target; broad entity controls and native automation authoring
remain incomplete. See the [tracker](PROJECT-TRACKER.md) for acceptance
and [usage guide](INSTALLATION.md) for the currently implemented boundaries.

## Product objective

Create a private, polished Home Assistant AI orchestration product that lets the user configure AI providers, select household context and permissions, build constrained AI-assisted workflows, and use those agents through chat, Assist, notifications, and voice without routine YAML editing.

## Required capabilities for the complete product

1. Configure multiple provider connections through UI:
   - Local LM Studio and other explicitly configured OpenAI-compatible endpoints.
   - Microsoft Foundry/Azure OpenAI.
   - AWS Bedrock.
   - A documented adapter contract for future providers.
2. Discover current Home Assistant entities, devices, areas, floors, labels, states, and available actions from the live installation.
3. Give each agent/workflow separate observation, action, privacy, and confirmation scopes.
4. Build workflows visually from triggers, deterministic conditions, AI steps, branches, Home Assistant actions, and failure behavior.
5. Support constrained AI modes: compose, classify, extract, choose a predefined branch, and conversation/tool use.
6. Provide chat and Home Assistant Assist conversation-agent support.
7. Deliver announcements and notifications using actions actually available in the user's Home Assistant instance.
8. Support named local/cloud routing policies, health checks, safe failover, and visible data-destination indicators.
9. Provide dry runs, exact context previews, redacted execution traces, and restart-safe workflow behavior.
10. Support security/event workflows without making AI the primary life-safety detector or unrestricted action authority.

## Product constraints

- Private, personal use is the initial distribution target.
- Home Assistant remains the source of truth for states and device actions.
- No browser-direct provider credentials or provider requests.
- No unrestricted generic action tool for the model.
- No automatic cloud disclosure without workflow-level authorization.
- No generated or edited YAML as the primary user experience.
- No claimed provider or Home Assistant capability without documentation or live validation.
- No high-risk action policy may be inferred for the user.

## First workflow journey and remaining acceptance

The window notification journey is configured through the product UI: local
provider, real trigger, prompt, output targets, dry run and activation. Its
isolated three-phone test has owner-confirmed Fold8Ultra delivery. Other handset
receipt and broader output/voice acceptance remain separate checks. Workflow
startup recovery is verified on r14; this does not confirm a new phone delivery.
The original Echo/media announcement goal is not claimed by
the phone result. See [live workflow evidence](evidence/2026-09-20-window-phone-workflow.md).

## Non-goals for the first MVP

- Replacing Home Assistant's full automation engine.
- Autonomous open-ended agents.
- Unrestricted service/action execution.
- Long-term vector memory.
- Camera/video processing.
- Echo as a Home Assistant voice-input satellite.
- Public marketplace distribution.
- Multi-tenant or multi-home hosting.

## Definition of product acceptance

A capability is accepted only when a user can configure it without editing YAML, test it without unintended side effects, understand what data is sent to which provider, recover from an offline provider, and inspect a redacted execution trace.
