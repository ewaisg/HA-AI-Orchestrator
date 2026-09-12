# Manual installation and current usage

Status: Phase 1 local-provider preview; LOC-006 chat has recorded live acceptance. The Phase 1 release gate remains open.

The current repository supports a manual-copy Home Assistant installation.
HACS installation and updating are not yet validated or claimed.

Use the exact candidate and artifact identified in the [tracker](PROJECT-TRACKER.md)
and [LOC-006 evidence](evidence/2026-09-05-loc-006-local-chat.md). An arbitrary
checkout is not evidence of a tested installation. Historical live acceptance
targets Core 2026.8.3; the owner's current Core 2026.9.0/Frontend 20260826.4
environment is undergoing `COMP-001` validation. No broader compatibility
range is claimed.

## Install

1. Obtain the reviewed manual-copy artifact for the named candidate from
   `https://github.com/ewaisg/HA-AI-Orchestrator` or the linked candidate evidence.
   Keep an existing backup and the previous integration artifact for rollback.
2. Copy the complete artifact folder
   `custom_components/ai_orchestrator` into the Home Assistant configuration
   directory as `/config/custom_components/ai_orchestrator`.
3. Confirm that the final manifest path is exactly
   `/config/custom_components/ai_orchestrator/manifest.json`. Do not copy the
   repository root or create an extra nested `custom_components` directory.
4. Restart Home Assistant.
5. Open **Settings -> Devices & services -> Add integration**, search for
   **AI Orchestrator**, and submit the field-free foundation setup form.
6. Open **AI Orchestrator** from the sidebar while signed in as a Home
   Assistant administrator.

Home Assistant OS users can transfer the directory through an approved file
access method such as Samba Share or Studio Code Server. Provider credentials,
Home Assistant secrets, and household data do not belong in the repository or
the integration directory.

## Provider setup and testing

After creating the foundation entry, add **AI Orchestrator** again from
Home Assistant's integration setup to create a provider connection. Select
**LM Studio** and enter the actual server base URL, API token, and configured
model identifier. The adapter requires a private LAN IP address; public
addresses, hostnames, credentials in URLs, and custom URL paths are rejected.
Use the token value without a `Bearer` prefix. Setup validates authentication
and the configured model against the server's model list.

The **Providers** panel lists loaded connections. **Test connection** checks
reachability, authentication, and the configured model without sending a prompt
or household context. It does not prove text-generation, streaming, tool, or
structured-output capabilities. A connection shows **Not tested** until an
explicit test completes in the current runtime; reload/restart resets that
observation. Stored credentials are handled through Home Assistant's backend
config/re-auth/reconfigure flows and are not returned to this panel.

## Read-only chat candidate

After installing matching LOC-006 backend and panel files:

1. Open **Chat**, select a loaded local provider, and read its destination and
   access disclosure. The model's generation capability is explicitly unverified.
2. Enter a harmless text request, such as drafting a reminder, and press **Send**
   or **Ctrl/Command + Enter**. The backend contacts that local provider only.
3. Continue with a follow-up message or select **New chat** to clear the view.

Chat sends a fixed assistant instruction and the conversation supplied in the
view. It reads no household state, attaches no catalogue data, exposes no tools,
and executes no device action. It does not use cloud failover or automatic
retries. A complete reply appears after generation; streaming is unavailable.

Requests contain at most 21 messages, 4,000 characters per message, and 16,000
conversation characters. Replies are limited to 4,000 characters and provider
work has a 60-second deadline. Counts use browser text units, so some emoji
count as two. Earlier complete turns are omitted when needed
to stay within the conversation limit, with a notice in the view. One request
per administrator and four requests across the integration may run at once.

History stays in the open chat view and is cleared by **New chat**, a provider
change, leaving the view, or losing/changing the Home Assistant user/connection
context. No transcript is saved to browser storage or integration storage.
The future persistent-history defaults in DEC-018 are not implemented here.
This does not establish the LM Studio server's own logging or retention policy.

Clearing while waiting discards the eventual reply; the provider request may
continue until completion or its deadline. Wait before sending again if the
backend reports that the previous request is still running. A failed generation
keeps the draft for an explicit retry. Unloading its provider cancels the
integration's owned generation task.

These instructions describe the implemented candidate. Its live chat acceptance
is recorded separately in the linked LOC-006 evidence; implementation and
automated checks alone do not establish a successful live model reply.

## Catalogue and foundation status

**Entities & Permissions** is currently a read-only registry catalogue: entity,
device, and area metadata, relationships, availability, and search. It omits
state values and attributes. Every entity displays **AI access: none**; this
screen cannot grant access or run actions.

The Home page reports authenticated foundation status. **Provider connections**
is available only when a provider entry is loaded. **Workflow runtime**,
**Conversation agent**, and **AI Task entity** remain unavailable. The
Conversation agent flag refers to the future native Assist integration, not
the LOC-006 panel chat.

**Workflow preview** in Automations lets administrators load an explicitly
synthetic example or enter workflow/snapshot JSON and inspect trigger/condition
pass/fail results. The preview uses only the supplied snapshot, makes no
provider calls and executes no actions.

**Save as workflow** stores the editor's workflow document in Home Assistant's
integration storage (`.storage/ai_orchestrator.workflows`, written through the
Store helper with atomic writes; at most 50 workflows). The **Stored workflows**
list below the editor shows each document with Enable/Disable, Observe now,
Load into editor, and a two-step Delete. An enabled workflow is activated while
the foundation entry is loaded: it listens to the entities named by its state
triggers and to its time triggers, reads only the entities named by its
conditions, and records a redacted outcome (triggered, conditions passed,
planned step kinds) plus counters. Nothing else happens: no text is generated,
no notification is sent, and no Home Assistant action is called. Restarting
Core or reloading the foundation entry re-reads the stored documents and
re-activates the enabled ones. See [the preview guide](OFFLINE-WORKFLOW-PREVIEW.md).

If the list reports that the stored workflow file cannot be validated, it holds
data the installed version does not accept. Nothing is rewritten and no workflow
is active; restore the file from a backup or remove it after copying it aside.
A file that is not valid JSON at all is handled by Home Assistant itself: it is
renamed aside with a `.corrupt` suffix, a repair issue is raised, and the list
shows no stored workflows. Every save is read back from storage before it is
reported as saved. The Home page's Workflow runtime flag stays unavailable until
step execution exists.

The Automations section also exposes the Phase 0 **lifecycle probe**. That bounded
test fires one integration-owned internal event and increments an in-memory
counter. A valid result reports exactly one execution for the trigger, no
provider contact, and no Home Assistant action call. It is not a published
automation or the product workflow runtime.

Voice/notification configuration, activity/security, and full settings remain
planned. No panel feature currently executes a device action.

## Troubleshooting

- If Home Assistant cannot find the integration, verify the exact manifest path
  and restart Home Assistant again.
- Only one foundation config entry is permitted. Later setup attempts create
  provider entries; do not remove the foundation merely to add a provider.
- The panel, provider/catalogue commands, and chat require an administrator.
- If no provider appears, check that its config entry loaded successfully,
  correct its connection/model/authentication issue, and refresh providers.
- If chat reports a timeout or invalid response, shorten the request and retry
  explicitly. A configured token in message content or reflected in the reply
  is rejected; do not paste credentials into chat.
- If the panel reports an unsupported status response, replace the whole
  `ai_orchestrator` directory from one repository revision; do not mix backend
  and frontend files from different revisions.
- Check **Settings -> System -> Logs** for `ai_orchestrator` setup errors.
  Keep tokens, private endpoints, and household text out of shared evidence.
- If the lifecycle probe does not report exactly one execution for its trigger,
  treat the result as a failed compatibility check and do not infer that
  workflows are available.

Automatic panel registration remains an isolated compatibility boundary. Both
automatic registration and the exact YAML fallback documented in
`custom_components/ai_orchestrator/panel.py` were live-verified on Home
Assistant OS with Core 2026.8.3 and Frontend 20260729.7. Use the fallback only
if automatic registration fails; this evidence does not claim another version.

## Update and removal boundary

For an update, preserve the previous artifact, replace the complete integration
directory from one reviewed candidate, restart Home Assistant, and refresh the
panel so backend and frontend match. Automatic panel registration now appends a
content hash to the module URL so changed bundle bytes request a distinct cached
resource. Reload the browser page after restarting Core; an already loaded
JavaScript module cannot be replaced in place. Live verification of an update
without manual cache clearing remains tracked under LOC-009.

The manual YAML fallback uses a fixed URL and does not automatically receive
this hash. If that fallback, or an older installation, shows stale sections,
clear the Home Assistant site cache in the browser or reset the Companion App
frontend cache, then reopen the panel. This may require signing in again; do not
remove the integration or its provider entries to clear frontend caching.

Follow the candidate's installation and
verification record rather than mixing individual files. To roll back the code,
restore the previous complete artifact and restart; any future storage migration
needs its own documented downgrade/restore procedure.

Historical config-entry removal/reinstallation, reload, restart recovery,
cache-bypassing refresh, YAML fallback, restoration of automatic registration,
and Android Companion rendering are recorded for the named FND-011 target in
[the lifecycle evidence](evidence/2026-08-23-fnd-011-panel-lifecycle.md).
They do not approve the changed chat candidate or Core 2026.9.0.
Updated lifecycle, desktop/mobile, provider, chat, and scoped-log acceptance
remain governed by the tracker and candidate evidence.
