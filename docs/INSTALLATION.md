# Manual installation and current usage

Status: Phase 0 foundation preview

The current repository supports a manual-copy Home Assistant installation.
HACS installation and updating are not yet validated or claimed.

## Install

1. Download or clone `https://github.com/ewaisg/HA-AI-Orchestrator`.
2. Copy the complete repository folder
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

## Expected behavior

The Home page reports the authenticated foundation status. The expected feature
states are all unavailable:

- Provider connections
- Workflow runtime
- Conversation agent
- AI Task entity

The remaining navigation sections are intentional placeholders. The foundation
does not contact an AI destination or execute a Home Assistant action.

The Automations section may expose the Phase 0 **lifecycle probe**. That bounded
test fires one integration-owned internal event and increments an in-memory
counter. A valid result reports exactly one execution for the trigger, no
provider contact, and no Home Assistant action call. It is not a published
automation or the product workflow runtime.

## Troubleshooting

- If Home Assistant cannot find the integration, verify the exact manifest path
  and restart Home Assistant again.
- Only one foundation config entry is permitted. A second setup attempt returns
  `already_configured`.
- The panel and status command require an administrator.
- If the panel reports an unsupported status response, replace the whole
  `ai_orchestrator` directory from one repository revision; do not mix backend
  and frontend files from different revisions.
- Check **Settings -> System -> Logs** for `ai_orchestrator` setup errors.
- If the lifecycle probe does not report exactly one execution for its trigger,
  treat the result as a failed compatibility check and do not infer that
  workflows are available.

Automatic panel registration remains an isolated compatibility boundary. Both
automatic registration and the exact YAML fallback documented in
`custom_components/ai_orchestrator/panel.py` were live-verified on Home
Assistant OS with Core 2026.8.3 and Frontend 20260729.7. Use the fallback only
if automatic registration fails; this evidence does not claim another version.

## Update and removal boundary

Config-entry removal/reinstallation, reload, restart recovery, cache-bypassing
refresh, YAML fallback, and restoration of automatic registration are validated
on the named FND-011 target in
`docs/evidence/2026-08-23-fnd-011-panel-lifecycle.md`. Android Companion App
rendering is also confirmed. Core-upgrade evidence remains open.
