# Manual installation and current usage

The current interface release is **2026.11.07**. Follow
[Getting started](GETTING-STARTED.md) for connection, testing and rollback.
This frontend-only update preserves the installed backend and stored data.
The integration's 0.1.0 manifest does not identify its interface revision.
September r14/r15 installation descriptions have been superseded by the
November release evidence. HACS and a broad compatibility range are not claimed.

## Install

The ZIP contains `custom_components/ai_orchestrator/`. Extract that folder into
the Home Assistant configuration directory. The final path must be
`/config/custom_components/ai_orchestrator/manifest.json`, without an extra nested
directory. On the owner's File editor, the configuration root is displayed as
`/homeassistant`.

Manual extraction is sufficient: do not also upload the intact ZIP or run the
Python installer. The separate Python installer is an alternative for verified
copying and backups; its instructions expect the intact ZIP beside it inside
`custom_components/ai_orchestrator`.

1. Preserve the previous complete integration artifact and a Home Assistant
   backup. Follow the candidate's installation evidence.
2. Copy the complete reviewed integration folder, verify its files, then restart
   Home Assistant.
3. For a first installation, open **Settings → Devices & services → Add
   integration → AI Orchestrator** and create the foundation entry.
4. Open **AI Orchestrator** from the sidebar as an administrator. Existing
   installations keep their foundation and provider entries.

Do not put credentials, Home Assistant secrets or household data in the
integration folder or repository.

## Providers

Add **AI Orchestrator** again through Home Assistant's integration setup to create
a provider connection. Select **LM Studio** and enter its actual private LAN IP
base URL, token and configured model identifier. Enter the token without a
`Bearer` prefix. This adapter rejects public addresses, hostnames, URL credentials
and custom URL paths.

**Test connection** checks authentication and configured-model presence without
sending household prompts. It does not prove generation, tools, streaming or
structured output. The timestamped result resets after restart/reload.
Reauthentication/configuration use backend forms; saved secrets are not returned
to the panel.

Azure OpenAI v1 tests endpoint authentication only and is excluded from local
chat, Assist and workflows. Bedrock remains offline-tested and unregistered.
No cloud route or automatic failover is enabled.

## Chat and observation

In **Chat → Assistant mode**, choose:

- **Conversation — text only:** only your conversation goes to the local model;
  no household context or action tools are added.
- **Ask about permitted entities:** save explicit observation scope, run
  **Test tool support**, then ask an independent question about permitted states.
  These controls also appear in **Entities & Permissions**.
- **Device control — review and confirm:** use the separate action flow below.

Text chat bounds are 21 messages, 4,000 UTF-16 units per message, 16,000 total,
4,000 per reply and a 60-second generation deadline. There is no streaming.
**New chat**, leaving the view, changing providers or losing the user/connection
context clears the view's history. Clearing a pending reply does not guarantee
provider processing stopped.

Observation grants start empty. Eligible numeric/on-off states are allowed;
sensitive classes and attributes are excluded. Scoped answers show operation
counts and ordered trace markers. Chat and scoped-question history are not
persisted. DEC-018 retention defaults are future storage requirements, not
active transcript retention. Provider-side logging is a separate policy.

## Device actions — live acceptance pending

1. In **Entities & Permissions → Device action permissions**, choose a local
   provider and supported operation, select individual targets, then choose
   **Save action permissions**. Observation grants do not grant control.
2. In **Chat → Device control — review and confirm**, enter one precise
   **Device request** and choose **Ask AI to propose**, or select the granted
   device/operation directly and choose **Review action**.
3. Review the exact entity, operation, arguments, current state and risk.
   Choose **Confirm this action** to dispatch once, or **Cancel proposal**.

Supported operations are individual light on/off and media play/pause/volume.
Switch targets, grouped targets that expand the selection, critical actions and
arbitrary services are denied. AI receives your request and granted device
names/identifiers, and cannot confirm its own proposal. HA permissions and state
are rechecked at confirmation. Tokens expire after five minutes and are consumed
once; changed state, scope, provider or service registration requires a new proposal.

HA accepting a call does not prove its physical result. If the outcome is
unknown, check the device before requesting another action. There is no automatic
retry. Automated and independent review evidence does not establish live
device acceptance.

## Workflows and AI drafts

**Automations** contains a structured builder, JSON editor, deterministic preview
and stored workflows. Select real entities, a local provider and discovered
notification targets. Compose, classify, extract and branch steps are supported;
workflow side effects are limited to notifications.

**Create a workflow with AI** accepts a description, an optional selected
entity and up to eight notification targets. Only the description and selected
identifiers go to the local model. **Generate draft** returns a disabled, unsaved
workflow. **Review in workflow editor** transfers it for inspection. It does not
save, enable or execute itself, or create native HA automations. Selecting an
existing internal workflow explicitly discloses its drafting fields and selects
its references; refinement returns a new disabled copy, never overwrites the source.
Live r14 drafting currently fails validation. Use the visual builder or JSON editor
until a fresh live draft passes review. Candidate r15 adds corrected examples and
specific validation messages; no success from those changes is claimed yet.

1. Review the trigger, conditions, provider, prompt and targets; save disabled.
2. Use a supplied/synthetic snapshot to **Preview workflow**, then **Dry run AI
   steps**. Preview contacts no provider; dry run generates text but sends no
   notification.
3. A successful eligible dry run records a publication receipt bound to the
   exact workflow, provider configuration and notification target identity.
   Enable only after this succeeds.
4. Test the real trigger and confirm delivery on the recipient device.

**Observe now** never executes steps or sends notifications. Execute mode allows
one run per workflow at a time, no retries, and stops on the first failure.
This AI-dependent path is not a primary security or life-safety alert.

At most 50 workflows live in `.storage/ai_orchestrator.workflows`.
Restart/reload restores eligible enabled workflows. Changed provider/target
identity or an invalid receipt can prevent activation; inspect status and repeat
the dry run before enabling. Unreadable storage fails closed. See
[workflow details](OFFLINE-WORKFLOW-PREVIEW.md).

Live r12 recorded three successful dining-room window phone notification calls
and owner-confirmed Fold8Ultra receipt. The original Android/iPhone receipts
remain unconfirmed. Native door/window automations were restored after testing.
See [live evidence](evidence/2026-09-20-window-phone-workflow.md).

## Assist, Activity and Settings

Each loaded local provider supplies a text-only conversation agent. Select it
in **Settings → Voice assistants** for an Assist pipeline. It receives conversation
turns only, with no household tools or device control. Panel text generation does
not prove microphone, speaker or full voice-pipeline acceptance.

**Activity & Security** displays latest workflow outcomes and steps. Counters
and last-run records may reset after edits, disabling or restart; this is not
durable audit history. Notification success means HA accepted the call, not
handset receipt. The r15 candidate adds **Durable action history** for confirmed
device-action metadata only: up to 90 days and 4096 records, explicit refresh and
load-more controls, no household identifiers or message content. Workflow audit
hooks are not wired. A committed record means the service call returned; unknown
outcomes require checking the device before trying again. This candidate is not
yet live. Full Settings, persistent chat, cloud routes, broad entity control,
native automation authoring and deterministic security templates remain unfinished.

## Updates, troubleshooting and rollback

- Replace the complete integration directory from one candidate; never mix
  backend/frontend revisions. Restart Home Assistant and reload the page.
- Automatic registration uses
  `/api/ai_orchestrator/panel/<hash>/ai-orchestrator-panel.js`. Its changing path
  avoids the observed service-worker cache issue. The older fixed YAML fallback
  may require a frontend cache clear; do not remove provider entries for caching.
- Missing providers or unavailable permissions require checking the config entry,
  administrator session and stored policy. Failure never authorizes a fallback
  provider or expanded target selection.
- Inspect **Settings → System → Logs** for setup failures. Keep credentials,
  private endpoints and household text out of shared diagnostics.

Before each installation, back up code and integration storage together. Separate
action grants use a separate `.storage/ai_orchestrator.actions` store; existing
observation/workflow stores are not converted into control grants. Include the
actions store in backups once it exists. The r15 audit store is separate;
preserve it with the matching artifact and follow its candidate rollback record.

The forthcoming reviewed-switch candidate upgrades action-policy storage from
version 1 to version 2. It preserves light/media grants, removes dormant switch
grants, and starts with no physical-target switch reviews. Review a switch's
actual connected device in **Entities & Permissions**, complete the three
physical-target attestations, and save the review. Then separately save the
desired on/off permissions. Each switch action still requires confirmation.
Review refresh or revocation removes that switch's on/off grants. Changed device
identity makes its previous review unusable.

Before installing that candidate, retain verified snapshots of both
`.storage/ai_orchestrator.actions` and `.storage/ai_orchestrator.audit`, including
whether each file existed. Older action-policy readers cannot load version 2,
and older audit readers cannot accept new switch operation records. Rolling back
requires the matching reviewed storage checkpoint as well as code; never edit
version numbers or strip review fields to manufacture compatibility. Preserve
the newer audit file separately if a checkpoint restoration would remove newer
history. A code-only rollback may leave action controls unavailable.

For code rollback, restore the previous complete artifact and restart. r12 has no
action manager and does not consume those grants. Do not delete or rename live
storage files to troubleshoot. Preserve the matching storage checkpoint and
review retained action grants before a later upgrade reenables the action UI.
A code rollback does not reverse a device action already performed. Follow the
candidate rollback record and [tracker](PROJECT-TRACKER.md) for outstanding checks.
