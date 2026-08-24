# Evidence, fixture, and canary conventions

Status: FND-014 baseline; LOC-002 provider contract version 1 extension
Recorded: 2026-08-24

## Committed evidence

Committed acceptance evidence uses `docs/quality/schemas/evidence-manifest.schema.json`. A manifest records traceability, exact command arguments and exit codes, environment status, artifact digests, reviewer state, unknowns, and residuals.

- `passed` requires a clean committed revision, no unresolved unknowns, every check passed with exit code zero, and an approved independent `test_release` review.
- `working_tree` evidence is always `incomplete`; it may document progress but cannot close a release gate.
- Committed data mode is `synthetic` or `live_redacted`, never live raw data.
- A repository artifact must declare `contains_live_data: false`.
- Private live evidence is represented only by an opaque external evidence ID, digest, classification, and review status. Do not store its filesystem path, URL, account identifier, or household detail.
- Raw test output belongs under the gitignored `artifacts/` directory until it is reviewed and converted to a redacted manifest/artifact.

The non-acceptance example is `docs/quality/templates/evidence-manifest.example.json`.

## Fake-provider fixtures

Committed fake-provider fixtures follow `tests/fixtures/providers/schema/fake-provider-fixture.schema.json` and live under the matching version directory.

- Provenance is always `synthetic`.
- Capability state is `supported`, `unsupported`, or `unknown`; missing evidence never becomes support.
- The clock is manual and steps are explicitly sequenced.
- Fixtures contain no provider endpoint, account, tenant, region, live model identifier, Home Assistant entity, or usable credential. Model-discovery fixtures may contain clearly synthetic provider-model records.
- The allowed event vocabulary is closed by schema.
- Fixtures describe provider behavior but never perform network access or Home Assistant actions.
- Typed synthetic tools and tool calls are contract data only. The fake provider never executes a tool, and no fixture may name or invoke a Home Assistant action.

FND-014 established the fixture/evidence baseline and FND-015 added the runtime fake. LOC-002 extends both to provider contract version 1; every future live adapter must rerun the common contract cases before its own task can pass.

## Canary handling

`tests/security/canaries.py` constructs deterministic, obviously synthetic credential/privacy values at test time. Production-like logs, diagnostics, exports, snapshots, screenshots metadata, frontend bundles, and evidence output must not contain any plain, URL-encoded, or JSON-escaped variant.

`scripts/canary_scan.py` scans readable artifacts while excluding dependency, scratch, and version-control directories. The canary factory source is excluded because its split fragments are the approved test input; generated values are not allowlisted anywhere.

Any detected value fails the applicable test/release gate. The scanner is not a replacement for field-aware redaction or manual privacy review.

## Current commands

Native Windows can run the pure schema/security suite without auto-loading the Home Assistant test plugin:

```powershell
uv run python scripts/run_pure_tests.py
```

Formatting and static analysis:

```powershell
uv run ruff format --check scripts tests
uv run ruff check scripts tests
```

The full Home Assistant plugin imports Unix-only `fcntl` on this workstation. Home Assistant lifecycle tests therefore require the approved Linux runner/container or live development-instance path; they may not be marked passed from the isolated pure-test command.
