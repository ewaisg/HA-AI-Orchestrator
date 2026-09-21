# WFL-005 AI refinement as a new draft copy

Claim: bounded follow-up to WFL-005. Backend ownership is
`workflow_draft_api.py` and `test_workflow_draft_api.py`; the coordinating agent
owns frontend and root owns command registration. Frozen r13 artifacts are not
modified. This is a later source candidate, not a live refinement result.

## Contract and behavior

The administrator selects an existing internal workflow. The read-only
`ai_orchestrator/workflows/draft_source` command returns its normalized document,
exact structured entity/notification reference lists and a server-derived SHA-256
content version. Sources exceeding 32,768 serialized characters or eight entity
or notification references are unavailable for this bounded drafting feature.

`generate_draft` accepts paired optional `source_workflow_id` and `source_version`.
The backend reads the source again and checks the version before generation.
All source trigger/condition/notify references must be included in the explicit
selected reference sets; live selection checks still apply. It sends only the
source's name, description, triggers, conditions and steps alongside the request
and selected references. It omits source identity, enabled state, provider route
and current household states. Source text is untrusted. Combined input is bounded
to 48,000 serialized characters; generation/result limits remain unchanged.

After generation, source content and manager ownership must still match. Changed,
deleted, unreadable or replaced sources produce a static error and no draft.
The content version is a fingerprint, not a durable monotonic edit counter.

The result carries source identity/version as provenance, but its workflow has
a **new ID**, is **disabled** and **unsaved**. The existing source is never edited,
disabled or replaced. This avoids overwriting edits made during the subsequent
human review; true in-place replacement would require a separate atomic
compare-and-save contract. Review, saving the new copy, dry run and enable remain
explicit separate operations. Native HA automations are untouched.

## Verification

Core 2026.9.3 focused command:
`pytest tests/home_assistant/test_workflow_draft_api.py -q`:
**54 passed in 5.58s**. Tests use the production
`async_register_websocket_commands` registrar for both endpoints.

The 22 added cases cover source version stability/change, exact source context,
new disabled copy identity, unchanged source/storage/activation, zero service
calls, non-admin denial, missing/forged/stale source versions, unselected source
references, deletion/edit/manager replacement during generation, unavailable
storage, source/reference/combined-input bounds and static errors. Prior 32 draft
tests still pass. Focused Ruff and diff checks pass.

Independent review of the coordinating agent's client/view found no blocking
issue: source identity/version/reference validation, new-copy-only handoff and
session guards hold; source prompts are disclosed before submission. Its browser
suite independently passed **24 tests**. The coordinating agent independently
approved the backend boundary and reran **54 tests** in 5.97 seconds. No live model, source
workflow edit, device action or notification was performed for this slice.

## Independent backend review

Primary independently inspected source fingerprinting, explicit reference subsets, before/after source and runtime identity checks, bounded provider payload and disabled new-ID unsaved result. No blocker found. Independent rerun: 54 tests passed in 5.57 seconds on Core 2026.9.3. Production registration startup/status tests: 50 passed in 4.62 seconds. This is source acceptance, not live refinement acceptance.
