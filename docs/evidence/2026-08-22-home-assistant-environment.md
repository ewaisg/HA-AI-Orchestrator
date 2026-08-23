# Home Assistant environment evidence — 2026-08-22 and 2026-08-23

## Scope and handling

This is a redacted, read-only observation of the user's active Home Assistant environment through the signed-in Home Assistant UI. No settings, integrations, automations, scripts, entities, backups, or actions were changed or run during this inspection.

The initial broad inspection occurred on 2026-08-22. HA-LIVE-025 through HA-LIVE-029 were added from a targeted read-only follow-up on 2026-08-23.

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
| HA-LIVE-025 | A read-only view of `automations.yaml` confirmed the enabled `automation.sonoff_windows_sensors` contract: seven `binary_sensor` targets; open, close, open-for-30-seconds, and open-for-1-minute state triggers; no top-level condition; parallel mode with maximum 20 | File Editor → `automations.yaml` |
| HA-LIVE-026 | The same automation uses `notify.send_message` with `target.entity_id` plus `data.message` for two Alexa `announce` targets and two Alexa `speak` targets. Its one-minute branch also uses `alexa_devices.send_sound` with `data.device_id` and `data.sound` for two devices | File Editor → `automations.yaml` |
| HA-LIVE-027 | A read-only view of `scripts.yaml` confirmed `script.test_local_ai_to_echo`: `rest_command.lmstudio_chat` receives `system_prompt` and `prompt`, stores `response_variable`, accepts only status `200`, speaks the trimmed response through both Alexa `speak` notification targets via `notify.send_message`, and otherwise speaks a fixed local-AI-unavailable message | File Editor → `scripts.yaml` |

The exact live trigger and output entity IDs were observed in the signed-in editor, but room-bearing household identifiers and device IDs are deliberately not copied into this public repository. The action identifiers and field schema above are exact, not inferred. `WFL-004` must discover the live registry entries, and `WFL-007` must require the user to select and revalidate the current targets instead of hardcoding identifiers from this snapshot.

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
| HA-LIVE-028 | Internet access uses Home Assistant Cloud; the local URL is automatic and uses the Home Assistant HTTP server on port 8123. Home Assistant's SSL certificate, key, and peer-certificate paths were empty | Settings → System → Network |
| HA-LIVE-029 | Home Assistant reverse-proxy trust was off with no trusted-proxy entries. IP banning was switched on, but its attempt threshold was `-1`, which the UI states disables automatic bans | Settings → System → Network |

At this observation, automatic backups were not configured. Encryption, emergency-kit readiness, and restore viability were not verified. Home Assistant Cloud is the confirmed remote-access method; native Home Assistant TLS and reverse-proxy trust were not configured. VPN use and upstream LAN/firewall segmentation cannot be determined from these Home Assistant screens. No backup was created, opened, restored, downloaded, or deleted, and no network setting was changed or saved.

## Owner-confirmed policy and network facts

| Evidence ID | Confirmed fact | Source |
|---|---|---|
| HA-OWNER-001 | Home Assistant and the LM Studio host are on the same local network | Direct owner statement, 2026-08-23 |
| HA-OWNER-002 | Remote Home Assistant access uses Home Assistant Cloud together with an owner-managed domain; the exact domain is deliberately not recorded | Direct owner statement, 2026-08-23 |
| HA-OWNER-003 | OpenVPN is used when the owner remotely administers the computer that hosts LM Studio. It is not required for the Home Assistant-to-LM Studio runtime path | Direct owner statement plus DEC-020, 2026-08-23 |
| HA-OWNER-004 | Provider routing is local-only by default; cloud use requires explicit per-workflow opt-in | Direct owner acceptance of the recommended policy; DEC-017 |
| HA-OWNER-005 | Default retention is 30 days for chat content and 90 days for execution metadata | Direct owner acceptance of the recommended policy; DEC-018 |
| HA-OWNER-006 | Credentials, cameras, precise location, person/presence data, calendars, locks, alarms, and garage/security state are excluded from cloud routes by default | Direct owner acceptance of the recommended policy; DEC-019 |

## Remaining evidence requests

1. Exact processor architecture if a dependency requires architecture-specific packaging (`ENV-002`).
2. Backup encryption/emergency-kit and restore-readiness status plus router/VLAN policy relevant to the product (`ENV-010`), without keys or recovery material. The LM Studio host's broad Windows Firewall application rules are now separately verified in `docs/evidence/2026-08-23-lm-studio-environment.md` and require narrowing.
3. LM Studio evidence (`ENV-003`) in the separate, later LM Studio review requested by the user.
4. Revalidate and select the current private trigger/output targets from live discovery before `WFL-007`; do not copy or hardcode the household identifiers recorded only in the active environment.

## Revalidation rule

Version, storage, integration, entity, voice-exposure, and backup facts can drift. Any consuming implementation or release task must revalidate the minimum relevant fact against the active environment and record the result.

## Review record

- Home Assistant specialist review: evidence statuses and technical gaps accepted after correcting the superseded Green/platform record and qualifying the HACS conclusion.
- Tracker/security review: household-friendly names and room labels removed; a targeted scan found no credential value, account/email identifier, IP address, precise external URL, or token in this snapshot, the evidence register, or the tracker.
