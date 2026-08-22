# ADR-0004: Least-privilege tools and Home Assistant-only side effects

Date: 2026-08-22
Status: Accepted

## Context

Model output and household/event data are untrusted. A generic service/action caller would allow a hallucination or injected instruction to expand its own authority.

## Decision

Generate typed tools per request from explicit agent/workflow observation and action scopes. Prefer Home Assistant's built-in Assist LLM API where its exposure model is sufficient; otherwise provide a narrower integration-owned LLM API.

Only the backend policy layer may execute a Home Assistant action. It validates tool identity, schema, target, current state, risk, user context, confirmation, rate, and idempotency immediately before the call.

Security/life-safety primary paths remain deterministic. AI may enrich but cannot suppress, delay, or downgrade the primary path.

## Consequences

- No provider receives Home Assistant credentials or an unrestricted action tool.
- High-risk confirmations bind the exact action, target, arguments, workflow version, user, state preconditions, and expiry.
- Critical actions are unavailable to models.
- The final risk matrix requires user approval before action-capable release.
