# LOC-001 provider config-entry lifecycle evidence — 2026-08-24

## Scope

LOC-001 implements the provider-neutral Home Assistant config-entry lifecycle required before any live adapter is added. It separates the existing integration foundation from one config entry per provider connection and defines setup, validation, reauthentication, reconfiguration, reload, unload, removal, and migration behavior on exactly Home Assistant Core `2026.8.3`.

This task does not add an LM Studio/OpenAI-compatible transport, endpoint, credential, model, capability claim, provider request, panel provider form, entity access, chat, workflow, tool executor, or Home Assistant action. Those remain LOC-003 and later tasks. All lifecycle acceptance data is synthetic.

## Implemented contract

- Config-flow version 2 retains one foundation entry and permits later provider entries only for registered adapters. With no adapter registered, a later Add Integration flow reports `no_provider_adapters` rather than fabricating provider data.
- A provider entry has a closed top-level shape: `entry_kind`, canonical generated `connection_id`, validated `provider_type`, and adapter-owned JSON `provider_config`. Its stable unique ID is `provider:<connection_id>`.
- Provider adapters own setup, reauthentication, and reconfiguration schemas and normalization behind `ProviderEntryAdapter`. Schema generation never receives stored provider configuration, so it cannot default a stored credential back into a browser form.
- Normalized configuration is deep-copied into a lifecycle-owned canonical value. A separate copy reaches provider construction, and a fresh copy of the untouched canonical value reaches Home Assistant storage only after validation succeeds. Recursive validation admits only exact JSON object/string-key/list/scalar/null shapes with finite numbers; lossy tuples, nested non-string keys, custom containers, circular values, extra top-level fields, ambiguous entry kinds, malformed provider types, noncanonical UUIDs, and mismatched unique IDs fail closed.
- Setup and updates validate the provider contract before creating or replacing entry data. `ProviderError` requires an immutable `NormalizedError`; Home Assistant messages are derived from the fixed safe-message mapping rather than adapter-provided text. Authentication maps to `ConfigEntryAuthFailed` and starts Home Assistant reauthentication; connection/DNS/TLS/timeout/rate/unavailable states map to `ConfigEntryNotReady`; terminal normalized errors map to `ConfigEntryError`. Unexpected adapter and schema-callback exception text is replaced by bounded error identifiers or fixed safe text.
- Failed setup or reauthentication does not populate runtime, update stored configuration, or schedule reload. Successful reauthentication/reconfiguration preserves entry identity, replaces the complete normalized adapter configuration, and uses Home Assistant `async_update_reload_and_abort`.
- A loaded provider is attached only to its config entry and tracked by entry ID. Unload/removal clears runtime without changing foundation panel ownership.
- The only migration accepted is the known version-1.1 empty foundation entry. It becomes the closed version-2.1 foundation shape. Exact current version-2.1 entries are validated; unsupported past/future major or minor versions, historical provider guesses, and corrupt/mismatched current data are rejected.
- Provider configuration and provider objects are excluded from ordinary dataclass representations. No generic provider options exist yet; reviewed adapter-specific non-secret options may be added later without changing connection identity.

## Verification history

The first Linux attempt did not start because the installed Docker Desktop engine was stopped; starting the existing engine resolved that environment condition. Subsequent working-tree runs exposed and corrected three test-only issues: one incorrect health-enum import, assertions that assumed an unset `MockConfigEntry.runtime_data` attribute existed, and an uppercase-UUID negative vector containing no alphabetic characters. None was reported as a passing gate.

The final working tree produced:

| Check | Observed result |
|---|---|
| Clean Linux full suite with Home Assistant pytest plugin | 223 passed |
| Provider/security/quality suite with plugin autoload disabled | 166 passed; five known upstream dependency deprecation warnings |
| Pure test runner | 166 passed; the same five warnings |
| Ruff format | 64 files already formatted |
| Ruff lint | Passed |
| Canary scan | Passed with no findings |
| `git diff --check` | Passed |

The five warnings are the already recorded Home Assistant/aiohttp inheritance warning and four `backoff` calls to deprecated `asyncio.iscoroutinefunction`; no project-source warning or test failure remains.

Immutable artifact `4ea2595029e7ad7a953abb628bf38bd93060885f` reproduced the same 223-test clean-Linux full suite from a Git archive and reproduced 166 provider/security/quality tests, 166 pure tests, Ruff, canary, evidence-schema, traceability, diff, and clean-worktree checks locally. Artifact hashes in the manifest match the committed Git blobs.

Independent test/release review approved candidate `5c260ae5cfb46a497db3be322fbd621e5a31baeb` at `2026-08-24T16:47:18Z`. Independent workflow/safety review rejected that candidate at `2026-08-24T16:49:22Z` after adversarial reconstruction proved four blockers: a forged `ProviderError` and schema exception could expose arbitrary text, an adapter could mutate the configuration that would later be stored, nested non-string keys and tuples could change across JSON persistence, and unsupported version-0 entries could pass migration. LOC-001 remained open.

The current remediation requires a real `NormalizedError`, derives HA messages from the fixed mapping, bounds every provider-schema callback, isolates canonical validated configuration from adapter-owned copies, recursively enforces exact JSON shapes, and permits only the documented version-1.1-to-2.1 migration or exact current-version validation. Adversarial tests cover setup/reauth/reconfigure mutation, forged errors, schema exceptions, nested/circular/lossy JSON, and unsupported major/minor versions. The remediated working tree passes 50 focused clean-Linux tests, 167 local provider/security/quality tests, 167 pure tests, Ruff, canary, and diff checks. These are interim results, not an accepted artifact result.

## Residual gates

- LOC-003 must register the actual LM Studio/OpenAI-compatible adapter, define its exact endpoint/authentication fields, use the Home Assistant shared async HTTP session, pass the common provider contract, and revalidate the already observed live environment without committing private values.
- LOC-004 must expose provider setup/test behavior through the product panel and prove that credentials and secret-derived masks never enter browser state or screenshots.
- Every live adapter must prove resource cleanup, credential rotation/removal, timeout/cancellation, approved endpoint handling, redaction, and no leaked session/task after reload or removal. The shared lifecycle does not claim those adapter-specific results.
- `REQ-CAP-001`, `CTRL-PROVIDER-001`, and `TEST-PROVIDER-CONTRACT` remain incomplete for the product until the implemented live adapters and UI pass their gates.

## Acceptance status

`REMEDIATION IN REVIEW`. The first candidate was rejected and is not accepted. Create a new immutable artifact from the remediated tree, reproduce the full exact-commit gates, and obtain fresh workflow/safety plus test/release approvals before LOC-001 can be `DONE`.
