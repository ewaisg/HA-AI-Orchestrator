# ADR-0005: Provider and workflow storage boundaries

Date: 2026-08-22
Status: Provider config-entry lifecycle accepted; workflow storage implementation provisional

## Context

Provider connections contain credentials and fit Home Assistant's config-entry lifecycle. Workflows, policies, and traces are larger, mutable collections requiring migrations and retention rules. Home Assistant storage must not be described as an encrypted secret vault.

## Decision

- Use one Home Assistant config entry per provider connection.
- Keep the foundation entry distinct from provider entries. Config-flow version 2 identifies entries with a closed `entry_kind`; the known version-1 empty foundation entry has one explicit migration and no version-1 provider entry is inferred.
- Give each provider connection a generated canonical UUID and a stable `provider:<uuid>` Home Assistant unique ID. Store the adapter type and adapter-owned JSON configuration under closed provider-entry metadata.
- Provider adapters own setup, reauthentication, and reconfiguration schemas and normalization. Form-schema construction never receives stored configuration, preventing a schema default from echoing a stored credential to the browser.
- Validate a connection before creating or updating an entry. Authentication starts Home Assistant reauthentication, transient normalized failures become retryable setup failures, and terminal failures stop without exposing raw adapter text.
- Keep provider runtime on the config entry and release it on unload/removal. No generic provider options are defined in LOC-001; an adapter may add reviewed non-secret options later without changing the provider-entry identity contract.
- Keep secrets backend-only and never return a secret-derived mask to the browser.
- Put workflows, policies, capability records, and bounded traces behind separate versioned repository interfaces.
- Never edit `.storage` files directly.
- Exports omit credentials and default to redacted content.
- Persistent prompt/response bodies remain off by default until the user approves retention.

## Consequences

The selected repository implementation requires migration, atomicity, corruption, restart, backup/restore, downgrade, retention, and write-frequency tests. An optional database/add-on is considered only after measurements show it is needed.
