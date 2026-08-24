# FND-013 data-flow and traceability evidence — 2026-08-23

## Scope

FND-013 defines a redacted, stable, machine-checkable map from approved product requirements through trust-boundary data flows, security controls, and planned or already-bounded test evidence. It does not implement or mark delivered any provider adapter, workflow engine, chat/Assist agent, cloud route, Home Assistant action tool, or security workflow.

The artifacts contain synthetic design metadata and repository evidence references only. They contain no live hostname, network address, entity, person, target, credential, recovery material, provider response, prompt, backup identifier, or account identifier.

## Artifacts

- Readable map: `docs/quality/DATA-FLOW-TRACEABILITY.md`
- Machine catalog: `docs/quality/traceability/traceability.json`
- Catalog schema: `docs/quality/traceability/traceability.schema.json`
- Integrity tests: `tests/quality/test_traceability.py`
- Acceptance manifest: `docs/evidence/manifests/FND-013/FND-013-DATA-FLOW-TRACEABILITY-001.json`

## Coverage and claim boundaries

The catalog assigns stable IDs to:

- seven protected data classes;
- ten trust-zone nodes;
- fourteen data flows;
- all ten approved capabilities, all eight product constraints, and the product-acceptance definition;
- fourteen security/quality controls; and
- eighteen test specifications.

Every requirement has at least one flow, control, and test link. Every flow references existing nodes, data classes, controls, and tests. All product requirements remain `planned`. Narrow existing Phase 0 evidence may set a control to `phase0_verified` or a test to `phase0_passed`; the readable map states the exact limitation and does not promote a product capability to delivered.

## Automated working-tree verification

| Check | Result |
|---|---|
| `uv run python scripts/run_pure_tests.py` | `85 passed`, with five dependency deprecation warnings |
| `uv run ruff format --check tests/quality/test_traceability.py` | Passed after the new test file was formatted |
| `uv run ruff check tests/quality/test_traceability.py` | Passed after one import-order issue was automatically corrected |
| `uv run python scripts/canary_scan.py` | Passed with no findings |
| `git diff --check` | Passed; only expected Windows line-ending notices were emitted |
| Targeted sensitive-value scan | No checked private hostname/address/token/key patterns were found |

The first format check and first lint check correctly failed on the unformatted new test file. The project formatter changed that file, Ruff corrected the import order, and the complete check set above was rerun successfully. The initial results are not represented as passing runs.

## Review state

Independent workflow/safety and test/release reviews are pending. The working-tree manifest therefore remains `incomplete`; FND-013 must not be marked done until a clean committed revision is reviewed and its manifest is finalized.
