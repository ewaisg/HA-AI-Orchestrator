# HA AI Orchestrator

HA AI Orchestrator is a private Home Assistant product for configuring local and cloud AI providers, building constrained AI-assisted automations, and using those agents through chat, Assist, notifications, and voice—with minimal YAML.

## Current state

The project is in **Phase 0: foundation and architecture validation**. No production integration or provider code has been implemented yet.

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
