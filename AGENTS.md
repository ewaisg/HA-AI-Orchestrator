# Project agent instructions

These instructions apply to every file in this repository.

## Source-of-truth order

1. Direct evidence supplied by the user or obtained from the active Home Assistant environment.
2. Current repository files and recorded decisions.
3. Current official primary documentation.
4. Explicitly labeled design proposals.

Never invent entity IDs, endpoints, credentials, Home Assistant versions, provider capabilities, model IDs, API responses, or successful test results. Record an unknown in `docs/EVIDENCE-REGISTER.md` and link the affected tracker task.

## Required workflow

1. Read `docs/PROJECT-TRACKER.md`, `docs/DECISIONS.md`, and the relevant specialist plan before changing code.
2. Claim a bounded task ID. Do not work on an untracked implementation task.
3. State the expected files and verification before editing.
4. Keep provider-specific behavior behind the provider contract.
5. Run the task's required checks and record real results. Never mark a check passed without its output or artifact.
6. Update the tracker with status, evidence, blocker, and next action.
7. If stopping, leave one unambiguous resume point.

## Collaboration roles

Roles may work independently on non-overlapping files and review one another at phase gates:

- **Tracker steward:** maintains task state, dependencies, evidence, and resume point.
- **Home Assistant specialist:** validates Core, frontend panel, WebSocket, Assist, registries, actions, and version compatibility.
- **Provider/backend specialist:** owns provider contracts, transports, normalization, routing, and error taxonomy.
- **UI specialist:** owns information architecture, accessibility, responsive interaction, and frontend tests.
- **Workflow/safety specialist:** owns deterministic execution, permissions, confirmation, idempotency, and audit behavior.
- **Test/release specialist:** independently verifies acceptance evidence and release gates.

An implementer may not be the only reviewer for security-sensitive behavior. Parallel agents must edit separate files unless they coordinate ownership first.

## Completion standard

`Done` means all of the following exist:

- The requested behavior or document.
- Automated checks appropriate to the change.
- Security and failure behavior where applicable.
- Recorded verification evidence.
- Documentation for any user-facing behavior.
- No unresolved blocker hidden behind a success status.

## Safety boundaries

- The model never receives a generic unrestricted Home Assistant action executor.
- High-risk actions require explicit policy and confirmation; critical actions are unavailable to AI.
- Security and life-safety detection paths are deterministic. AI may enrich them but may not delay or suppress their primary actions.
- Cloud failover is never silently enabled for a workflow containing private context.
- Provider secrets are backend-only and centrally redacted.
