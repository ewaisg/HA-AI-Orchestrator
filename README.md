# HA AI Orchestrator

HA AI Orchestrator is a private Home Assistant product for configuring local and cloud AI providers, building constrained AI-assisted automations, and using those agents through chat, Assist, notifications, and voice—with minimal YAML.

## Current state

The project is in **Phase 1: local provider and onboarding MVP**. The repository
implements Home Assistant config-entry lifecycle, authenticated LM Studio
connections, provider setup and connection testing, a read-only entity/device/area
catalogue, and a bundled TypeScript/Lit panel.

`LOC-006` provides an administrator chat: select a local provider, send
text, and continue a bounded conversation in the open view. It sends no automatic
household context and exposes no tools or device actions. Replies arrive when
complete; history is not persisted. Generation is an explicit trial, not a claim
that the selected model's capabilities have been verified.

Local chat has recorded live acceptance, and the owner confirmed the cache-safe
update loaded panel/chat without manually clearing caches.
Historical live evidence targets Core **2026.8.3**; the owner's now-installed
Core **2026.9.0** is undergoing compatibility validation in `COMP-001`.
Provider/catalogue live acceptance and the Phase 1 release gate remain open.
See the [chat candidate evidence](docs/evidence/2026-09-05-loc-006-local-chat.md)
and tracker for exact checks and installation state.

Stored workflows (WFL-002) can be saved from the Automations editor and enabled;
an enabled workflow watches its curated state/time triggers in Home Assistant
and records whether its deterministic conditions passed. No workflow step runs
yet. Visual workflow building, notification and AI steps, entity/action
permissions, Assist, cloud adapters and routing, persistent chat/audit storage,
and security workflows remain planned.

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
