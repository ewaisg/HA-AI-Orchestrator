# Workflow schema v1 implementation boundary

Task: WFL-001. This is an internal document contract, not a released workflow runtime.

The parser accepts a bounded workflow with a canonical UUID4, name, description,
explicit boolean enabled state, triggers, conditions and steps. Missing enabled
state defaults to false. Version must be the integer 1. Unknown versions cannot
be migrated or downgraded; there is no invented historical v0 format.

The implemented draft kinds are manual/state/time triggers, state/numeric-state/
time-window conditions, and compose/classify/notify steps. Each kind has a
closed field set. Times use ASCII HH:MM, numeric bounds must be finite, and
identifiers must match in full. Unknown caller keys are omitted from errors.
Notification references are restricted to the notify namespace; this shape check
does not prove that an action exists or that its target is authorized.

Migration currently validates and round-trips v1 without mutating the input.
It preserves an explicit enabled state for storage reload. Import and activation
must separately enforce administrator approval; parsing never enables listeners
or starts execution. No storage repository, cloud route, provider selection,
notification payload binding, or Home Assistant action executor is implemented
by this module.

The 2026-09-12 owner direction connected this schema to persistence and
observation-only activation (WFL-002) ahead of LOC-007. Step execution still
waits on LOC-007 and WFL-003 through WFL-006. Action discovery and exact targets must come from
Home Assistant evidence. Storage atomicity, corruption/restart handling,
backup/restore and upgrade migration fixtures remain separate implementation
requirements under ADR-0005. No device-action or compatibility claim follows
from these pure schema tests.
