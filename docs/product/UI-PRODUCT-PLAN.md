# HA AI Orchestrator — UI and Product Plan

Status: Draft for product review
Audience: Product, frontend, Home Assistant integration, provider/API, security, and QA contributors
Scope: Private, single-household Home Assistant AI orchestration product
Implementation status: Not started

## 1. Purpose

HA AI Orchestrator should let a Home Assistant user configure AI providers and build safe, useful AI-enhanced automations without routinely editing YAML. It should feel native to Home Assistant while making provider routing, data exposure, permissions, model decisions, and executed actions understandable.

This document defines the product experience and frontend architecture for review. It does not authorize implementation or settle the explicitly listed unknowns.

## 2. Product principles

1. **Home Assistant remains authoritative.** The product reads Home Assistant state and invokes Home Assistant actions; it does not create a competing device or automation registry.
2. **AI is bounded.** Models receive only selected context and can request only explicitly permitted tools/actions.
3. **No hidden cloud transfer.** Every workflow and chat profile clearly states whether data stays local or may go to a cloud provider.
4. **No fabricated configuration.** Provider models, Home Assistant entities, actions, devices, areas, and Assist capabilities are discovered from the live system or entered by the user. Missing facts are shown as unresolved.
5. **Progressive disclosure.** A guided default path serves ordinary household tasks; advanced routing, prompt, schema, timeout, and policy controls remain available without crowding setup.
6. **Safe testing comes before publishing.** Users can preview context, provider destination, model output, requested tools, and simulated actions without producing side effects.
7. **Failures are actionable.** The UI differentiates invalid configuration, provider unavailability, policy denial, malformed model output, unavailable Home Assistant targets, and execution errors.
8. **Private by default.** Provider credentials never return to the browser after being saved, and cloud failover is opt-in rather than inferred.

## 3. Users and operating assumptions

Primary user: the Home Assistant administrator who owns and operates the private installation.

Secondary user: a household member permitted to use selected chat or voice profiles but not to administer providers, workflows, credentials, or security policy.

Confirmed product assumptions from the approved architecture:

- The primary product is a Home Assistant custom integration plus a native sidebar panel.
- Home Assistant supplies authentication, entity/device/area registries, state, actions, and Assist pipelines.
- Initial provider families are OpenAI-compatible endpoints (including LM Studio), Microsoft Foundry/Azure OpenAI, and AWS Bedrock.
- Workflows use a versioned declarative representation; generated YAML is not the primary storage model.
- Cloud failover must be explicitly enabled per workflow or profile.
- High-risk Home Assistant actions are never silently executed by a model.

## 4. Information architecture

The product uses one sidebar entry, **AI Orchestrator**, with the following top-level destinations.

| Destination | Purpose | Primary objects |
|---|---|---|
| Home | Operational overview and next actions | Provider health, active workflows, recent runs, warnings |
| Automations | Create, test, publish, pause, and inspect AI workflows | Workflows, templates, versions, test runs |
| Chat | Converse with configured AI profiles and inspect tool use | Chat sessions, agent profiles, tool traces |
| Providers | Configure provider connections, models, capabilities, and routes | Provider connections, models, routing policies |
| Entities & Permissions | Control what each agent/workflow may read, disclose, or control | Entities, devices, areas, action permissions, sensitivity labels |
| Voice & Notifications | Connect profiles to supported Assist/voice and notification outputs | Assist pipelines, conversation profiles, TTS/STT selections, delivery targets |
| Activity & Security | Audit runs, approvals, denied actions, privacy destinations, and failures | Executions, approvals, security events, repair notices |
| Settings | Product-wide defaults, retention, redaction, exports, and diagnostics | Global policy, data retention, backups, diagnostics |

On compact screens, these destinations appear in a navigation drawer rather than a persistent secondary sidebar.

### 4.1 Global interface elements

- Global status indicator: `Healthy`, `Needs attention`, or `Offline`, with the reason available on activation.
- Search/command entry for workflows, providers, entities, and execution IDs. Global search is a post-MVP enhancement unless implementation cost is low.
- Contextual help that explains product terms without exposing credentials or prompt contents.
- Admin-only `Create` action for providers, workflows, and profiles.
- Persistent privacy badge where an operation can contact a provider: `Local only`, `Cloud allowed`, or `Unresolved`.
- Notification center for setup issues, provider degradation, permission conflicts, and migration/repair tasks.

### 4.2 Object relationships

```text
Provider connection -> one or more discovered/configured models
Models -> one or more named routing policies
Routing policy -> one or more workflows or chat profiles
Workflow/profile -> selected context + explicit action/tool permissions
Workflow execution -> provider attempt(s) + validated output + action result(s)
Chat session -> profile + messages + provider attempts + tool result(s)
```

The UI must prevent deletion of an object that is still referenced, or offer an explicit reassignment/disable flow with a complete impact list.

## 5. First-run and onboarding experience

### 5.1 First-run sequence

The first-run wizard should be resumable and contain five stages:

1. **Welcome and boundary**
   - Explain that Home Assistant remains in control.
   - Explain local versus cloud data handling.
   - Confirm that administration requires a Home Assistant administrator account.
2. **Connect a provider**
   - Choose provider family.
   - Enter connection details and credentials.
   - Test connection.
   - Discover or confirm models.
   - Run capability probes.
3. **Choose what AI may see**
   - Start with no entities exposed.
   - Select areas, devices, or entities for read access.
   - Review attributes that will be included.
4. **Create a safe first experience**
   - Choose `Try chat` or `Create an announcement workflow`.
   - Use discovered live entities and actions only.
   - Run in simulation mode.
5. **Review and finish**
   - Show provider destination, selected data, permissions, and any unresolved issue.
   - Link to Activity & Security and provider settings.

The user may exit after any stage. Home should display `Continue setup` until minimum readiness is met.

### 5.2 Minimum readiness

The product is ready for read-only chat when:

- At least one provider connection passes its connection test.
- At least one usable model is selected and its required capability is verified or explicitly marked as a user override.
- A chat profile has an assigned route.
- The profile has a defined entity/context permission set, even if that set is empty.

The product is ready for a published workflow when the workflow passes schema validation, target resolution, permission validation, provider capability validation, and a no-side-effect test.

### 5.3 Setup safety

- Secret fields are write-only after save. Edit views show that a secret is configured, never its value.
- `Test connection` explains what endpoint will be contacted and does not send Home Assistant entity data.
- Capability tests disclose any sample content before sending it.
- If a setup field cannot be discovered, the UI labels it `Required — not provided`; it does not invent a default identifier.
- Setup cannot report success based only on an HTTP response. It must show each verified capability separately.

## 6. Provider setup and management

### 6.1 Provider list

Each connection card shows:

- User-defined display name.
- Provider family.
- Local/cloud classification.
- Endpoint host or region, with secrets excluded.
- Selected/default model.
- Health and last successful check time.
- Verified capabilities: chat, streaming, structured output, tool calling, vision (future), and model discovery.
- Workflows/profiles that depend on it.
- Last error category with a link to details.

Health must use explicit states: `Checking`, `Healthy`, `Degraded`, `Unavailable`, `Authentication required`, and `Not tested`. Color cannot be the only signal.

### 6.2 Shared setup flow

All provider wizards use the same conceptual steps:

1. Connection details.
2. Authentication.
3. Connection test.
4. Model selection/discovery.
5. Capability tests.
6. Privacy classification and routing use.
7. Review and save.

Provider-specific fields appear only when relevant.

### 6.3 OpenAI-compatible / LM Studio

UI fields:

- Display name.
- Base URL.
- API token, if required.
- Optional custom headers, behind an advanced disclosure.
- Model, discovered when supported or entered explicitly.
- Request timeout.
- TLS verification policy, with a warning if weakened.
- Classification: local/private network or remote/cloud. User confirms this; URL shape alone is not conclusive.

Tests:

- Reachability and authentication.
- Model availability.
- Basic completion.
- Structured response adherence.
- Tool-calling request and response shape.
- Streaming, when selected.

Unknown: whether the initial release will support loading/unloading LM Studio models or only using models already served. This must be decided after validating LM Studio's supported API and the desired operational boundary.

### 6.4 Microsoft Foundry / Azure OpenAI

UI fields are conditional on the selected authentication method and endpoint type. Expected categories include:

- Display name.
- Endpoint.
- Deployment/model identifier.
- Authentication method.
- API key for the first private release, if that direction is approved.
- Advanced request/version fields only when required by the validated API path.

Unknowns requiring live documentation and account validation:

- Exact endpoint and identifier fields for the user's provisioned Foundry/Azure resource.
- Which authentication methods the Home Assistant runtime can support in the first release.
- Whether model enumeration is available for the user's resource and permissions.

The wizard must not imply these are configured until a real account test succeeds.

### 6.5 AWS Bedrock

Expected UI categories:

- Display name.
- Region.
- Model or inference-profile identifier.
- Authentication method.
- Access key and secret for the first private release, if approved.
- Optional session token or role assumption only after the backend design is validated.
- Optional guardrail configuration when supported by the selected account/model.

Unknowns requiring the user's AWS environment and live documentation:

- Available regions and model/inference-profile access.
- Exact IAM policy and whether temporary credentials or role assumption are required.
- Guardrail availability and identifiers.

The setup test should distinguish invalid credentials, access denied, model access unavailable, region mismatch, throttling, and general connectivity.

### 6.6 Routing policy editor

A named routing policy contains an ordered list of provider/model candidates. The editor supports:

- Required capabilities.
- Local-only or cloud-allowed boundary.
- Per-attempt timeout.
- Retry and circuit-breaker behavior.
- Allowed fallback order.
- Final fallback response/behavior.
- Optional usage or budget limits when the provider exposes sufficient information.

Before saving, the UI displays a readable route such as:

```text
Try [configured local model]
If unavailable before any action -> try [configured cloud model]
If both fail -> use [configured fixed message or stop]
```

Names inside brackets are populated from the live configuration, not hard-coded.

## 7. Automation Studio

### 7.1 Design approach

The MVP uses a structured, card-based sequence rather than a free-form node canvas. This keeps execution order and safety policy evident and reduces accessibility and validation problems. A future canvas may visualize branching but must use the same versioned workflow schema.

Desktop layout:

- Left: block library and templates.
- Center: ordered workflow stages.
- Right: selected block properties and validation.
- Bottom or side drawer: Test and execution trace.

Compact layout:

- One stage at a time.
- Block library and properties open as full-height drawers.
- Persistent `Validate` and `Test` actions; publishing remains a separate confirmed action.

### 7.2 Workflow stages

1. **When** — one or more supported Home Assistant triggers.
2. **Only if** — deterministic conditions evaluated before AI use.
3. **Context** — entities, attributes, event fields, and optional fixed instructions that may be sent to the model.
4. **Ask AI** — compose, classify, extract, choose a predefined branch, or converse.
5. **Validate** — required schema, allowed categories, confidence handling where applicable, and missing/invalid output behavior.
6. **Then** — fixed Home Assistant actions or a constrained branch selected by the model.
7. **On failure** — retry/failover, fixed safe response, notification, or stop.
8. **Policy** — privacy route, permissions, confirmations, rate limit, deduplication, and trace retention.

### 7.3 Source selection and discovery

Pickers are populated from the live Home Assistant registries and action metadata. Search supports currently available metadata such as entity ID, friendly name, area, device, domain, label, and integration when provided by Home Assistant.

Each selected target shows:

- Current name and entity ID.
- Area/device relationship when known.
- Availability and current state during testing.
- Selected attributes.
- Read/cloud/action permission status.
- A warning if the reference is unresolved or renamed.

Unknown: the exact stable identifiers available to the custom integration for every target and action selector must be confirmed during the architecture spike. The UI must not promise rename resilience until backend resolution behavior is proven.

### 7.4 AI step editor

Basic mode shows:

- Task type.
- Plain-language instruction.
- Selected context.
- Routing policy.
- Expected result categories/fields.
- Example preview generated from the current workflow definition, not fabricated entity values.

Advanced mode shows:

- System and task prompt sections.
- JSON Schema editor through form controls; raw JSON is an optional expert view.
- Temperature/token/time limits when supported.
- Bounded tool-call limit.
- Provider capability requirements.

The UI visually separates trusted instructions from untrusted runtime data. Event text and entity values appear in a labeled `Runtime data` section and cannot be placed into the immutable policy section.

### 7.5 Action builder

The action picker is derived from Home Assistant's available actions and selector metadata. The user chooses an action, then an entity/device/area target, then required fields.

Before the action is accepted, the UI shows:

- Target resolution.
- Required and optional inputs.
- Permission status.
- Product risk level.
- Confirmation requirement.
- Whether the model selects arguments or the user fixes them.

There is no generic unrestricted `call_service` model tool in the UI.

### 7.6 Validation and publishing

Validation results are grouped by:

- Missing configuration.
- Unresolved Home Assistant references.
- Provider/model capability mismatch.
- Privacy/policy conflict.
- Action permission conflict.
- Invalid schema or branch.
- Warning that does not block publishing.

`Publish` is disabled when blocking errors exist. Publishing creates a new immutable version while preserving readable history. Pausing a workflow does not delete it.

### 7.7 Test bench

Each workflow supports:

- **Validate only:** no provider call and no action.
- **AI dry run:** calls the selected provider with a visible/redacted context preview but simulates actions.
- **Action simulation:** validates targets and payloads without invoking side effects.
- **Live test:** optional, separately confirmed, and limited to actions that policy permits for live testing.

The trace shows:

1. Trigger/test input.
2. Condition outcomes.
3. Context fields included and redacted.
4. Local/cloud destination.
5. Provider attempt and timing.
6. Structured/model output.
7. Requested tools/actions.
8. Policy decisions.
9. Simulated or actual action results.

If sample trigger data is unavailable, the UI asks the user to capture/select a real event or explicitly enter test data; it does not synthesize facts and present them as real.

### 7.8 Templates

Templates define workflow structure, required capability types, and empty target slots. They must never ship with assumed user entity IDs or device names.

Initial template candidates:

- Announce an entity left in an undesired state.
- Summarize a motion/door event.
- Create a contextual household reminder.
- Classify notification urgency from constrained categories.
- Add an AI summary to a deterministic safety notification.

Illustrative example only: a template could be configured to announce that a selected window sensor remains open through a selected media player. `Window sensor` and `media player` are placeholders, not claims about the user's available entities.

## 8. Entities, context, and action permission UX

### 8.1 Explorer

The explorer offers table and grouped views. Filters include area, device, domain, integration, label, availability, sensitivity, read permission, cloud permission, and control permission when those values are available.

Bulk assignment is allowed only with a review screen that lists every affected target. A new target discovered later is not automatically included by an area/domain bulk rule unless the user explicitly chose a dynamic rule and the UI clearly explains that future scope.

### 8.2 Permission dimensions

Permissions are evaluated per profile/workflow and include:

- Read state.
- Read selected attributes.
- Include in local-provider context.
- Include in cloud-provider context.
- Permit specific actions.
- Permit model-selected arguments within constraints.
- Require confirmation.
- Mark sensitive/redact from logs.

The permissions screen should answer three questions without opening an editor:

1. What can this workflow/profile see?
2. What can leave the home network?
3. What can it cause Home Assistant to do?

### 8.3 Effective permission view

Because permissions may come from multiple layers, every entity/action has an `Effective permission` drawer showing:

- Global default.
- Profile/workflow override.
- Provider-route privacy restriction.
- Action risk policy.
- Final effective result and reason.

Conflicts resolve to the more restrictive rule. The UI must show the rule responsible for a denial.

### 8.4 Sensitive data

The frontend must provide sensitivity controls for entity values and attributes. Default sensitivity rules are an unresolved product decision and must be validated against the user's system before shipping. Until then, the safe default is no cloud exposure unless explicitly granted.

## 9. Chat experience

### 9.1 Chat profile

A chat profile defines:

- Display name and purpose.
- Routing policy.
- Allowed context/entities.
- Allowed tools/actions.
- Confirmation policy.
- Conversation retention.
- Voice/Assist assignment, when supported.

### 9.2 Chat interface

The chat screen includes:

- Profile selector.
- Local/cloud destination badge.
- Streaming response when supported.
- Stop-generation control.
- Conversation reset/new chat.
- Expandable citations to Home Assistant entity state used in the answer, where traceable.
- Tool/action request card with target, arguments, risk, and confirmation state.
- `Why this happened` trace linking to Activity & Security.
- Clear indication when the response used stale, unavailable, or no Home Assistant context.

The interface must distinguish:

- Model text.
- Home Assistant state/tool results.
- Simulated action.
- Executed action.
- Product warning/error.

### 9.3 Confirmations

A confirmation card includes the exact action, target, proposed values, reason, requesting profile, expiry, and privacy route. Approval is single-use and bound to the action arguments and current execution. Editing the arguments invalidates the approval.

Unknown: which Home Assistant user-context and Companion App approval mechanisms are available and reliable in the target installation. MVP confirmation may initially be in-panel only if cross-device delivery cannot be validated.

## 10. Voice and notification experience

### 10.1 Voice configuration

The UI should expose only capabilities discovered from Home Assistant:

- Available Assist pipelines.
- Conversation-agent/profile assignments.
- Available speech-to-text and text-to-speech options.
- Supported output targets.

It should not imply that an Echo device can act as a Home Assistant voice-input satellite unless that capability is separately installed and verified. The already demonstrated Echo announcement output does not establish Echo voice input.

Unknowns:

- Which Assist pipelines, STT/TTS engines, and satellites exist in the user's Home Assistant installation.
- Whether per-user voice identity is available for authorization.
- Exact conversation-agent registration behavior supported by the target Home Assistant release.

### 10.2 Notification configuration

Notification destinations are discovered from Home Assistant actions/services. The UI supports:

- Selected destination(s).
- Message composition mode: fixed, AI-composed, or AI summary plus fixed critical text.
- Quiet hours.
- Deduplication window.
- Rate limit.
- Escalation path.
- Deterministic fallback message.
- Test delivery, separately confirmed.

For safety events, deterministic alert content and actions run independently of AI enrichment. The UI labels AI content as optional enrichment.

## 11. Activity, audit, and security experience

### 11.1 Activity timeline

Each execution row shows:

- Timestamp.
- Workflow/profile.
- Trigger source.
- Outcome.
- Provider/model route used.
- Local/cloud destination.
- Duration.
- Number of provider attempts and actions.
- Confirmation/denial state.

The detail view is a chronological trace with prompt/context redaction controls governed by the user's permissions and retention settings.

### 11.2 Security dashboard

The dashboard summarizes:

- Pending confirmations.
- Denied or invalid tool requests.
- Attempts to reference non-allowlisted entities/actions.
- Cloud privacy blocks.
- Credential/authentication failures.
- Provider endpoint/TLS warnings.
- Disabled or unhealthy critical workflows.
- Recent policy changes.

Severity labels use plain language and a concrete recommended next step.

### 11.3 Repair flows

Repair items link directly to the relevant screen and preserve unsaved work where possible. Examples of categories, not claims of current problems:

- Provider authentication expired or rejected.
- Configured model no longer available.
- Entity/action target removed or unresolved.
- Published workflow incompatible with a schema migration.
- Route has no healthy candidate.
- Sensitive data rule conflicts with cloud failover.

### 11.4 Retention and deletion

Settings include retention periods for chat, execution traces, and payload details. The UI explains what is retained in Home Assistant and what may be retained by external providers. Deletion scope and recoverability must be stated before confirmation.

Unknown: storage limits and default retention periods require backend performance testing and user approval.

## 12. Responsive behavior

The panel supports desktop, tablet, and phone widths within Home Assistant.

### Desktop

- Persistent section navigation where space allows.
- Two- or three-pane workflow editor.
- Dense activity table with expandable detail.
- Side-by-side permission comparison.

### Tablet

- Collapsible navigation.
- Workflow properties in a drawer.
- Activity rows become stacked summaries.
- Touch targets remain at least 44 by 44 CSS pixels.

### Phone

- Single-column pages.
- Sticky primary action bar that does not obscure content.
- Full-screen picker and configuration drawers.
- Workflow stages appear as an ordered step list.
- Tables become labeled cards; no essential horizontal scrolling.
- Long provider/model/entity identifiers wrap or offer copy without truncating the only identifying information.

All critical configuration, approval, pause, and audit tasks must be usable on a phone. Advanced raw-schema/prompt editing may recommend a larger screen but cannot make the configuration unreadable.

## 13. Loading, empty, error, and degraded states

### 13.1 Loading

- Use skeletons for known page structure and progress indicators for actions with indeterminate duration.
- Provider tests show the current step and support cancellation when safe.
- Do not display stale success beneath an active health check without labeling it with its timestamp.
- Preserve form input during transient connection failures.

### 13.2 Empty states

| Screen | Empty-state action |
|---|---|
| Home / first run | Continue guided setup |
| Providers | Add provider connection |
| Automations | Create from blank workflow or reviewed template |
| Chat | Create/finish a chat profile, then start a chat |
| Entity permissions | Select a profile/workflow, then grant explicit access |
| Activity | Explain that runs will appear after a test or live execution |
| Voice | Show discovered Assist capabilities or a factual setup blocker |

Empty states do not claim that entities, providers, pipelines, or devices exist.

### 13.3 Errors

Every error includes:

- What failed.
- Where it failed.
- Whether anything executed.
- Whether data may have left the local network.
- Whether retry is safe.
- A next action.
- An execution/test ID suitable for diagnostics.

Secret values, raw authorization headers, and sensitive entity attributes never appear in error text.

### 13.4 Degraded operation

- If the panel loses WebSocket connectivity, editing becomes read-only or clearly unsynced; it never silently saves locally.
- If a provider is down, affected routes/workflows show impact and fallback availability.
- If Home Assistant targets become unavailable, the workflow remains published but is visibly degraded according to backend behavior; the UI does not claim actions succeeded.
- If activity detail has expired by retention policy, the UI shows `Expired by retention policy`, not `Not found`.

## 14. Accessibility

Target: WCAG 2.2 AA for the custom panel, within the practical constraints of the host Home Assistant frontend.

Required behaviors:

- All functionality is keyboard accessible, including workflow stage reordering.
- Drag-and-drop always has move-up/move-down and destination alternatives.
- Focus is visible and restored correctly after dialogs/drawers close.
- Dialogs trap focus, have descriptive titles, and require explicit confirmation for destructive or live actions.
- Status and risk are conveyed by text/icon, not color alone.
- Form controls have programmatic labels, descriptions, validation association, and error summaries.
- Dynamic test progress and results use appropriate live regions without excessive announcements.
- Tables/cards have meaningful reading order.
- Provider/model/entity identifiers remain selectable and copyable.
- The UI respects reduced-motion and system contrast preferences.
- Charts, if introduced, have equivalent text/table summaries.
- Touch targets are at least 44 by 44 CSS pixels.
- Plain language is preferred; technical details are available through disclosure controls.

Accessibility testing includes keyboard-only operation, screen-reader smoke tests, zoom to 200%, reflow at 320 CSS pixels, and automated checks. Automated checks are necessary but not sufficient.

## 15. Frontend architecture guidance

### 15.1 Technology

Use TypeScript and Lit-based web components in the custom Home Assistant panel, built separately and served by the integration. Use Home Assistant visual conventions and tokens, while isolating dependencies on internal, unstable frontend components behind adapters.

### 15.2 Client state boundaries

- Server state: providers, routes, workflows, profiles, permissions, executions, and discovered Home Assistant metadata.
- Draft state: unsaved workflow/provider/profile edits held in an explicit draft store.
- Ephemeral UI state: selected tab, open drawers, filters, and expanded trace rows.
- Secrets: transient form values only; cleared after submission and never cached in browser persistence.

WebSocket/API messages should have explicit versioned types shared or generated from schemas where practical.

### 15.3 Concurrency and unsaved changes

- Objects carry revision/version identifiers.
- Saving against a stale revision opens a comparison/conflict flow; last-write-wins is not acceptable for workflows or policy.
- Route/provider changes show impacted workflows before commit.
- Navigation warns about unsaved changes.
- Draft recovery, if added, excludes all secret fields and must clearly state its storage location.

### 15.4 Privacy in the frontend

- No credentials in URLs, telemetry, local storage, diagnostics, or rendered DOM after save.
- Prompt/context previews are redacted by default according to backend policy.
- Copy/export actions disclose whether sensitive content is included.
- UI analytics are off by default; any future telemetry is opt-in and must exclude household content.

## 16. UI acceptance criteria

The following are release-level criteria unless assigned to a later phase.

### 16.1 Navigation and roles

- [ ] An administrator can reach every management area from the AI Orchestrator panel without YAML.
- [ ] A non-admin cannot view or edit provider credentials, routing policy, workflow policy, or global permissions.
- [ ] A permitted non-admin can use only the chat/voice profiles explicitly made available to them.
- [ ] Direct navigation to a restricted route produces an access-denied state without leaking object details.

### 16.2 Provider setup

- [ ] An administrator can configure and verify an OpenAI-compatible connection through the UI.
- [ ] A saved secret is never returned to or displayed by the frontend.
- [ ] The connection test distinguishes reachability, authentication, model availability, and capability results.
- [ ] Provider state never reports `Healthy` before the required checks complete.
- [ ] Local/cloud classification is visible before any capability test that sends sample content.
- [ ] Azure and Bedrock forms are enabled only after their exact fields and authentication behavior are validated against live documentation and test accounts.

### 16.3 Automation Studio

- [ ] A user can recreate the verified AI announcement pattern with live discovered targets and no YAML.
- [ ] The builder supports deterministic trigger, condition, context selection, AI task, fixed/constrained action, and failure behavior.
- [ ] Publishing is blocked for unresolved targets, invalid schema, missing route, capability mismatch, or permission conflict.
- [ ] Testing clearly distinguishes validation, AI dry run, action simulation, and live execution.
- [ ] No-side-effect tests cannot invoke Home Assistant actions.
- [ ] A published edit creates a version with an auditable change record.
- [ ] The UI never supplies fabricated entity IDs, event values, provider models, or action results.

### 16.4 Permissions and security

- [ ] For any workflow/profile, the user can identify readable context, cloud-shareable context, and executable actions from one summary.
- [ ] Effective permissions explain the exact rule responsible for allowing or denying access.
- [ ] A model cannot select an action or target outside the explicit allowlist.
- [ ] High-risk actions require the configured confirmation policy; critical actions are unavailable to the model.
- [ ] Approval is single-use, expires, and is invalidated by argument changes.
- [ ] A cloud route cannot receive context when the workflow/profile does not explicitly permit cloud processing.

### 16.5 Chat, voice, and notifications

- [ ] Chat always displays the active profile and local/cloud destination.
- [ ] Model text, Home Assistant facts, requested actions, and executed results are visually distinct.
- [ ] Tool/action traces include validation and policy outcomes.
- [ ] Voice settings list only capabilities discovered from the live Home Assistant installation.
- [ ] Echo announcement output is not presented as proof of Echo voice input.
- [ ] Safety notifications do not depend on AI enrichment completing successfully.

### 16.6 Activity and resilience

- [ ] Every provider attempt and Home Assistant action receives a traceable execution ID.
- [ ] An execution detail states whether any side effect occurred before an error.
- [ ] Failover never replays an already executed side effect.
- [ ] Logs and diagnostics redact credentials and sensitive context according to policy.
- [ ] Provider, route, entity, and action failures surface an actionable affected-object list.
- [ ] The UI is honest about stale health results and expired trace data.

### 16.7 Responsive and accessible behavior

- [ ] Core setup, testing, publishing, approval, pause, and audit flows work at phone, tablet, and desktop widths.
- [ ] All workflows are usable with keyboard only.
- [ ] Reordering has a non-drag alternative.
- [ ] Status/risk never relies on color alone.
- [ ] Automated accessibility checks pass with no serious/critical issues, and manual keyboard/screen-reader checks are documented.
- [ ] At 200% zoom and 320 CSS-pixel reflow, no essential action or information is lost.

## 17. Phase-aligned UI deliverables

| Phase | UI deliverables |
|---|---|
| 0 — Architecture spike | Panel shell, navigation prototype, typed WebSocket proof, object schemas, target-resolution proof, accessibility baseline |
| 1 — Local provider | First-run flow, OpenAI-compatible wizard, provider health, basic read-only chat, entity read selector, diagnostics |
| 2 — Notification workflows | Card-based builder, templates, Echo/mobile destination discovery, dry-run test bench, execution timeline |
| 3 — Safe actions and Assist | Action permissions, tool trace, confirmations, chat profiles, Assist/voice configuration |
| 4 — Azure and Bedrock | Validated provider wizards, route editor, failover visualization, privacy preview, usage display when verified |
| 5 — Hardening | Security dashboard, repair flows, migration UI, full responsive/accessibility verification, backup/export flows |

Each phase requires design review, implementation acceptance criteria, and test evidence before the next phase makes higher-risk capabilities available.

## 18. Open product and technical decisions

These items must remain tracked as unknown until answered with user input, live system discovery, implementation evidence, or current authoritative documentation.

| ID | Decision/unknown | Needed evidence or owner |
|---|---|---|
| UI-001 | Final product name and sidebar label | User decision |
| UI-002 | Target Home Assistant version and frontend compatibility range | Live installation/version plus HA documentation |
| UI-003 | Exact entities, devices, areas, actions, notification targets, and Assist pipelines available | Live Home Assistant discovery; do not assume |
| UI-004 | First-release Azure account/resource type, endpoint, models, and authentication | User account details plus live Microsoft documentation/test |
| UI-005 | First-release AWS account, region, model access, and IAM/authentication method | User account details plus live AWS documentation/test |
| UI-006 | LM Studio model lifecycle scope (consume only versus manage load/unload) | User preference plus supported API validation |
| UI-007 | Default sensitive entity/attribute policy | Security review and user approval |
| UI-008 | High-risk and critical action classification details | Security review against discovered HA action catalog |
| UI-009 | Confirmation delivery beyond the panel | HA/Companion App capability proof and user preference |
| UI-010 | Execution/chat retention defaults and storage limits | Backend performance test and user approval |
| UI-011 | Whether workflow templates can create native HA automation artifacts or remain internal only | Architecture/product decision |
| UI-012 | Required localization languages | User decision |
| UI-013 | Browser/device accessibility test matrix | User environment and QA decision |
| UI-014 | Whether a free-form flow canvas is needed after the structured builder | Usage evidence after MVP |
| UI-015 | Whether per-user chat history and voice authorization are feasible | HA user-context/Assist integration proof |

## 19. Review gate before implementation

Implementation should begin only after the following are reviewed together:

- Information architecture and first-run flow.
- Structured Automation Studio direction.
- Permission dimensions and safe defaults.
- Provider routing and local/cloud disclosure language.
- Phase 1 and Phase 2 acceptance criteria.
- Resolution plan for UI-002 through UI-006, because these determine the first working integration surfaces.

Approval of this document should authorize design/prototyping and architecture-spike work only. It should not be interpreted as authorization to connect cloud accounts, save credentials, execute Home Assistant actions, or deploy the integration to the user's Home Assistant instance.
