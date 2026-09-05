# Architecture

Status: Approved direction; implementation details remain subject to evidence-backed ADRs.

## Implemented boundary

Phase 1 has a provider-neutral config-entry lifecycle and provider contract,
an authenticated LAN-only LM Studio adapter, administrator provider list/test
commands, read-only entity/device/area catalogue commands, and a bundled
TypeScript/Lit panel. The action-free foundation lifecycle probe remains a
test surface, not the product workflow engine.

`LOC-006` adds administrator-only `chat/options` and `chat/send` WebSocket
commands under `ai_orchestrator/`. Chat selects a loaded local provider through
adapter contract metadata and sends a fixed system instruction plus user-supplied
conversation text. It provides no Home Assistant context, tools, actions,
streaming, cloud route, or automatic retry. Requests have message, size, time,
concurrency, and duplicate-request bounds; provider unload cancels owned work
and invalidates late results. The browser keeps a bounded conversation only
while its chat view and authenticated context remain active.

This is a test-ready candidate awaiting live installation and acceptance.
See [LOC-006 evidence](../evidence/2026-09-05-loc-006-local-chat.md) for exact
verification. The remaining components below describe the planned architecture
unless explicitly identified as implemented.

## Decision summary

The product is a Home Assistant custom integration with a bundled full-screen frontend panel. An optional Home Assistant app/add-on remains deferred until measured workloads require process isolation or resources unsuitable for Home Assistant Core.

Home Assistant provides UI config flows for integrations, custom full-screen panels, extensible WebSocket commands, conversation entities, Assist pipelines, and a built-in LLM tool API. These native extension points are the reason to keep the control plane inside Home Assistant:

- [Config flows](https://developers.home-assistant.io/docs/core/integration/config_flow/)
- [Custom panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/)
- [WebSocket extension](https://developers.home-assistant.io/docs/frontend/extending/websocket-api)
- [Conversation entity](https://developers.home-assistant.io/docs/core/entity/conversation/)
- [Voice and Assist](https://developers.home-assistant.io/docs/voice/overview/)
- [Home Assistant LLM API](https://developers.home-assistant.io/docs/core/llm/)

## Components

### Custom integration backend

Owns provider configuration, credential handling, capability normalization, entity/action discovery, workflow storage/execution, routing, conversation entities, security policy, redaction, diagnostics, repairs, and authenticated WebSocket commands.

### Frontend panel

Uses TypeScript and Lit, built as one self-contained module served by the integration. Implemented surfaces are status, provider setup/testing, the read-only catalogue, the lifecycle probe, and the LOC-006 chat candidate. Entity/action permissions, workflow studio, voice assignments, activity, security policy, dry runs, and context/privacy previews remain planned.

### Home Assistant Core

Remains authoritative for current state, registries, user context, events, actions, Assist pipelines, media/notification integrations, and device access.

### Optional app/add-on

Deferred unless required for vector storage, media preprocessing, long-running agents, a credential broker, or local AI services. Apps are containerized and can use authenticated ingress, but add operational and portability costs:

- [Home Assistant apps](https://developers.home-assistant.io/docs/add-ons/)
- [App security](https://developers.home-assistant.io/docs/apps/security/)

## Provider boundary

All providers implement one internal contract for configuration validation, model discovery where supported, capability probing, health, generation, streaming, tool continuation, usage normalization, and error classification.

Implemented live adapter:

- Authenticated LM Studio through its OpenAI-compatible HTTP API, restricted to explicitly configured private LAN IP addresses. Connection/model discovery does not establish generation, streaming, tools, or structured-output capability. LOC-006 exposes text generation as an explicit administrator trial.

Planned adapters:

- Microsoft Foundry/Azure OpenAI using the current OpenAI v1-compatible route for new integrations.
- AWS Bedrock using Converse/ConverseStream.

Provider-specific behavior must not leak into workflows or UI business logic.

Primary references:

- [LM Studio OpenAI-compatible endpoints](https://lmstudio.ai/docs/developer/openai-compat)
- [LM Studio tool use](https://lmstudio.ai/docs/developer/openai-compat/tools)
- [Microsoft Foundry application integration](https://learn.microsoft.com/en-us/azure/foundry/how-to/integrate-with-other-apps)
- [AWS Bedrock Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)

## Workflow boundary

The planned engine is deterministic around constrained AI steps. Initial planned step types are compose, classify, extract, choose an allowed branch, and bounded conversation/tool use. Conditions run before AI calls. Every model result must be schema-validated and policy-checked before any action. Product workflow implementation begins in Phase 2.

The model receives only explicitly selected tools and never a generic unrestricted action executor.

## Data model

- Provider credentials: backend-only Home Assistant config-entry data.
- Provider configuration: adapter-owned config-entry data under the accepted lifecycle contract; the current adapter defines no separate options flow.
- Workflows and policies: planned versioned Home Assistant storage with migrations.
- Conversation history: the LOC-006 candidate keeps only bounded in-memory browser history and transient request processing. It writes no transcript storage. DEC-018 sets a 30-day default for the future persistent chat implementation.
- Execution metadata: planned bounded persistence with the 90-day default accepted in DEC-018; write-frequency and storage behavior still require implementation evidence.
- Exports: planned versioned JSON without credentials.

## Local/cloud routing

Named routes are planned to select providers by capability, health, privacy, latency, and ordered preference. DEC-017 defaults workflows to local-only; cloud failover requires explicit per-workflow opt-in. DEC-019 records the default sensitive-data exclusions. A failed request may be retried or rerouted only before a side effect. After an action executes, the orchestration turn cannot be replayed automatically. LOC-006 contacts only its explicitly selected local connection and has no failover.

## Security model

- Only administrators configure providers and published workflows.
- Observation and action scopes are separate.
- High-risk actions require explicit user policy and confirmation.
- Critical actions are unavailable to AI.
- Security/life-safety primary paths remain deterministic and operate with all AI providers offline.
- Secrets and sensitive values must pass through centralized redaction before future logs, diagnostics, UI traces, or exports. The current provider/chat boundary uses fixed normalized errors, keeps stored credentials out of panel responses, and rejects the configured LM Studio token in chat message content or returned text; this does not establish a comprehensive redaction/export subsystem.
- All provider endpoints are validated against an explicit connection policy; local endpoints are supported but never inferred.

## Compatibility policy

Historical Phase 0 live acceptance names Core 2026.8.3 and Frontend 20260729.7,
including the recorded panel lifecycle and Android Companion checks. It does
not transfer to changed code or another Core version. September 5 discovery
records Core 2026.9.0 and Frontend 20260826.4 on the owner's installation;
`COMP-001` reopens compatibility validation. The current candidate's test and
live results must be recorded before claiming support for that target.
Internal/private frontend or backend APIs remain isolated behind compatibility
modules with regression and live checks. See the [tracker](../PROJECT-TRACKER.md)
and [decisions](../DECISIONS.md).
