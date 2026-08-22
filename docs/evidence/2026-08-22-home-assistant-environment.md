# Home Assistant environment evidence — 2026-08-22

## Scope and handling

This is a redacted, read-only observation of the user's active Home Assistant environment through the signed-in Home Assistant UI. No settings, integrations, automations, scripts, entities, backups, or actions were changed or run during this inspection.

Excluded from this record: account identifiers, precise external URLs and IP addresses, credentials, secrets, unrelated household state, calendar content, notification content, backup names, and exact location data.

## Confirmed platform facts

| Evidence ID | Observed fact | UI source |
|---|---|---|
| HA-LIVE-001 | Installation method: Home Assistant OS | Settings → About |
| HA-LIVE-002 | Core 2026.8.3; Supervisor 2026.07.5; Operating System 18.2; Frontend 20260729.7 | Settings → About |
| HA-LIVE-003 | Hardware: Home Assistant Green | Settings → System → Hardware |
| HA-LIVE-004 | Memory displayed as 2 GB / 4 GB at the observation time | Settings → System → Hardware |
| HA-LIVE-005 | Storage displayed as 27% used and 20.2 GB free | Settings → System |
| HA-LIVE-006 | External access is enabled; the address was deliberately not recorded | Settings → System → Network |
| HA-LIVE-007 | Repairs reported no pending repairs | Settings → System → Repairs |

The processor architecture was not exposed in the successfully accessible screens and remains unverified. The memory display is recorded exactly as shown; this document does not infer whether the first value represents used, reserved, or another category.

## Installation and development surfaces

| Evidence ID | Observed fact | UI source |
|---|---|---|
| HA-LIVE-008 | HACS is installed and appears in the sidebar and integrations | Sidebar; Settings → Devices & services |
| HA-LIVE-009 | File Editor is installed and running | Settings → Apps |
| HA-LIVE-010 | Installed apps observed: File Editor running, Matter Server running, CEC Scanner stopped, and Get HACS stopped | Settings → Apps |
| HA-LIVE-011 | RESTful Command is configured as an integration | Settings → Devices & services |

These observations make a HACS custom-repository installation a candidate for evaluation. They do not prove that the intended private-repository access and update flow works, and they do not constitute the user's selection of the final installation/update method.

## Window and Echo workflow evidence

| Evidence ID | Observed fact | UI source |
|---|---|---|
| HA-LIVE-012 | An enabled window-sensor automation exists and had a recent trigger at observation time | Settings → Automations & scenes |
| HA-LIVE-013 | Multiple window contact devices are exposed through Zigbee Home Automation | Settings → Devices & services → Entities, filtered by `window` |
| HA-LIVE-014 | An existing local-AI-to-Echo test script exists and had a recent execution at observation time | Settings → Automations & scenes → Scripts |
| HA-LIVE-015 | Alexa Devices is configured, requires Internet, and exposes enabled Echo Dot targets with `Announce` and `Speak` entities | Settings → Devices & services → Alexa Devices |
| HA-LIVE-016 | Google Cast and Google Translate TTS are also configured | Settings → Devices & services |

The UI confirmed the workflow components and friendly names, but the exact trigger entity IDs, script entity ID, action identifier, and action payload were not exposed in the accessible table views. No IDs or schemas are inferred. `ENV-004` therefore remains partially resolved and must be completed from a read-only automation/script editor view, exported redacted YAML, or another user-approved live view before `WFL-007` implementation.

## AI and voice surfaces

| Evidence ID | Observed fact | UI source |
|---|---|---|
| HA-LIVE-017 | Two English Assist pipelines are listed: Home Assistant and Home Assistant Cloud | Settings → Voice assistants |
| HA-LIVE-018 | 149 entities were shown as exposed to Assist; automatic exposure of new entities was enabled | Settings → Voice assistants |
| HA-LIVE-019 | The Amazon Alexa voice-assistant exposure switch was off; Google Assistant exposure and state reporting were on, with 42 entities shown as exposed | Settings → Voice assistants |
| HA-LIVE-020 | No entity was selected for Data generation tasks or Image generation tasks | Settings → AI tasks |
| HA-LIVE-021 | Google Gemini is configured as an integration | Settings → Devices & services |

Echo announcement output through Alexa Devices does not, by itself, prove Echo voice-input support for this product. Voice input must be designed and verified separately through Home Assistant Assist.

## Backup observations

| Evidence ID | Observed fact | UI source |
|---|---|---|
| HA-LIVE-022 | The backup page still offered initial backup setup | Settings → System → Backups |
| HA-LIVE-023 | The page showed zero automatic backups, one app-update backup, and one manual backup | Settings → System → Backups |
| HA-LIVE-024 | The system summary reported the last backup as approximately four months earlier | Settings → System |

At this observation, automatic backups were not configured. Encryption, emergency-kit readiness, restore viability, and network protections were not verified. No backup was created, opened, restored, downloaded, or deleted.

## Remaining evidence requests

1. Exact entity IDs and action schema for the window-to-Echo workflow (`ENV-004`).
2. Exact processor architecture if a dependency requires architecture-specific packaging (`ENV-002`).
3. User selection of private installation/update method (`ENV-007`); HACS custom repository is a candidate whose private access and update flow still needs validation.
4. Backup encryption/emergency-kit status and the remote-access method, TLS termination, VPN/reverse-proxy use, and LAN/firewall segmentation relevant to the product (`ENV-010`), without keys or recovery material.
5. LM Studio evidence (`ENV-003`) in the separate, later LM Studio review requested by the user.

## Revalidation rule

Version, storage, integration, entity, voice-exposure, and backup facts can drift. Any consuming implementation or release task must revalidate the minimum relevant fact against the active environment and record the result.

## Review record

- Home Assistant specialist review: evidence statuses and technical gaps accepted after correcting the superseded Green/platform record and qualifying the HACS conclusion.
- Tracker/security review: household-friendly names and room labels removed; a targeted scan found no credential value, account/email identifier, IP address, precise external URL, or token in this snapshot, the evidence register, or the tracker.
