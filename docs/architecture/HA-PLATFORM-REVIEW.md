# Home Assistant Platform Review

Status: architecture validation for review
Reviewed: 2026-08-22
Scope: Home Assistant custom integration and panel, LM Studio, Microsoft Foundry/Azure OpenAI, and Amazon Bedrock
Evidence rule: this document records only behavior supported by linked primary documentation. Environment-specific facts remain explicit unknowns until the user supplies evidence or a live development instance proves them.

## Executive conclusion

The proposed **custom integration plus custom frontend panel** remains the best primary architecture for a private Home Assistant AI Orchestrator. The following foundation is supported by documented Home Assistant extension points:

- UI setup through config flows and versioned config-entry migration.
- An integration-owned conversation agent through `ConversationEntity`.
- Structured generation through `AITaskEntity`.
- Access to Home Assistant's built-in Assist tool API, or a narrower integration-owned LLM API.
- Integration-owned WebSocket commands for the panel.
- Entity/state/action discovery through documented registries and WebSocket commands.
- Execution through Home Assistant actions with the originating `Context` retained when available.
- Diagnostics, system health, repairs, and ordinary integration tests.

Two pieces are not yet safe to treat as settled:

1. A custom integration can serve a panel, but zero-YAML automatic sidebar registration commonly uses a backend frontend helper that is not documented as a stable custom-integration contract. This needs a compatibility spike.
2. Home Assistant documents validation and discovery of native automation configuration, but not a stable third-party API for embedding its entire automation editor/runtime inside a custom integration. The first workflow engine should therefore implement a deliberately small deterministic trigger/condition set, call documented Home Assistant actions, and expand only after a version-pinned spike.

An add-on remains optional. It should be introduced only if measured dependency, isolation, media-processing, long-running task, or storage requirements cannot safely fit inside Home Assistant Core.

## Validated Home Assistant extension points

### 1. UI configuration and provider instances

Home Assistant config flows are the supported way for an integration to create config entries through the UI. Config-flow handlers control data stored in an entry, support reauthentication/reconfiguration patterns, and config entries have versions that can be migrated. This validates using one config entry per provider connection, with an integration-level entry or versioned storage for orchestrator settings. [Config flow](https://developers.home-assistant.io/docs/core/integration/config_flow/)

Validated uses:

- Provider onboarding, connection tests, reauthentication, and options.
- Multiple connections of the same provider type unless a future product rule intentionally limits them.
- Credentials submitted only to the backend; the panel receives a configured flag, credential type, and validation timestamp rather than the secret or any secret-derived mask.
- Provider configuration migrations when schemas change.

Do not claim at-rest secret-vault encryption. Home Assistant itself notes that `secrets.yaml` does not encrypt secrets, and its security guidance emphasizes account security, updates, and protected backups. Provider credentials should be treated as sensitive Home Assistant configuration data, redacted everywhere, and included only in encrypted backups. [Securing Home Assistant](https://www.home-assistant.io/docs/configuration/securing/), [backup emergency kit](https://www.home-assistant.io/more-info/backup-emergency-kit/)

### 2. Conversation and Assist integration

`ConversationEntity` is the documented extension point for an integration-provided conversation agent. Its current handler receives `ConversationInput` and `ChatLog`; `ConversationInput.context` is specifically the Home Assistant context to attach to actions, and conversation IDs support multi-turn conversations. The `CONTROL` feature signals an agent that can control Home Assistant. [Conversation entity](https://developers.home-assistant.io/docs/core/entity/conversation/)

Home Assistant's LLM API is also a documented extension point. The built-in Assist API exposes only Assist capabilities and exposed entities, and it cannot perform administrative tasks. Integrations may register their own LLM API or contribute tools from an `llm.py` platform. Tool selection is evaluated per request using `LLMContext`, which permits narrower tools based on the assistant, source device, or request context. [Home Assistant LLM API](https://developers.home-assistant.io/docs/core/llm/)

Validated design:

- Provide one `ConversationEntity` for each configured agent profile, or begin with one entity and prove lifecycle behavior before allowing many.
- Use `ChatLog` rather than maintaining an unrelated conversation protocol inside the entity.
- Prefer the built-in Assist API for ordinary exposed-entity control.
- Register an integration-owned LLM API only when its tool set is materially narrower or different.
- Generate tools per request from stored policy; never expose a generic unrestricted action caller.
- Preserve the incoming Home Assistant `Context` through tool/action execution.

### 3. Structured AI tasks

`AITaskEntity` is a current documented Home Assistant entity for AI-powered generation. It supports text/data generation, optional attachments, image generation, and a Home Assistant selector-based structured-output schema. This is a better native fit for `compose`, `classify`, and `extract` workflow steps than inventing a public service contract first. [AI Task entity](https://developers.home-assistant.io/docs/core/entity/ai-task/)

Validated design:

- Implement `GENERATE_DATA` in the initial integration.
- Map orchestrator structured-output schemas to the supported AI Task structure only after testing the schema conversion on the target Home Assistant version.
- Defer attachments and vision until privacy, size, and provider capability rules exist.

### 4. Panel-to-backend communication

Home Assistant explicitly supports integrations extending the WebSocket API with typed schemas and synchronous or asynchronous handlers. A custom panel receives the `hass` object and can call these commands through the authenticated Home Assistant connection. [Extending the WebSocket API](https://developers.home-assistant.io/docs/frontend/extending/websocket-api/), [creating custom panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/)

Validated design:

- Use namespaced commands such as `ai_orchestrator/provider/list`.
- Validate every message schema in the backend.
- Require an administrator for provider, credential, workflow-editing, policy, import/export, and audit-retention commands. Home Assistant Core provides and uses `websocket_api.require_admin`; the source is the primary evidence for the decorator. [Home Assistant WebSocket decorators](https://github.com/home-assistant/core/blob/dev/homeassistant/components/websocket_api/decorators.py)
- Define separate read/chat commands for non-admin users only after an explicit authorization model exists.
- Return public provider metadata and capability results, never raw credentials.

### 5. Entity, target, and action discovery

The documented WebSocket API can fetch states and service actions, validate trigger/condition/action configurations, expand entity/device/area/label targets, return applicable triggers/conditions/services for a target, and return a compact entity-registry list intended for UI display. [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)

The backend also has documented entity, device, and area registries. These registries model the relationships among entities, devices, and areas. [Entity registry](https://developers.home-assistant.io/docs/entity_registry_index/), [device registry](https://developers.home-assistant.io/docs/device_registry_index/), [area registry](https://developers.home-assistant.io/docs/area_registry_index/)

Validated design:

- Use `config/entity_registry/list_for_display` for the panel's efficient entity catalogue where its returned fields are sufficient.
- Combine registry information with current states rather than treating state objects as stable identity records.
- Use `extract_from_target` immediately before execution to detect missing devices, areas, floors, or labels.
- Use `get_services_for_target`, `get_triggers_for_target`, and `get_conditions_for_target` to assist UI discovery.
- Store an entity ID plus registry/device/area metadata as a readable snapshot, then re-resolve before a workflow is published or run.
- Refresh the catalogue after registry changes rather than caching indefinitely.

Action descriptions support target definitions and selector metadata for fields. This validates rendering a schema-driven subset of actions instead of maintaining a fabricated universal action list. [Integration service actions](https://developers.home-assistant.io/docs/dev_101_services/)

A compatibility wrinkle is already documented: action translations were removed from `get_services`; complete translations now come from `frontend/get_translations`. The frontend catalogue must join these sources rather than assume descriptions are localized in one response. [Service Web API change](https://developers.home-assistant.io/blog/2025/10/24/service-web-api-changes/)

### 6. Action execution

Home Assistant's documented WebSocket `call_service` command accepts `domain`, `service`, `service_data`, and entity/device/area targets and returns execution context plus any action response. Integration code can likewise use Home Assistant's service registry. [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)

Validated design:

- The model only proposes a typed tool request.
- The backend validates tool identity, arguments, target resolution, current state, risk policy, and confirmation state.
- The backend invokes the exact allowlisted Home Assistant action.
- The model cannot call administrative or arbitrary actions.
- A workflow records that a side effect occurred before any provider retry is considered.

### 7. Diagnostics, health, and tests

Home Assistant integrations can supply downloadable diagnostics and use `async_redact_data`; official documentation explicitly requires removal of API keys, tokens, location data, and personal information. [Integration diagnostics](https://developers.home-assistant.io/docs/core/integration/diagnostics/)

The system-health platform can report endpoint availability and quota-like information in Home Assistant's system information view. [Integration system health](https://developers.home-assistant.io/docs/core/integration/system_health/)

Official test guidance covers config entries, service calls, states, and entity/device registries. [Testing Home Assistant integrations](https://developers.home-assistant.io/docs/development_testing/)

Validated design:

- Central redaction policy shared by logs, traces, diagnostics, exports, and error messages.
- Provider health is cached with timestamps; entity properties must not perform network I/O.
- Tests must cover setup, unload, reload, migrations, unavailable providers, malformed structured output, and redaction.

## Risky, internal, or insufficiently documented surfaces

These are not forbidden forever. Each is a spike or compatibility boundary and must not be presented as solved before proof.

### Automatic sidebar-panel registration

The public custom-panel documentation proves the panel model and `hass`/`narrow`/`panel` properties, but its user example registers the panel through `panel_custom` YAML. It does not document a stable custom-integration API for automatic sidebar registration. [Creating custom panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels/)

Required spike:

- On the user's exact Home Assistant version, prove integration-owned static asset serving, panel registration, unload/reload, cache busting, mobile-app rendering, and survival across one Core upgrade.
- If the implementation uses `frontend.async_register_built_in_panel` or another Core helper, isolate it in one compatibility module and pin a minimum Home Assistant version.
- Maintain a no-YAML fallback installation method, if possible; otherwise disclose the single required YAML registration rather than hiding it.

### Home Assistant frontend internals

The panel may be a standards-based custom element using any framework, but internal elements such as entity/device/area pickers, form renderers, dialogs, and private TypeScript imports are not promised as a public compatibility surface by the custom-panel documentation.

Policy:

- Use Lit/custom elements and documented `hass` methods.
- Wrap any reused Home Assistant frontend element behind a small adapter.
- Feature-detect elements and supply an orchestrator-owned fallback control.
- Do not deep-import source files from a particular Home Assistant frontend build.
- Verify desktop, mobile browser, and Companion App behavior for the pinned minimum release.

### Native automation internals

The WebSocket API documents `validate_config` and target-aware discovery, but that does not establish a stable extension API for storing arbitrary native automations, embedding the native automation editor, or importing private automation/trigger helpers into a custom integration.

Policy for v1:

- Keep a versioned orchestrator workflow schema.
- Support a small, explicitly tested trigger set: state change, numeric threshold, event, time, and manual test are candidates, not assumed commitments.
- Support simple deterministic conditions owned by the orchestrator.
- Execute side effects through public Home Assistant actions.
- Use `validate_config` as validation evidence where applicable, not as the execution engine.
- Do not write `automations.yaml` or Home Assistant `.storage` automation records directly.
- Spike restart recovery, trigger detachment, concurrent runs, cancellation, and reload before publishing workflows.

### Home Assistant storage implementation

Config entries are validated for provider configuration. A larger mutable workflow collection will likely need `homeassistant.helpers.storage.Store`, but there is no dedicated public developer guide in the reviewed documentation establishing it as a durable third-party database API.

Policy:

- Never edit files in `.storage` directly.
- Put all access behind a repository interface.
- Use explicit schema versions and forward migrations.
- Write atomicity, corruption, restart, backup/restore, and downgrade tests.
- Bound trace history and write frequency.
- Re-evaluate an optional add-on/database only when measured retention or throughput requires it.

### Provider SDK footprint and blocking I/O

Home Assistant installs manifest requirements, but a missing wheel or installation failure prevents the integration from loading. Home Assistant also prohibits blocking I/O on its event loop and recommends async HTTP clients using the shared web session. [Integration manifest requirements](https://developers.home-assistant.io/docs/creating_integration_manifest/), [blocking operations with asyncio](https://developers.home-assistant.io/docs/asyncio_blocking_operations/), [injecting the web session](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/inject-websession/)

Policy:

- Use Home Assistant's shared async HTTP session for LM Studio and OpenAI-compatible Azure endpoints.
- Do not hand-roll AWS Signature Version 4.
- Spike the official AWS SDK dependency, install time, memory, ARM64 support, cancellation, and executor cost on the actual Home Assistant host.
- If the Bedrock dependency is too costly or blocking, move only the Bedrock adapter into an optional add-on or narrowly scoped local broker; do not move the entire orchestrator by assumption.

### Arbitrary provider endpoints and SSRF

An administrator-configurable OpenAI-compatible base URL is intentionally capable of reaching LAN services. That same capability can reach unintended Home Assistant, Supervisor, router, cloud-metadata, or redirect targets.

Required spike and policy:

- Accept only `http` and `https` URLs.
- Require HTTPS for public/cloud endpoints; permit HTTP for a confirmed private LM Studio endpoint with a visible warning.
- Reject embedded credentials, fragments, invalid ports, and unsafe redirects.
- Resolve and re-check the destination at request time to address DNS rebinding.
- Explicitly block platform metadata and Supervisor/Core administrative destinations while still allowing user-approved LAN inference hosts.
- Keep provider setup and endpoint mutation admin-only.
- Test IPv4, IPv6, redirects, alternate numeric IP forms, and DNS changes.

### Remote MCP and provider-side tools

LM Studio can allow per-request or configured MCP servers, and its documentation warns that configured MCP servers may have filesystem or private-data access. This product's v1 should not enable or request provider-side MCP tools. Tools must remain client-side, typed, and enforced by the Home Assistant integration. [LM Studio server settings](https://lmstudio.ai/docs/developer/core/server/settings)

## Provider-specific current facts

### LM Studio / OpenAI-compatible local providers

Confirmed facts:

- LM Studio documents `GET /v1/models`, `POST /v1/responses`, `POST /v1/chat/completions`, `POST /v1/embeddings`, and legacy `POST /v1/completions`. An OpenAI client can be pointed at the server by changing its base URL. [LM Studio OpenAI-compatible endpoints](https://lmstudio.ai/docs/developer/openai-compat)
- Serving on the local network binds beyond localhost. LM Studio explicitly warns that this exposes the server beyond `127.0.0.1` and recommends authentication. [Serve on Local Network](https://lmstudio.ai/docs/developer/core/server/serve-on-network)
- API-token authentication requires LM Studio 0.4.0 or newer, is disabled by default, and uses `Authorization: Bearer <token>`. Tokens can have permissions and are shown only once when created. [LM Studio authentication](https://lmstudio.ai/docs/developer/core/authentication)
- LM Studio supports client-side tool requests through Chat Completions and Responses, but tool reliability is model-dependent. Its documentation distinguishes native tool-use support from a default prompt/parser fallback whose results vary by model. [LM Studio tool use](https://lmstudio.ai/docs/developer/openai-compat/tools)

Implementation consequence:

- The adapter is protocol-compatible, not model-capability-assured.
- Setup must probe the selected model for ordinary generation, streaming if enabled, structured output, and at least one harmless synthetic tool call.
- Persist observed capability results with LM Studio version, model identifier, and test timestamp.
- Never infer tool safety or reliability from a successful HTTP 200 chat response.
- Disable LM Studio MCP features for orchestrator requests.

### Microsoft Foundry / Azure OpenAI

Confirmed facts from Microsoft's current integration guidance:

- Applications wanting OpenAI v1 semantics should use `https://{resource}.openai.azure.com/openai/v1/`.
- Chat Completions is `POST .../openai/v1/chat/completions`, and the `model` field contains the Azure deployment name in Microsoft's example.
- Authentication supports `Authorization: Bearer <Entra token>` (recommended by Microsoft) or the `api-key` header.
- New integrations should not use the Foundry Model Inference `/models` path; Microsoft says the Azure AI Inference beta SDK was deprecated and retired on 2026-05-30.
- Foundry project endpoints and Azure OpenAI v1 endpoints have different shapes and token audiences; they are not interchangeable base URLs.

Source: [Integrate Microsoft Foundry with your applications](https://learn.microsoft.com/en-us/azure/foundry/how-to/integrate-with-other-apps)

Implementation consequence:

- Name the first adapter `azure_openai_v1`, not a generic `foundry` adapter that implies every Foundry API is supported.
- Accept and validate the exact resource endpoint and deployment name supplied by the user.
- Support API-key authentication first only if the user chooses it; do not claim managed identity will work on Home Assistant Green.
- Treat service-principal/Entra authentication as a separately designed credential flow with token refresh and an explicit token audience.
- Never use the retired `/models` route in new code.
- A future Foundry project/agent adapter must be a separate capability because its endpoint and state model differ.

### Amazon Bedrock

Confirmed facts:

- AWS recommends `Converse`/`ConverseStream` as a consistent interface for models that support messages. Not every Bedrock model supports Converse, streaming, tool use, or the same regions. [Inference using Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html), [model availability and compatibility](https://docs.aws.amazon.com/bedrock/latest/userguide/models.html)
- `Converse` requires `bedrock:InvokeModel`; `ConverseStream` requires `bedrock:InvokeModelWithResponseStream`. Requests identify a `modelId`, which may represent a model or inference profile. [Inference using Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- Converse supports system messages, common inference configuration, model-specific request fields, `toolConfig`, `guardrailConfig`, and request metadata. [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)
- In client-side tool use, the model requests a tool and the application executes it; the model does not directly execute the Home Assistant action. [Bedrock client-side tool use](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use-client-side.html)
- Bedrock guardrails can be attached to Converse/ConverseStream, but guardrail coverage depends on request construction. If `guardContent` blocks are used, untagged content may not be assessed as a caller expects. [Guardrails with Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-converse-api.html)
- Model access and marketplace prerequisites can vary by model/account; an `AccessDeniedException` is not sufficient evidence of a bad stored credential. [Request model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
- AWS states that Bedrock does not store content supplied to `Converse`; privacy and logging settings still need review in the user's account. [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)

Implementation consequence:

- Store region and exact model/inference-profile ID; never fabricate a default model ID.
- Probe capability in the configured region and report access, subscription, IAM, unsupported API, throttling, and validation failures separately.
- Grant only invocation permissions for approved model/inference-profile resources where AWS resource scoping supports it; avoid `AmazonBedrockFullAccess` for the runtime identity.
- Add streaming permission only if the user enables streaming.
- Keep Home Assistant tool execution client-side even if Bedrock offers server-side tools in other APIs.
- Treat guardrails as an additional provider control, not the Home Assistant authorization boundary.

## Compatibility strategy

### Home Assistant version policy

1. Obtain the user's exact Home Assistant Core version before selecting a minimum supported release.
2. Develop against that version and current stable, then pin `homeassistant` in tests.
3. Maintain a small CI matrix: minimum supported, current stable, and current beta as an allowed-failure early warning.
4. Release compatibility updates monthly when affected, because Home Assistant recommends keeping current and its LLM/AI Task interfaces are actively evolving.
5. Keep all version-sensitive panel registration, storage, and automation attachment code in explicit adapters.
6. Fail setup with a repair issue and actionable version message rather than partially loading.

### Provider compatibility policy

- The normalized provider contract is internal and versioned.
- Capability flags are learned from both documented provider/model metadata and live harmless probes.
- Unknown capability means unavailable until tested; it does not mean supported.
- Store provider type, endpoint shape, model/deployment ID, provider version when observable, probe timestamp, and normalized error class.
- Contract tests use redacted fixtures; optional live tests require user-supplied credentials and incur no side effects beyond inference.
- Do not promise all “OpenAI-compatible” servers implement identical structured output, streaming events, reasoning fields, usage accounting, or tool calls.

### Frontend compatibility policy

- Build a self-contained custom element bundle.
- Use documented WebSocket commands or orchestrator-owned commands.
- Avoid importing Home Assistant's private frontend modules.
- Isolate and feature-detect any custom picker reuse.
- Add visual and interaction tests for narrow/mobile mode, theme changes, reconnect, stale entities, and unavailable providers.
- Fingerprint frontend assets to prevent an old browser bundle talking to a newer backend schema.

### Data compatibility policy

- Every persisted object has `schema_version`, stable ID, created/updated timestamps, and migration coverage.
- Migrations are forward-only and preserve an export before destructive transformation.
- Credentials are never present in workflow exports, traces, or provider-list responses.
- Provider, workflow, policy, and trace storage have independent versions and retention rules.
- Backups must be encrypted; on Home Assistant 2026.4 and later, the current backup format uses SecureTar v3. [Home Assistant backup encryption update](https://www.home-assistant.io/blog/2026/03/26/modernizing-encryption-of-home-assistant-backups/)

## Exact unknowns requiring user or environment evidence

Implementation must not substitute guesses for the following.

### Home Assistant host

- Exact Home Assistant Core, Operating System, Supervisor, and Frontend versions from **Settings → System → Repairs → System information** or **Settings → About**.
- Confirmed installation type. The referenced conversation says “Home Assistant Green,” but that cached conversation is context, not current host evidence.
- CPU architecture, free memory, free storage, and backup configuration.
- Whether encrypted automatic backups are enabled and whether the emergency kit is stored off-device.
- Whether remote access, Home Assistant Cloud, a reverse proxy, custom TLS, or a VPN is used.
- List of Home Assistant administrators and intended non-admin chat users.
- Current custom integrations and HACS availability, if HACS distribution is desired.

### Existing Home Assistant behavior

- Export or screenshots of the working LM Studio `rest_command`, script, automation, and response-variable handling.
- Exact Echo/media-player integration, entity ID, and action currently used for announcements.
- Entity/device/area/label inventory relevant to the first window workflow.
- The exact trigger, timing rule, repeat/deduplication behavior, quiet hours, and desired failure message for that workflow.
- Which entities may be read locally, sent to cloud providers, controlled, or never exposed.
- Which actions require confirmation and how confirmation should be delivered.

### LM Studio host

- LM Studio version.
- Current server base URL and whether it is DHCP-reserved or otherwise stable.
- Whether Require Authentication is enabled; token value should be entered only in the product setup UI, not committed to the repository or pasted into documentation.
- Token permissions shown in LM Studio.
- Windows firewall/network profile rules and whether Home Assistant can still reach the endpoint after authentication is enabled.
- Exact loaded model identifier, quantization, context length, and available memory.
- Live results for chat, structured output, streaming, and synthetic tool-call probes.
- Whether LM Studio server startup/model loading is automatic after a Windows restart.

### Microsoft Azure

- Whether the user has an Azure OpenAI resource, a Foundry resource/project, or both.
- Exact endpoint copied from Azure, deployment name, Azure cloud, tenant, subscription, and resource group.
- Chosen auth mode: API key or a dedicated Entra application/service principal.
- If Entra is chosen: tenant ID, client ID, credential type, token audience, assigned role, and proof of a successful token-authenticated inference call. Secrets must not be committed.
- Network restrictions, private endpoints, APIM, content-filter policy, logging, quota, and budget settings.

### AWS

- AWS account/organization constraints, region, exact model ID or inference-profile ID, and whether the model is enabled for the account.
- IAM principal type and a redacted policy document proving allowed resources/actions.
- Credential strategy: dedicated access key, temporary session credentials, or assume-role flow.
- If assume-role is chosen: source credential, role ARN, external ID if required, session duration, and refresh expectations.
- Proof of `Converse` and, if desired, `ConverseStream` in the selected region.
- Guardrail ID/version if guardrails are required, plus expected scope.
- AWS invocation logging, CloudTrail, data residency, quotas, and budget alarms.

### Product policy

- Required retention for chat, workflow traces, prompts, tool arguments, and notification content.
- Whether trace content should be stored at all or only metadata by default.
- Local/cloud failover rules for each first workflow.
- Maximum acceptable latency and exact deterministic fallback announcements.
- Whether future camera/voice recordings may ever leave the LAN.
- Whether installation must be HACS-compatible, manually copied, or eventually submitted to Home Assistant Core. These paths have different quality and release requirements.

## Recommended initial ADRs

These are recommended records to create and approve. “Provisional” means the architecture spike must supply evidence before acceptance.

### ADR-001 — Custom integration plus panel as the primary product

Decision: keep state/action/Assist authority in a Home Assistant custom integration and provide the main UI as a custom panel. An add-on is optional and capability-driven.

Reason: this uses documented config-flow, entity, LLM, action, registry, and WebSocket extension points without creating a second home-automation authority.

Status: accept architecture; panel auto-registration mechanism remains provisional.

### ADR-002 — Home Assistant remains the only side-effect executor

Decision: provider adapters generate text, structured data, or tool requests. Only the backend policy layer may call Home Assistant actions. No provider receives a bearer token or unrestricted action tool.

Status: accept.

### ADR-003 — Native Conversation and AI Task entities

Decision: implement `ConversationEntity` for chat/Assist and `AITaskEntity.GENERATE_DATA` for compose/classify/extract. Share provider routing and `ChatLog` processing behind both.

Status: accept, with a minimum-version decision after environment evidence.

### ADR-004 — Per-request least-privilege tools

Decision: use Home Assistant's built-in Assist API where its exposure model is sufficient; otherwise assemble a narrower integration-owned LLM API. Generate tools per request from explicit agent/workflow permissions.

Status: accept.

### ADR-005 — Deterministic, bounded workflow runtime

Decision: AI is a bounded step, not the workflow engine. Conditions run before inference. Tool loops have explicit maximum calls and deadlines. Retries cannot replay a completed side effect.

Status: accept. Exact v1 trigger types remain provisional until restart/reload tests pass.

### ADR-006 — Config entries for providers; versioned repository for workflows

Decision: one config entry per provider connection. Workflow/policy/trace persistence sits behind a repository interface with schema versions and migrations. No direct `.storage` file edits.

Status: accept concept; select and prove the storage implementation in the architecture spike.

### ADR-007 — Explicit local/cloud data policy

Decision: cloud use and cloud failover are opt-in per workflow/agent. A routing decision checks provider capability, sensitivity policy, required modality, and whether a side effect has occurred. Important alerts have deterministic fallback text.

Status: accept.

### ADR-008 — Async transport and no hand-written cloud signing

Decision: use Home Assistant's shared async HTTP session for OpenAI-compatible and Azure OpenAI v1 traffic. Do not implement AWS SigV4 manually. Measure an official AWS SDK approach on the target host; isolate Bedrock in an optional broker/add-on only if evidence shows it cannot safely run in Core.

Status: provisional for Bedrock transport.

### ADR-009 — Provider capabilities are probed, not assumed

Decision: protocol family does not imply model behavior. Setup runs harmless capability tests and records their results. Model lists and compatibility are refreshed because cloud catalogues and local loaded models change.

Status: accept.

### ADR-010 — Admin-only configuration surface

Decision: provider credentials, endpoint changes, workflow publishing, action permissions, imports/exports, and retention settings require a Home Assistant administrator. Non-admin chat/read access is separately designed and defaults off.

Status: accept.

### ADR-011 — Self-contained frontend with compatibility adapters

Decision: ship a self-contained custom-element panel. Use documented APIs. Any Home Assistant internal component or panel-registration helper is isolated, feature-detected, version-tested, and replaceable.

Status: provisional until the panel spike passes.

### ADR-012 — No provider-side MCP in v1

Decision: disable provider-side MCP use. All v1 tools are client-side orchestrator tools with JSON-schema validation, policy enforcement, and an auditable Home Assistant execution path.

Status: accept.

### ADR-013 — Security events are deterministic-first

Decision: fire, carbon-monoxide, water, intrusion, and panic alerts execute their primary notification path without waiting for AI. AI may enrich or classify only in bounded branches; `uncertain` and provider failure are first-class outcomes.

Status: accept.

## Architecture-spike exit criteria

Implementation should not move from skeleton to feature work until all of these have evidence:

1. The exact Home Assistant environment and first workflow inputs are captured.
2. A config entry can be added, reconfigured, reauthenticated, reloaded, unloaded, and migrated without YAML.
3. A bundled panel loads on desktop and mobile, reconnects, and survives one Home Assistant upgrade; its registration mechanism and fallback are documented.
4. An admin-only integration WebSocket command is tested against admin and non-admin users.
5. `ConversationEntity` and `AITaskEntity` both run through one fake provider and preserve context.
6. Entity/action discovery works for the real window and Echo entities, including a rename and a missing target.
7. One no-side-effect workflow survives integration reload and Home Assistant restart without duplicate trigger registration.
8. LM Studio authentication and capability probes pass against the real model.
9. Azure and Bedrock remain mocked until the user supplies the exact resource/account evidence; no placeholder endpoint, deployment, model, region, or credential is silently promoted into runtime configuration.
10. Secrets are absent from frontend responses, logs, diagnostics, trace export, workflow export, and test snapshots.
11. Local endpoint SSRF/redirect tests pass while the approved LM Studio LAN endpoint remains reachable.
12. The Bedrock transport decision includes measured install size, setup time, memory, latency, cancellation, and failure behavior on the target host.

## Final platform recommendation

Proceed with the custom integration and panel, but make the first deliverable an evidence-producing skeleton rather than a broad automation builder. The safe implementation order is:

1. Environment inventory and ADR approval.
2. Config-entry/provider skeleton, redaction, and admin WebSockets.
3. Panel registration/compatibility spike.
4. Fake provider plus native Conversation and AI Task entities.
5. Read-only entity/action catalogue.
6. Authenticated LM Studio adapter and capability probes.
7. One deterministic window-to-Echo workflow with dry run, deduplication, fallback, and restart tests.
8. Safe tool requests and Assist permissions.
9. Azure OpenAI v1 after exact Azure evidence.
10. Bedrock Converse after exact AWS evidence and the dependency spike.

This sequence validates the uncertain Home Assistant boundaries early while preserving the approved product direction and the rule that environment data, provider capabilities, and action safety are proven rather than assumed.
