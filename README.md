# HA AI Orchestrator

HA AI Orchestrator is a private Home Assistant product for configuring local and cloud AI providers, building constrained AI-assisted automations, and using those agents through chat, Assist, notifications, and voice—with minimal YAML.

## Current release: interface 2026.11.07

A guided local-first workspace inside Home Assistant: connect LM Studio, verify a
plain chat, choose explicit permissions, and build a notification workflow.

- **Guided setup:** ordered connection, chat, permissions and workflow steps.
  Provider-loaded status does not claim that inference or device control passed.
- **Simpler workflow workspace:** a Build → Test → Enable guide, numbered builder
  sections, optional conditions, and collapsed AI drafting, JSON testing and
  developer diagnostics. Explicit editor handoffs open the testing section.
- **Recovery:** actionable activation/dry-run errors, a Settings & recovery page,
  and a visible interface release label. Simple state/time drafts can create a
  sample test event without hand-writing JSON.
- **Preserved backend:** this release changes no provider transport, execution,
  authorization, confirmation or storage policy. The integration manifest remains
  0.1.0; the interface has its own visible release identifier.

November live recovery verified an authenticated LM Studio connection and a
plain chat response through Home Assistant Core 2026.11.0. This is a smoke test,
not a claim that all backend behavior is certified on that Core version. The
existing multi-phone workflow was found inactive with an activation error and
has been paused for review. A separate lab workflow passed its dry run and
real trigger with one local generation, one accepted notification and no failures;
it was paused afterward. Handset receipt is tracked separately. Historical September test counts and revision names
are not current acceptance evidence.

The frontend gate passes **457 browser tests**, lint, TypeScript checks, build,
sync and byte-identical bundle verification. Production dependency audit reports
zero vulnerabilities. Development dependency audit findings are not resolved by
this interface release.

### Current boundaries

The custom Assist conversation agent is text-only. The panel separately supports
scoped state questions and reviewed device proposals; grants and confirmations
remain required. Workflows are integration-owned documents rather than native
Home Assistant automations. AI notification workflows require a successful dry
run before enablement. Observe mode records trigger outcomes and runs no steps.
AI-generated drafts must be reviewed, saved and tested separately.

Physical device acceptance, complete voice-pipeline acceptance, persistent chat,
complete workflow audit and cloud routing/failover remain outside this release.
Azure endpoint tests do not establish inference support; Bedrock is not a
registered production provider. Earlier tracker sections describe historical or
unfinished work and do not expand this release's scope.

- [Setup, testing and interface rollback](docs/GETTING-STARTED.md)
- [Manual installation](docs/INSTALLATION.md)
- [Release evidence](docs/evidence/2026-11-07-interface-release.md)
- [Project tracker](docs/PROJECT-TRACKER.md)
- [Product requirements](docs/PRODUCT-REQUIREMENTS.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
- [Decision register](docs/DECISIONS.md)

## Working principles

- Home Assistant remains the authoritative state, event, permission, voice, and action runtime.
- AI is constrained by deterministic workflows and explicit entity/action allowlists.
- Local/cloud routing and cloud disclosure are explicit per workflow.
- Credentials never enter workflow documents, browser storage, exports, prompts, or ordinary logs.
- A task is complete only when its acceptance evidence is recorded in the tracker.
- Unknown environment values are requested or verified; they are never guessed.
