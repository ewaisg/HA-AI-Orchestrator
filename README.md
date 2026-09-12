# HA AI Orchestrator

HA AI Orchestrator is a private Home Assistant product for configuring local and cloud AI providers, building constrained AI-assisted automations, and using those agents through chat, Assist, notifications, and voice—with minimal YAML.

## Current state

The repository implements, and the owner's Home Assistant runs live (Core
2026.9.2, r9 candidate):

- Config-entry lifecycle, authenticated LM Studio connections, provider setup
  and connection testing, a read-only entity/device/area catalogue (bounded
  to 10,000 records per list, with omissions reported), and a bundled
  TypeScript/Lit panel served at a content-addressed path.
- Administrator chat with a local provider (bounded, no household context, no
  tools, not persisted).
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

Only the notify namespace can be called. Nothing runs live unless a workflow
is saved with `run_mode: execute` and enabled. Cloud providers, Assist,
persistent chat, routing policies and security workflows remain planned.
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
