# Product requirements

Status: Approved product direction; Phase 1 implementation and acceptance are active.

## Implementation snapshot

The repository implements provider-neutral connection lifecycle and contracts,
an authenticated local LM Studio adapter, provider setup/testing, a read-only
entity/device/area catalogue, and the bundled panel. `LOC-006` adds test-ready
administrator text chat with a selected local provider, bounded session-only
history, no automatic household context, no streaming, and no tools or actions.
The chat candidate is awaiting live installation and acceptance; see the
[candidate evidence](evidence/2026-09-05-loc-006-local-chat.md).

The capabilities below describe the complete product target. Workflows,
observation/action permissions, Assist, notifications, Azure/Bedrock, routing,
and persistent chat/audit storage remain planned. Exact task status and the
Core 2026.9.0 compatibility review are in the [tracker](PROJECT-TRACKER.md).

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

## First complete workflow journey (planned)

The first complete user journey is the already proven concept of a window event producing an AI-written announcement on an Echo/media target, rebuilt so that provider, trigger, entity, prompt, conditions, output target, testing, and publishing are all configured through the product UI.

The existing proof demonstrates feasibility but must be revalidated against the live environment before its host, model, entity, action, or timing values are committed to implementation.

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
