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

Automatic panel registration is still a compatibility boundary. The exact YAML
fallback is documented in `custom_components/ai_orchestrator/panel.py`; use it
only if automatic registration fails.

## Update and removal boundary

Live update, cache, reload, removal, and YAML-fallback scenarios remain FND-011
acceptance work. They must not be described as validated until the tracker links
their target-version evidence.
