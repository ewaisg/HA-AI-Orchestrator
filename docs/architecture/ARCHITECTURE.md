# Architecture

Status: Approved direction; implementation details remain subject to evidence-backed ADRs.

## Decision summary

The product will be a Home Assistant custom integration with a bundled full-screen frontend panel. An optional Home Assistant app/add-on may be introduced later for workloads that genuinely require process isolation or resources unsuitable for Home Assistant Core.

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

Owns onboarding, providers, entity/action permissions, workflow studio, chat, voice assignments, activity, security policy, dry runs, and context/privacy previews. The planned stack is TypeScript plus Lit, pending the frontend ADR and compatibility spike.

### Home Assistant Core

Remains authoritative for current state, registries, user context, events, actions, Assist pipelines, media/notification integrations, and device access.

### Optional app/add-on

Deferred unless required for vector storage, media preprocessing, long-running agents, a credential broker, or local AI services. Apps are containerized and can use authenticated ingress, but add operational and portability costs:

- [Home Assistant apps](https://developers.home-assistant.io/docs/add-ons/)
- [App security](https://developers.home-assistant.io/docs/apps/security/)

## Provider boundary

All providers implement one internal contract for configuration validation, model discovery where supported, capability probing, health, generation, streaming, tool continuation, usage normalization, and error classification.

Initial adapters:

- LM Studio/OpenAI-compatible HTTP APIs.
- Microsoft Foundry/Azure OpenAI using the current OpenAI v1-compatible route for new integrations.
- AWS Bedrock using Converse/ConverseStream.

Provider-specific behavior must not leak into workflows or UI business logic.

Primary references:

- [LM Studio OpenAI-compatible endpoints](https://lmstudio.ai/docs/developer/openai-compat)
- [LM Studio tool use](https://lmstudio.ai/docs/developer/openai-compat/tools)
- [Microsoft Foundry application integration](https://learn.microsoft.com/en-us/azure/foundry/how-to/integrate-with-other-apps)
- [AWS Bedrock Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)

## Workflow boundary

The engine is deterministic around constrained AI steps. Supported first-step types are compose, classify, extract, choose an allowed branch, and bounded conversation/tool use. Conditions run before AI calls. Every model result is schema-validated and policy-checked before any action.

The model receives only explicitly selected tools and never a generic unrestricted action executor.

## Data model

- Provider credentials: backend-only Home Assistant config-entry data.
- Provider non-secret options: config entry data/options as decided by ADR.
- Workflows and policies: versioned Home Assistant storage with migrations.
- Conversation history: bounded and opt-in; default retention to be decided.
- Audit history: redacted and bounded; high-frequency persistence strategy to be decided.
- Exports: versioned JSON without credentials.

## Local/cloud routing

Routes select providers by capability, health, privacy, latency, and ordered preference. Cloud failover is opt-in per workflow. A failed request may be retried or rerouted only before a side effect. After an action executes, the orchestration turn cannot be replayed automatically.

## Security model

- Only administrators configure providers and published workflows.
- Observation and action scopes are separate.
- High-risk actions require explicit user policy and confirmation.
- Critical actions are unavailable to AI.
- Security/life-safety primary paths remain deterministic and operate with all AI providers offline.
- Secrets and sensitive values pass through centralized redaction before logs, diagnostics, UI traces, or exports.
- All provider endpoints are validated against an explicit connection policy; local endpoints are supported but never inferred.

## Compatibility policy

The exact supported Home Assistant versions and frontend compatibility range remain open until the live environment and official APIs are validated in Phase 0. Internal/private frontend or backend APIs require a documented spike, compatibility wrapper, and regression test before adoption.
