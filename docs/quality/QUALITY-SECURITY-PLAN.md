# Quality and Security Plan

Status: proposed for review
Applies to: private Home Assistant AI Orchestrator custom integration, frontend panel, provider adapters, workflows, chat/voice, and any future optional add-on
Last reviewed: 2026-08-22

This document defines how the project will establish quality and safety. It does not claim that any control or test is already implemented. A tracker item may be marked complete only when the evidence in this document exists and has been reviewed.

## 1. Evidence classification

Every architecture, implementation, test, and tracker artifact must distinguish these categories:

- **Verified fact:** confirmed in a cited primary source or observed in a recorded test against the user's actual environment. The evidence must identify when and where it was verified.
- **Design decision:** a rule this project has chosen. It is not presented as a Home Assistant, provider, or device guarantee.
- **Unknown:** information not yet supplied or verified. An unknown that affects safety, compatibility, scope, or acceptance keeps the related tracker item open or blocked.

### 1.1 Verified facts used by this plan

| ID | Verified fact | Primary evidence |
|---|---|---|
| VF-01 | Home Assistant's built-in Assist LLM API is limited to Assist capabilities and exposed entities and does not provide administrative tasks. Custom integrations can register an LLM API and tools, and tool parameters are schema validated. | [Home Assistant LLM API](https://developers.home-assistant.io/docs/core/llm/) |
| VF-02 | A Home Assistant conversation entity receives the initiating Home Assistant `Context`, and the current API uses a `ChatLog` for messages and tool calls. | [Home Assistant conversation entity](https://developers.home-assistant.io/docs/core/entity/conversation/) |
| VF-03 | Home Assistant diagnostics can be downloaded by a user and must not expose passwords, API keys, tokens, location data, or personal information. Home Assistant supplies `async_redact_data`. | [Home Assistant integration diagnostics](https://developers.home-assistant.io/docs/core/integration/diagnostics/) |
| VF-04 | Custom integrations require a version in `manifest.json`; a UI config flow is declared in the manifest and implemented in `config_flow.py`. | [Home Assistant integration manifest](https://developers.home-assistant.io/docs/creating_integration_manifest/) and [config flow](https://developers.home-assistant.io/docs/core/integration/config_flow/) |
| VF-05 | Home Assistant Core uses `YYYY.MM.PATCH` calendar versions. Its documentation recommends `AwesomeVersion` rather than parsing version strings when behavior must be version-gated. | [Home Assistant versioning](https://developers.home-assistant.io/docs/versioning/) |
| VF-06 | Home Assistant recommends focused `pytest` runs for changed integrations, and its quality-scale rule for core integrations sets a greater-than-95-percent module coverage target. | [Testing Home Assistant code](https://developers.home-assistant.io/docs/development_testing/) and [test coverage quality rule](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/test-coverage/) |
| VF-07 | Home Assistant's 2026.8 device-registry changes make a device belong to one config entry and warn that some custom integrations using the old assumptions may need migration. Compatibility shims are best effort and scheduled for removal in 2027.8. | [2026.8 device-registry change](https://developers.home-assistant.io/blog/2026/07/21/device-registry-single-config-entry/) |
| VF-08 | Home Assistant's 2026 condition/script API expects condition `async_check` and lifecycle unloading; its backwards-compatible callable behavior is scheduled to end in 2027.1. | [Condition and script API change](https://developers.home-assistant.io/blog/2026/05/13/condition-script-api-changes/) |

The greater-than-95-percent figure in VF-06 is a useful project target, not a claim that Home Assistant applies its core Integration Quality Scale to this private custom integration. Home Assistant states that custom integrations are not reviewed, security-audited, maintained, or supported by the Home Assistant project. [Integration Quality Scale](https://developers.home-assistant.io/docs/core/integration-quality-scale/)

### 1.2 Project design decisions

| ID | Decision |
|---|---|
| DD-01 | Home Assistant remains the authoritative state and action runtime. AI is a constrained step, not a replacement automation engine. |
| DD-02 | Tools are deny-by-default and generated from explicit per-agent or per-workflow allowlists. There will be no unrestricted model-facing `call_service` or arbitrary HTTP tool. |
| DD-03 | A deterministic path delivers safety and security alerts. AI may enrich, summarize, or classify, but its failure or uncertainty cannot suppress or delay the primary alert. |
| DD-04 | Cloud use and cloud failover are opt-in per workflow. A fallback cannot receive data that the workflow's privacy policy forbids. |
| DD-05 | Secrets remain backend-only and are never returned to the frontend, exports, traces, diagnostics, or ordinary logs. |
| DD-06 | Provider output, entity attributes, event text, notification text, camera metadata, calendar content, web content, and tool results are untrusted input. |
| DD-07 | Side effects are not automatically replayed. Provider failover is allowed only before any side effect; recovery after a side effect resumes from recorded state or stops for review. |
| DD-08 | Dry-run is mandatory before publishing a new workflow or a change that expands its data access, tools, action targets, provider route, or risk level. |
| DD-09 | Test coverage for backend integration modules targets greater than 95 percent, with 100 percent branch coverage required for credential redaction, policy enforcement, confirmation binding, and side-effect replay prevention. Coverage does not replace scenario evidence. |
| DD-10 | Compatibility is claimed only for named Home Assistant Core versions actually tested. Unsupported and untested are different labels; neither is called compatible. |

### 1.3 Unknowns that must not be guessed

These are initially unresolved and must be captured in the project tracker with owner and resolution evidence:

- Exact Home Assistant Core, Operating System, Supervisor, and Frontend versions on the user's Home Assistant Green.
- Installation/distribution path: manual private install, private HACS repository, or another approved method.
- Actual Home Assistant user/admin model for this household and who may configure providers, approve actions, or use chat/voice.
- Which entities, attributes, areas, persons, cameras, calendars, and event payloads are sensitive or permitted to leave the LAN.
- Exact high-risk action policy, including locks, garage doors, alarm panels, covers, HVAC, sirens, and safety devices.
- Whether the user's Echo path is notification/output only or must eventually support voice input.
- Actual LM Studio version, selected models, enabled authentication, endpoint TLS/network controls, structured-output behavior, and tool-calling behavior.
- Azure subscription/tenant/resource/deployment/API details and approved credential method.
- AWS account/region/model or inference profile/IAM policy/guardrail details and approved credential method.
- Provider quotas, costs, rate limits, context limits, retention settings, data-processing locations, and contractual privacy settings for the user's accounts.
- Retention requirements for prompts, responses, traces, camera-derived data, approvals, and audit events.
- Backup encryption, host-disk protection, LAN segmentation, firewall rules, DNS behavior, and certificate trust in the actual deployment.
- Performance targets acceptable to the user for chat, announcements, event classification, failover, and Home Assistant restart/reload.
- Camera/vision scope and whether any biometric identification is intended; neither is assumed for the MVP.

## 2. Threat model

### 2.1 Protected assets

- Home occupancy, presence, security, device, sensor, calendar, camera, voice, and location data.
- Provider credentials, Home Assistant authentication context, approval tokens, and session identifiers.
- Ability to control Home Assistant entities and invoke actions.
- Workflow definitions, policies, provider routes, prompts, model outputs, and execution history.
- Availability and integrity of Home Assistant, local networking, notifications, and safety workflows.

### 2.2 Trust boundaries

1. Browser/frontend panel to the integration backend over Home Assistant's authenticated connection.
2. Integration backend to Home Assistant registries, state, event bus, actions, conversation, and storage.
3. Integration backend to local provider endpoints such as LM Studio.
4. Integration backend to cloud providers such as Microsoft Foundry/Azure OpenAI and AWS Bedrock.
5. Trigger/event/entity data entering prompt construction.
6. Model output crossing back into policy validation and possible Home Assistant action execution.
7. Diagnostics, logs, exports, backups, and support artifacts leaving the live system.
8. Any future add-on boundary, including ingress, Supervisor API permissions, mounted folders, and container network access.

### 2.3 Threat actors and failure sources

- An unauthenticated network client reaching an exposed local provider.
- A Home Assistant non-admin user attempting configuration or actions beyond their authorization.
- A compromised browser session, integration dependency, provider, model endpoint, add-on, or LAN device.
- Malicious or accidental prompt injection inside entity attributes, calendars, messages, camera/event metadata, webpages, or tool results.
- Misconfiguration by an authorized administrator.
- Hallucinated, malformed, duplicated, stale, or adversarial model output.
- Provider outage, throttling, partial streaming, silent model change, capability mismatch, or data-policy drift.
- Logs, exception strings, diagnostics, exports, test recordings, or backups leaking credentials or household data.
- Workflow loops, notification storms, duplicated side effects, stale approvals, or restart/reload races.

### 2.4 Required mitigations by threat

| Threat | Required controls | Required test evidence |
|---|---|---|
| Credential disclosure | Backend-only credential handling; recursive redaction; no secret echo; secret scanning; sanitized exceptions | Canary-secret tests across API responses, UI state, logs, diagnostics, traces, exports, snapshots, and fixtures |
| Prompt injection | Delimited untrusted context; immutable policy layer; tool allowlist independent of prompt; output validation | Adversarial corpus demonstrating that injected instructions cannot expand data or action access |
| Unauthorized action | Authentication and admin checks; per-user/per-agent policy; exact target/argument validation; recheck immediately before action | Negative authorization matrix plus Home Assistant context/audit evidence |
| Dangerous autonomous action | Risk classification; deny/confirmation policy; prohibited-action list; deterministic guard | Tests for every high-risk domain and service/action supported by the product |
| Duplicate side effect | Execution IDs; idempotency guards; side-effect journal; no automatic replay after a committed action | Timeout/restart/failover tests proving one or zero actions, never duplicates |
| Cloud privacy leak | Per-workflow route/privacy policy; field filtering before provider call; cloud destination preview | Captured sanitized outbound requests for allowed and denied cases |
| SSRF or malicious endpoint | Explicit provider schemes; normalized URL validation; redirect policy; DNS/IP revalidation; no provider-supplied arbitrary callback | URL corpus covering loopback, LAN, public, IPv4/IPv6, DNS rebinding simulation, userinfo, redirects, and metadata endpoints |
| Alert suppression | Independent deterministic alert path; bounded AI enrichment deadline; fallback wording | Provider outage/slow/malformed-result tests proving the primary alert still occurs |
| Event/notification storm | Debounce, deduplication, concurrency, rate limits, circuit breakers | Burst/load tests with exact action and notification counts |
| Dependency compromise | Pinned dependencies; automated vulnerability/license review; minimal dependency set; reproducible builds | Lock/manifest diff, software bill of materials, scanner output, and dependency review |
| Broken HA update | Version matrix, deprecation scan, registry lifecycle tests, startup/reload/unload tests | Passing matrix for each claimed version and recorded smoke test on the real HA instance |

## 3. Credential, privacy, logging, and diagnostics rules

### 3.1 Credential handling

- Provider secrets are accepted only by backend config/re-auth flows over the authenticated Home Assistant path.
- The frontend may receive `configured: true`, credential type, and last validation time. It must not receive the original value, a reversible representation, or a masked value derived from the secret.
- Updating a non-secret option must not require the frontend to read and resubmit a stored secret.
- Credentials must not appear in workflow documents, provider capability caches, entity states/attributes, issue reports, exports, fixtures, URLs, query strings, or exception messages.
- Provider clients must send credentials only to the normalized, approved provider origin. Redirect behavior must be disabled or constrained so an authorization header cannot cross origins.
- Least privilege is required. The actual Azure and AWS grants are unknown until their account details are provided and reviewed; example policies are not accepted as proof of the user's policy.
- Secret deletion, rotation, reauthentication, backup/restore behavior, and provider removal must each have an acceptance test.
- Storage protection claims must be based on the user's actual Home Assistant deployment. The project must not describe config-entry or `.storage` data as encrypted at rest without evidence.

### 3.2 Redaction rules

Use a central recursive redactor at every egress point. At minimum it must recognize:

- Case-insensitive key names such as `authorization`, `api_key`, `apikey`, `token`, `access_token`, `refresh_token`, `secret`, `password`, `credential`, `session_token`, AWS access-key fields, Azure key fields, and custom provider headers marked sensitive.
- Authorization header formats, signed AWS headers/query parameters, JWT-like strings, API-key patterns, URLs containing credentials or sensitive query parameters, and provider client exception bodies.
- User-configured sensitive entity IDs, friendly names, attributes, locations, persons, calendar content, raw voice text, notification targets, camera identifiers, and images.

Rules:

- Redaction is recursive across mappings, lists, dataclasses/models, exception chains, streamed chunks, and nested provider responses.
- Redact the value rather than merely the top-level field. Preserve only the minimum structural information needed to diagnose a failure.
- Production logs default to event IDs, workflow IDs, provider adapter type, normalized error class, duration bucket, retry count, and redacted target counts. Prompt/response bodies and tool arguments are excluded.
- Debug mode must be time-bounded and still redact secrets and user-marked sensitive fields. It cannot disable the redactor.
- Do not store hidden model reasoning or chain-of-thought. Store only the user-visible response and the structured tool decision needed for an audit, subject to retention policy.
- Diagnostics must use Home Assistant's redaction helper where applicable and then pass the result through project-specific recursive privacy redaction.
- A test canary set must include unique fake secrets and household data. CI fails if any canary appears in an artifact outside its intentionally encrypted/in-memory test input.

### 3.3 Retention and deletion

- Retention periods are configuration and product decisions still requiring user approval.
- Until approved, persistent prompt and response capture is disabled by default; store only bounded operational metadata necessary to identify an execution and its outcome.
- Deleting a workflow or provider must define whether associated audit records are retained. The UI must state the result before confirmation.
- Export and support bundles are generated on demand, are redacted, contain a manifest of included fields, and never include credentials.

## 4. Prompt, tool, and action safety

### 4.1 Prompt construction

- Build prompts from separately typed layers: immutable safety policy, agent purpose, workflow instruction, selected context, current event, and user input.
- Clearly delimit and label untrusted data. Text in an entity, event, calendar, response, or tool result cannot alter policies, reveal other context, or add tools.
- Minimize context. Only fields explicitly selected by the workflow and permitted by the destination policy are included.
- Show a redacted context preview and destination before a test or publish operation.
- Treat provider/model identifiers and capability results as configuration data, not trusted executable instructions.
- Prompt templates have version IDs. Published executions record the version, not a mutable unnamed string.

### 4.2 Tool contract

Every model-facing tool must have:

- A stable versioned name, narrow purpose, description, and strict input schema.
- An explicit read/action classification and risk level.
- A generated allowlist of permitted entities, devices, areas, actions, and argument ranges.
- Rejection of unknown properties, ambiguous targets, unavailable entities, stale registry references, and unsupported features.
- A bounded, privacy-filtered result schema.
- Timeout, cancellation, error normalization, and audit behavior.

Tool loops have a configured maximum number of steps, total time, token budget, and action count. Exceeding any bound stops safely and produces a user-visible, non-secret error.

### 4.3 Action authorization and execution

Authorization is checked at all of these points:

1. When the workflow/agent is configured.
2. When tools are generated for a request.
3. When model arguments are validated.
4. Immediately before the Home Assistant action, against current state, target resolution, user context, risk policy, and approval.

Additional rules:

- Model text is never interpreted as YAML, Jinja, Python, shell, SQL, a URL to fetch, or an unrestricted Home Assistant action.
- The model chooses only among permitted structured outcomes.
- High-risk confirmations bind the exact workflow version, user, action, targets, arguments, current state preconditions, and expiry. Changing any field invalidates approval.
- Critical actions remain unavailable to the model. The final prohibited list requires user review and test coverage before action-capable release.
- Execution records distinguish requested, authorized, started, committed, failed, and unknown outcome. An unknown outcome is not retried automatically.
- Tool results and action errors are bounded and redacted before returning to a provider.
- Rate, concurrency, and re-entry controls prevent a workflow's own action from recursively triggering an unbounded loop.

## 5. Deterministic security and safety workflow constraints

For fire, carbon monoxide, water leak, intrusion, panic, lock, garage, alarm, camera, and similar workflows:

- Sensor/event qualification, primary alert routing, siren/alarm behavior, and fail-safe action are deterministic and reviewable without a model.
- AI enrichment runs after or in parallel with the deterministic notification and has a strict deadline. It cannot block, cancel, downgrade, or recall the primary notification.
- `uncertain`, `provider_unavailable`, `invalid_result`, and `timed_out` are first-class outcomes with deterministic branches.
- A model classification may increase attention or add context, but may not reduce severity unless a separate, explicit deterministic rule authorizes that behavior.
- Unlocking, opening secured access, disarming, disabling a detector, deleting evidence, suppressing alerts, or modifying the security workflow is not autonomously model-callable.
- Safety workflows must retain a useful canned message and destination when every AI provider is unavailable.
- A workflow test must demonstrate behavior with the provider healthy, slow, unavailable, returning malformed output, returning `uncertain`, and attempting an unauthorized tool.
- Camera and audio data cannot be sent to a provider until the exact data, destination, retention setting, user consent, and non-AI fallback are verified.
- AI output must be labeled as AI-generated or AI-classified where a person could mistake it for a confirmed sensor fact.

## 6. Test strategy and layers

### 6.1 Static and supply-chain checks

- Python formatting, lint, typing, Home Assistant validation, manifest/schema validation, dead-code and async-blocking checks.
- TypeScript formatting, lint, strict type checking, dependency audit, frontend build, and bundle inspection.
- Secret scan over repository, built assets, test reports, snapshots, fixtures, and packaged release.
- Pinned dependency and license review; software bill of materials for a release candidate.
- No unreviewed dependency or generated binary enters a release.

### 6.2 Backend unit and property tests

- Provider request/response normalization.
- URL and redirect validation.
- Recursive credential/privacy redaction.
- Workflow schema validation and migrations.
- Context field selection and cloud privacy filtering.
- Tool schema generation, argument rejection, risk classification, and policy checks.
- Confirmation binding and expiration.
- Idempotency and side-effect journal state transitions.
- Retry, timeout, circuit-breaker, cancellation, and failover rules.
- Deduplication, rate limiting, and loop prevention.
- Property/fuzz tests for nested redaction inputs, malformed provider payloads, and workflow schema boundaries.

### 6.3 Provider contract tests

Every adapter must pass the same provider-neutral suite. Tests use a deterministic fake transport by default; sanitized recorded traffic is supplemental, not foundational.

Required fixture cases:

- Non-streaming text success and empty response.
- Streaming success, chunk boundary variation, cancellation, interrupted stream, and invalid terminal chunk.
- Structured output success, extra fields, wrong types, truncated JSON, markdown-wrapped JSON, and schema refusal.
- Single and multiple tool calls, unsupported tool calling, missing ID, duplicate ID, invalid arguments, unknown tool, and tool-result continuation.
- Authentication failure, authorization failure, model/deployment not found, rate limit with and without retry hint, context overflow, provider safety refusal, 5xx, malformed error body, timeout, DNS/TLS/connect failure, and cancellation.
- Usage present, absent, or provider-specific; no invented token/cost values when absent.
- Capability discovery present, absent, contradictory, or changed after initial setup.
- Secret-bearing request headers and error bodies proving redaction.
- Provider response containing prompt injection or a request for a non-allowlisted tool.

Each fixture must include:

- Adapter and fixture schema versions.
- Provenance: `synthetic` or the exact provider/model/API version and capture date.
- Redaction review status.
- Expected normalized result or normalized error.
- Whether retry and failover are permitted.
- Required capability flags.

Never commit live credentials, signed requests, household prompts, entity names, account IDs, tenant IDs, subscription IDs, AWS ARNs, or provider response headers without explicit field-by-field sanitization. Live provider behavior is verified separately against the user's configured account and recorded as redacted evidence.

### 6.4 Home Assistant integration tests

- Config, options, reauthentication, and removal flows.
- Entry setup, reload, unload, restart recovery, and partial setup failure.
- Conversation entity context propagation and chat-log/tool interaction.
- Registry discovery and updates for entity rename, disable, removal, device/area change, and unavailable state.
- Action execution using Home Assistant context and policy enforcement.
- Workflow trigger/condition lifecycle, including the current condition/script API.
- Storage migrations, corrupt/partial storage recovery, downgrade refusal or safe behavior, and backup/restore.
- WebSocket command authentication, admin requirements, validation, error shape, cancellation, and subscription cleanup.
- Diagnostics download with canary-secret and personal-data checks.
- Repair issue creation and resolution for broken provider/workflow configuration.
- No leaked listeners, tasks, sessions, or providers after reload/unload.

### 6.5 Frontend tests

- Unit/component tests for provider setup, entity/action selection, workflow builder, chat, approval, privacy preview, and audit trace.
- Accessibility checks: keyboard navigation, focus management, labels, contrast, reduced motion, screen-reader names, and error announcements.
- Responsive checks on desktop, tablet, and mobile dimensions actually approved for use.
- Browser tests against named Home Assistant Frontend/Core versions.
- Tests proving secrets never enter browser state, browser storage, URLs, screenshots, telemetry, or error reports.
- Destructive/high-risk action warnings and exact confirmation summary.
- Stale data, disconnected WebSocket, concurrent edit, migration-required, and unsupported-version states.

### 6.6 End-to-end and hardware-in-the-loop tests

- Real Home Assistant test instance with representative fake entities for repeatable CI.
- User's Home Assistant Green for release-candidate smoke tests; no destructive test runs without an approved target list.
- Live LM Studio connectivity, authentication, selected model behavior, structured output, tool behavior, timeout, and restart.
- Live Azure and AWS tests only after the user provides approved test resources and credentials.
- Echo/media notification path using an approved harmless message and time window.
- Restart and network-partition scenarios while a workflow is idle, waiting on a provider, waiting on approval, and at every action journal boundary.
- Dry-run versus live-run comparison using the same frozen context where safe.

### 6.7 Adversarial and abuse tests

- Prompt injection in every untrusted context source and tool result.
- Cross-workflow, cross-user, cross-agent, and cross-provider data isolation.
- Entity rename/alias confusion, Unicode confusables, oversized strings, control characters, and malicious markup.
- Unauthorized tool/action/target/attribute requests.
- Approval theft, reuse, expiry, argument substitution, race, and stale-state attacks.
- SSRF, redirect, DNS-rebinding, TLS, proxy, and credential-forwarding scenarios.
- Notification storm, recursive trigger, concurrent execution, replay, and provider retry amplification.
- Malicious import/export, schema downgrade, storage corruption, and oversized payload.

### 6.8 Reliability and performance tests

Targets must be supplied or approved before these tests can pass. Measure rather than assume:

- Provider setup validation latency.
- Time from event to deterministic alert and to AI-enriched follow-up.
- Chat first-token and total response time.
- Concurrent workflow capacity on the user's actual Home Assistant Green.
- Memory/CPU impact at idle, during bursts, and after repeated reloads.
- Maximum bounded storage growth and retention cleanup.
- Recovery time after provider, network, Home Assistant, or LM Studio restart.

## 7. Home Assistant version compatibility policy

### 7.1 Compatibility decisions

- Record Core, Frontend, Operating System, Supervisor, Python/runtime, integration, and frontend bundle versions in every compatibility report when applicable.
- Set the initial minimum Core version only after the user's actual version and required APIs are verified.
- Candidate support matrix: the user's installed stable Core version, the latest stable Core release at release-candidate time, and the immediately previous monthly Core release when technically feasible. This candidate matrix requires project-owner approval before it becomes a promise.
- CI and release evidence name exact patch versions; a pass on one patch does not prove all patches or monthly releases.
- Review Home Assistant developer release notes and deprecations for every monthly release before upgrading the tested matrix.
- Use supported public APIs where available. Compatibility shims and undocumented frontend elements require an explicit isolation layer, named owner, and regression test.
- If version gating is unavoidable, use Home Assistant's recommended version comparison mechanism rather than parsing version text.

### 7.2 Version-specific watch items already identified

- Verify the 2026.8 device-registry ownership changes in registry discovery and rename/removal tests (VF-07).
- Use the current condition/script lifecycle API and test unload behavior rather than relying on compatibility scheduled to end in 2027.1 (VF-08).
- Recheck conversation and LLM APIs at the exact baseline version; current documentation alone does not prove those APIs exist unchanged on the user's installation.
- Treat internal Home Assistant frontend components as unstable until verified against each claimed Frontend version.

### 7.3 Compatibility evidence

A version is supported only when all required checks pass:

- Clean install and upgrade from the previous project release.
- Config flow, provider setup, panel load, chat, dry-run, publish, run, reload, restart, diagnostics, and removal smoke tests.
- Registry rename/removal and conversation/action context tests.
- No new Home Assistant deprecation warnings attributable to the integration.
- Backend and frontend automated suites pass against that version.
- Redacted environment report and results are attached to the release evidence.

## 8. Dry-run and simulation requirements

Dry-run has two explicit modes:

1. **Offline simulation:** deterministic fake provider and frozen Home Assistant snapshot; no provider network call and no Home Assistant side effect.
2. **Live-provider dry-run:** real provider call using the displayed, privacy-filtered snapshot; no Home Assistant side effect. The UI must make clear that selected data will leave the system in this mode.

Both modes must:

- Freeze and identify the trigger, condition inputs, selected context, workflow version, prompt version, policy version, provider route, and model/capability record.
- Evaluate deterministic conditions and show pass/fail reasons.
- Show a redacted exact outbound request preview or an unambiguous field manifest when the provider protocol prevents an exact preview.
- Execute model tool requests only against a simulation layer. The simulation resolves and validates targets but cannot call a real Home Assistant action.
- Show requested tool, normalized arguments, risk classification, policy result, approval requirement, simulated result, branch, notification/action preview, and fallback path.
- Exercise a selected failure case: provider timeout, invalid output, unavailable entity, stale approval, or disallowed cloud route.
- Produce a reproducible redacted artifact that can be attached to tracker evidence.
- Detect changes between dry-run and publish. A changed workflow, prompt, provider route, policy, permission, or target invalidates the earlier dry-run.

Dry-run is not proof of live behavior. Any feature with real side effects also needs a controlled live acceptance test on harmless approved entities before release.

## 9. Release gates

No phase is released merely because implementation is present.

### Gate A: plan and threat-model approval

- Scope, verified facts, decisions, unknowns, and owner-approved risk policy are recorded.
- Threat model and data-flow/trust-boundary review complete.
- Exact baseline Home Assistant environment captured.
- No unresolved safety-critical unknown is hidden inside an assumption.

### Gate B: integration skeleton

- Clean setup/reload/unload/removal and storage migration tests pass.
- Frontend/backend authentication and authorization tests pass.
- Diagnostics and logging redaction canary tests pass.
- Claimed Home Assistant version evidence exists.

### Gate C: first local provider and read-only chat

- Provider contract suite passes for OpenAI-compatible adapter.
- Live LM Studio configuration and behavior are recorded for the actual version/model.
- Chat has read-only, explicitly selected context.
- Network exposure and credential behavior are reviewed against the actual LM Studio setup.
- No action-capable tool is present.

### Gate D: notification workflows

- Workflow schema/migration, trigger, condition, dry-run, deduplication, rate, and fallback tests pass.
- Window-open workflow is reproduced through the UI with an approved harmless live test.
- AI failure does not block the deterministic notification path where that path is required.
- Restart and duplicate-notification tests pass.

### Gate E: action-capable chat/voice

- Final read/low/medium/high/critical action matrix is approved.
- Tool allowlist, schema validation, state recheck, confirmation, idempotency, and audit tests pass.
- Adversarial prompt/tool corpus passes.
- Harmless live action test proves user context and exact target enforcement.
- No high-risk or critical autonomous path exists.

### Gate F: cloud providers and failover

- Azure and Bedrock adapters pass common contract and live approved-account tests.
- Least-privilege credential policies and provider privacy/retention facts are recorded from the user's resources.
- Outbound privacy filtering and destination preview tests pass.
- Failover never crosses privacy policy or replays a side effect.
- Usage/cost is displayed only when provided or deterministically calculated from verified pricing data; absent data is shown as unknown.

### Gate G: security/event workflows

- Independent deterministic alert path is demonstrated under every AI failure mode.
- AI cannot suppress/downgrade alerts or invoke prohibited security actions.
- Event storm, outage, restart, malformed output, uncertain classification, and notification fallback tests pass.
- Camera/audio-specific review passes before either data type is enabled.
- User performs and signs off on an end-to-end acceptance scenario.

### Stop-ship conditions

- Any credential or protected household data appears in an unauthorized artifact or destination.
- Any action executes outside its allowlist, without required approval, or more than once from one authorized request.
- A safety/security alert can be suppressed or materially delayed by the AI path.
- A cloud call occurs contrary to workflow privacy policy.
- A required test is skipped, flaky without disposition, or cannot be reproduced.
- The release is run on a Home Assistant version it claims to support but has not tested.
- A critical/high vulnerability affecting the delivered path lacks an approved mitigation.
- Required facts are replaced by inferred provider, device, account, or Home Assistant behavior.

## 10. Evidence required to mark tracker work done

### 10.1 Universal definition of done

Every completed implementation task must link all applicable evidence:

1. **Requirement:** tracker acceptance criteria and the decision/verified-fact IDs it implements.
2. **Change:** reviewed commit or pull request and changed-file list.
3. **Automated verification:** exact commands, tool versions, timestamp, pass/fail result, coverage, and retained report/log.
4. **Scenario verification:** redacted fixture or dry-run/live-run artifact showing inputs, expected result, actual result, and environment.
5. **Security/privacy verification:** threat/control mapping, negative tests, and canary-redaction result.
6. **Compatibility:** exact Home Assistant/provider/model versions tested, when relevant.
7. **UI evidence:** screenshots or recording for user-visible acceptance criteria, with sensitive data removed.
8. **Documentation:** user, operator, migration, rollback, and known-limit updates appropriate to the change.
9. **Review:** named role approval—implementation reviewer plus test/security reviewer for security-sensitive work; project-owner approval for product/risk decisions.
10. **Residuals:** linked defects, accepted limitations, and still-unknown facts. A task cannot be marked done if a residual contradicts its acceptance criteria.

For a documentation-only or research task, code/test items may be marked not applicable, but source URLs, access/retrieval date, scope, exact observed evidence, unresolved contradictions, and reviewer approval remain required.

### 10.2 Tracker status rules

- `not_started`: no accepted evidence of work.
- `in_progress`: work or verification is active.
- `blocked`: progress requires a specific missing fact, user decision, credential/resource, external fix, or prerequisite. Record owner and unblock condition.
- `review`: implementation is complete but required independent review/evidence is incomplete.
- `done`: every acceptance criterion and applicable evidence item is linked and passing.
- `reopened`: new evidence invalidates an earlier acceptance result, compatibility claim, or security assumption.

Percent complete is derived from accepted tracker items, not estimated from effort or lines of code. A test failure, undocumented manual step, or unverified live behavior cannot be converted into a pass by explanation.

### 10.3 Minimum evidence by task type

| Task type | Minimum additional evidence |
|---|---|
| Provider adapter | Common contract report, sanitized fixtures, live approved-resource result, capability record, error/failover matrix, and redaction proof |
| Workflow engine | Schema/migration tests, lifecycle/restart tests, deterministic condition trace, failure branches, idempotency/loop tests, and dry-run artifact |
| Entity/action discovery | Registry fixture tests, actual-instance redacted inventory sample, rename/remove/unavailable cases, and target authorization tests |
| UI | Component/browser/accessibility reports, version/browser matrix, privacy/secret browser inspection, screenshots, and user acceptance |
| Chat/voice | Conversation context test, history/tool isolation, permission matrix, timeout/cancellation, injection corpus, and harmless end-to-end test |
| Credential/security | Threat mapping, 100-percent branch coverage for the relevant control, canary scan, negative tests, manual review, and rotation/removal test |
| Security workflow | Deterministic alert evidence under all AI failures, prohibited action tests, burst/restart test, fallback output, and owner sign-off |
| Release | All phase gate artifacts, version matrix, dependency/SBOM review, clean install/upgrade/rollback, backup/restore result, known limitations, and signed checklist |

## 11. Required quality records

Keep these versioned, redacted records in the repository or linked private evidence store:

- Architecture decisions and product/risk approvals.
- Data inventory and data-flow map by workflow/provider.
- Threat model and control-to-test traceability matrix.
- Home Assistant and provider compatibility matrix.
- Provider fixture catalog and live validation reports.
- Test plan, automated reports, dry-run artifacts, and controlled live acceptance reports.
- Dependency/SBOM and vulnerability dispositions.
- Release checklist, migration/rollback plan, backup/restore result, known limitations, and incident notes.

Evidence paths and formats should be standardized by the repository tracker owner. Evidence containing real household data or account identifiers must not be committed; store only a redacted manifest and the approved private location.

## 12. Initial quality/security tracker actions

- [ ] Capture exact Home Assistant Green environment versions and installation method.
- [ ] Obtain owner decisions for sensitive data, cloud permission, retention, user roles, and action risk matrix.
- [ ] Create the data-flow diagram and control-to-test traceability matrix.
- [ ] Define central redaction API and canary corpus before provider logging or diagnostics are implemented.
- [ ] Define provider fixture schema and deterministic fake provider before live adapters.
- [ ] Define execution journal/idempotency state machine before action-capable workflows.
- [ ] Establish the approved Home Assistant compatibility matrix and CI environments.
- [ ] Build offline and live-provider dry-run acceptance specifications.
- [ ] Create adversarial prompt/tool corpus and prohibited-action matrix.
- [ ] Define evidence folder/link conventions and independent reviewer assignments in the project tracker.
