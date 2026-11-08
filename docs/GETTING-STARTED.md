# Get started with local AI

## 1. Connect LM Studio

Prerequisites: administrator access to Home Assistant, a running LM Studio server
on the same network, a loaded chat model, its exact identifier and API token.

Open AI Orchestrator → Providers → Add provider connection. On the integration
page choose **Add hub → LM Studio**. Enter the server computer's private LAN IP
URL ending in `/v1`, the token without `Bearer`, and the exact model identifier.
This adapter requires a token and a private IP; it does not accept loopback or
hostnames. Keep tokens in the Home Assistant form, never in GitHub or chat.

Return to Providers and test the connection. Pass: authentication succeeds and
the configured model is found. This does not prove text inference or tools.
Undo: remove only the new provider entry, after pausing dependent workflows.

## 2. Prove a plain conversation

Prerequisite: a loaded provider connection. In Chat select the local provider and
Conversation, send `Reply with exactly READY.` Pass: a READY response from the
model. No household state or device action is needed. Undo: start a new chat.

## 3. Optionally ask about one entity

Prerequisite: working chat and a tool-capable model. In Entities & Permissions,
choose one harmless eligible entity, review and save its observation permission,
test tool support, then ask for its state. Pass: the response agrees with Home
Assistant. Read permission does not grant action permission. Undo: revoke the
observation scope. Device control is a separate reviewed confirmation flow.

## 4. Build a notification draft

Prerequisites: working model and a notification target discovered by Home
Assistant. In Automations fill the numbered builder sections. Choose Execute
mode for AI notifications, select the local provider, choose a real trigger and
one notification target. Keep Enable after saving unchecked. Save the draft.

Pass: it appears in Saved workflows and is Disabled. Observe mode instead
records trigger matches only; it never runs AI or notification steps.
Undo: leave disabled or remove the test draft after saving a copy if needed.

## 5. Test before enabling

Prerequisite: the exact saved disabled draft. Choose Load into editor from its
saved card; Test & advanced tools opens. For a simple state-to-value or time trigger without conditions, choose
**Create sample test event for this draft**; otherwise supply a representative
snapshot in the advanced editor. Sample data is not live household state. Run
the dry run. Review the model result and planned
notification. Pass: successful dry run with no dispatched notification. Editing
the workflow requires another dry run. No physical outcome is inferred.

Enable only when you intend the actual trigger to send to the reviewed target.
Exercise that trigger once, inspect Activity and confirm receipt on the device.
Undo: disable the test workflow. Check before retrying an uncertain result.

## Interface-only update and rollback

Back up the installed `custom_components/ai_orchestrator/frontend/ai-orchestrator-panel.js`
before replacing it with the built file of the same name. Do not replace the
backend with older GitHub files to install an interface update.

Reload the AI Orchestrator integration entry so the content-addressed panel URL is
registered again, then reload the browser. A full Core restart is unnecessary
for this frontend-only change. Confirm **Interface release · 2026.11.07** in the
sidebar, loaded provider status, and a fresh chat response.

Rollback: restore the backed-up panel file, reload the foundation entry, reload
the browser, and repeat the chat test. No storage migration occurs. Pausing or
restoring the interface does not restore a device's physical state.

Assist speech setup is separate: select the conversation agent in Home
Assistant Voice assistants and configure speech-to-text/text-to-speech there.
The Orchestrator Assist agent supplies text conversation, not device tools.
