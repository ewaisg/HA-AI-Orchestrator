# Dining-room window notification acceptance

Tasks: WFL-007, WFL-004, ENV-004. Live candidate: r12 on Core 2026.9.3.

## Configuration and observations

- Owner selected the dining-room window and confirmed the Android device and
  iPhone names presented from the actual notification catalogue. Exact household
  entity IDs remain in the live workflow, not this public evidence document.
- Native Home Assistant States showed the dining-room contact with raw state
  `off`, device class `opening`, and the dining-room window name. No device state
  was overwritten or event injected.
- Created **Dining room window - phone alerts** through the visual builder,
  initially disabled: state trigger to `on`, no extra conditions, execute mode,
  existing local LM Studio connection, one compose step and two notification
  entity targets. The prompt requests a factual single sentence about opening,
  without invented duration, weather, people, or security information.
- Deterministic preview used an explicitly synthetic `off` to `on` snapshot at
  `20:00`. Result: trigger matched, three steps planned, provider calls 0,
  actions executed 0. This is not a live sensor event.
- Stored-workflow AI dry run: **Dry run completed — nothing was sent**;
  generated **Dining room window has been opened.** Both notification steps
  resolved to notify entities. Provider calls 1, actions executed 0,
  destination local.
- Enabled only after that successful dry run. Stored list then reported
  **Active**, listeners 1, observations 0, executions 0, failures 0, and
  skipped while busy 0.
- Independent read-only workflow reviewer accepted this configuration for the
  authorized test. Reviewer identified recovery-to-on triggers and busy-run
  skips as current limitations; stable notify entity identity is used.

## Pending acceptance / exact resume point

Owner reported physically opening and closing the window. After Reload workflows,
the live panel reported:

- Active; observations 2, ignored events 0, listeners 1.
- Executions 1, failures 0, skipped while busy 0.
- Last execution completed; provider calls 1; notifications delivered 2.
- Compose: ok; both notify steps: delivered (entity).
- Latest observation: triggered no, conditions passed, no steps planned.

This verifies one actual workflow execution with two successful Home Assistant
notification calls, followed by a non-triggering observation consistent with
closing. It does not independently prove handset receipt. Owner has been asked
which phones received the notification. Next: record that answer; investigate
any missing handset delivery. WFL-007 remains pending receipt confirmation.
Restart persistence is a separate WFL-008 check.

## Existing automation overlap review

Owner could not attribute received alerts because existing window/door
automations were already present. Read-only review of native Automations found:

- **Sonoff Windows Sensors**, enabled: seven contacts including the chosen
  dining-room window. Opening sends `<sensor name> OPENED` to two device targets
  and announces `Windows open.` on the hallway/loft Echo targets. Closing sends
  `<sensor name> CLOSED`. Continued opening escalates at 30 seconds and 1 minute
  with notifications, announcements and alarm sounds. No explicit notification
  title is configured in the reviewed actions.
- Its actual traces show the dining-room contact opening on September 20 at
  **1:49:55 PM**, option 1 executed, finished in 0.30 seconds; closing at
  **1:49:59 PM**, option 2 executed, finished in 0.18 seconds (UI local times).
  Thus the existing automation also ran during the owner's test.
- **Sonoff Doors Sensor**, enabled: four separate door contacts, including the
  patio door but not the selected dining-room window. Opening/closing messages
  use the same format and two device targets as the window automation; Alexa
  opening messages name the door. Warning/alarm thresholds are 20/45 seconds.
- Both native automations use parallel mode, maximum 20. The two notification
  device IDs are shared between them; their device-name mapping was not resolved
  in this review. No existing automation was edited or disabled.

The new workflow independently recorded its own completed run and two sends.
Its distinct notification title is **Dining room window - phone alerts**, with
an AI-composed sentence instead of the native uppercase OPENED/CLOSED format.
Both systems ran; unspecified phone alerts cannot close the new workflow's
handset-receipt acceptance. Ask specifically about that title.

The existing household automations were not changed. This workflow sends a
local-AI-composed notification on a matching opening; it is not a deterministic
security or life-safety alert. No broad AI device permissions were granted.

## Authorized isolated three-phone retest

Owner explicitly requested temporary disable of the existing door/window
automations and addition of Fold8Ultra. The live catalogue exposed Fold8Ultra
as a notify entity; selected that entity, not a guessed service. Disabled the
orchestrator workflow for editing, added the third notification step, saved
disabled, and successfully dry-ran the exact updated document. Result: one
local provider call, three resolved entity notification plans, zero actions;
composed text was `Dining room window has been opened.`

Enabled the updated workflow: Active, one listener, zero executions/failures
at the new baseline. Then toggled **Sonoff Doors Sensor** and **Sonoff Windows
Sensors** off through the native Automations UI and verified both switches
unchecked. Both were checked/on beforehand. Driveway automations remain on.

Owner confirmed that Fold8Ultra received the notification and explicitly stated
the other phones had not been checked. The live panel recorded observations 2,
executions 1, failures 0, busy skips 0, and listeners 1. Last execution completed:
provider calls 1, notifications delivered 3; compose ok and all three notify
steps delivered (entity). Latest observation did not trigger or plan steps.

**Both native automations have now been restored to ON.** The native UI showed
both switches checked after restoration; driveway automations remained on.
The AI workflow remains active with all three targets. Independent review
recommended this short isolation and explicit restoration sequence.

The isolated test verifies end-to-end receipt on Fold8Ultra without the native
automations running. The other two successful HA notification calls are verified,
but handset receipt remains unconfirmed. Next: record receipts for the original
Android/iPhone when checked; WFL-008 restart verification remains separate.
Native and AI opening alerts overlap again after restoration.
