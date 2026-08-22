# ADR-0005: Provider and workflow storage boundaries

Date: 2026-08-22
Status: Accepted concept; storage implementation provisional

## Context

Provider connections contain credentials and fit Home Assistant's config-entry lifecycle. Workflows, policies, and traces are larger, mutable collections requiring migrations and retention rules. Home Assistant storage must not be described as an encrypted secret vault.

## Decision

- Use one Home Assistant config entry per provider connection.
- Keep secrets backend-only and never return a secret-derived mask to the browser.
- Put workflows, policies, capability records, and bounded traces behind separate versioned repository interfaces.
- Never edit `.storage` files directly.
- Exports omit credentials and default to redacted content.
- Persistent prompt/response bodies remain off by default until the user approves retention.

## Consequences

The selected repository implementation requires migration, atomicity, corruption, restart, backup/restore, downgrade, retention, and write-frequency tests. An optional database/add-on is considered only after measurements show it is needed.
