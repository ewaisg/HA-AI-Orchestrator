# ADR-0002: Deterministic bounded workflow runtime

Date: 2026-08-22
Status: Accepted; initial trigger set provisional

## Context

Home Assistant documents actions and configuration validation, but does not document a stable third-party contract for embedding its entire automation editor/runtime or directly editing its native automation storage.

## Decision

Use an orchestrator-owned, versioned workflow schema and a deliberately small deterministic runtime. AI appears only as bounded compose, classify, extract, predefined-branch, or conversation/tool steps. Deterministic conditions run before inference. Side effects execute through documented Home Assistant actions.

Do not write `automations.yaml` or Home Assistant automation `.storage` records directly.

## Consequences

- The first trigger/condition set is intentionally curated and must be proven across setup, reload, unload, restart, cancellation, concurrency, and duplicate-registration scenarios.
- Native Home Assistant validation/discovery may assist configuration but is not treated as the execution engine.
- Retries and failover cannot replay a completed or unknown-outcome side effect.

## Validation gate

Prove one no-side-effect workflow across integration reload and Home Assistant restart before publishing action-capable workflows. Record the exact supported triggers only after those tests pass.
