# FND-013 data-flow and traceability evidence — 2026-08-23

## Scope

FND-013 defines a redacted, stable, machine-checkable map from approved product requirements through trust-boundary data flows, security controls, and planned or already-bounded test evidence. It does not implement or mark delivered any provider adapter, workflow engine, chat/Assist agent, cloud route, Home Assistant action tool, or security workflow.

The artifacts contain synthetic design metadata and repository evidence references only. They contain no live hostname, network address, entity, person, target, credential, recovery material, provider response, prompt, backup identifier, or account identifier.

## Artifacts

- Readable map: `docs/quality/DATA-FLOW-TRACEABILITY.md`
- Machine catalog: `docs/quality/traceability/traceability.json`
- Catalog schema: `docs/quality/traceability/traceability.schema.json`
- Integrity tests: `tests/quality/test_traceability.py`
- Cross-platform hashed-artifact line-ending policy: `.gitattributes`
- Acceptance manifest: `docs/evidence/manifests/FND-013/FND-013-DATA-FLOW-TRACEABILITY-001.json`

## Coverage and claim boundaries

The catalog assigns stable IDs to:

- seven protected data classes;
- thirteen trust-zone nodes;
- eighteen data flows;
- all ten approved capabilities, all eight product constraints, and the product-acceptance definition;
- nineteen security/quality controls; and
- twenty-three test specifications.

Every requirement has at least one flow, control, and test link. Every flow references existing nodes, data classes, controls, and tests. All product requirements remain `planned`. Narrow existing Phase 0 evidence may set a control to `phase0_verified` or a test to `phase0_passed`; the readable map states the exact limitation and does not promote a product capability to delivered.

## Automated working-tree verification

| Check | Result |
|---|---|
| `uv run python scripts/run_pure_tests.py` | `88 passed`, with five dependency deprecation warnings after all workflow/safety corrections, exact readable-row comparison, and artifact-hash verification |
| `uv run ruff format --check tests/quality/test_traceability.py` | Passed after the new test file was formatted |
| `uv run ruff check tests/quality/test_traceability.py` | Passed after one import-order issue was automatically corrected |
| `uv run python scripts/canary_scan.py` | Passed with no findings |
| `git diff --check` | Passed; only expected Windows line-ending notices were emitted |
| Targeted sensitive-value scan | No checked private hostname/address/token/key patterns were found |
| Focused corrected traceability suite with plugin autoload disabled | `7 passed`, including exact per-requirement readable/catalog mapping equality |

The first format check and first lint check correctly failed on the unformatted new test file. The project formatter changed that file, Ruff corrected the import order, and the complete check set above was rerun successfully. The initial results are not represented as passing runs.

## First clean-commit review and corrections

Clean revision `982c58009471fb32cbdd97f5a1a821ce4b5ce579` received an independent test/release approval at `2026-08-24T05:39:58Z`, but workflow/safety review rejected it at `2026-08-24T05:39:42Z`. Because the corrected artifacts differ from that revision, both roles must approve the next clean revision before completion.

The workflow/safety findings and working-tree corrections are:

| Finding | Correction |
|---|---|
| Backup egress and restore ingress were collapsed into one one-way flow | Split local backup, off-device backup, and recovery-runtime nodes; separate two backup egress and two restore ingress flows; require decrypt, integrity, compatibility, migration, and restored-secret controls |
| Credential entry and provider authentication handling were contradictory | Model a newly typed secret as transient authenticated form data; prohibit browser return/persistence/echo/direct provider requests; limit backend transport auth to the normalized credential destination outside model-visible context |
| Same-version lifecycle and actual Core-upgrade proof were combined under one passed test/control | Keep the evidenced same-version lifecycle IDs separate from planned Core-upgrade/migration/rollback IDs |
| Prompt injection was not independently controlled/tested | Add immutable-policy/delimited-input control and adversarial injection test to HA-input and provider-output flows |
| Storm/concurrency, dependency compromise, and device-side effects were not explicit | Add bounded-rate/concurrency, supply-chain, and device-target controls/flows/tests |

Clean revision `621b907d87b8280ad2003c85d7b5dc0e32b1310d` was also rejected: workflow/safety review at `2026-08-24T05:54:29Z` found an outdated Core-upgrade residual and incomplete rate/concurrency links, while test/release review at `2026-08-24T05:57:12Z` found that Windows CRLF hashes did not match clean Linux/Git bytes. Revision `6ba4793a3d5b283c91fc5a78dc141c80644f2c20` corrects those items by linking rate/idempotency tests to provider and notification boundaries, naming `TEST-COMPAT-CORE-UPGRADE` in the residual, enforcing LF for every hashed artifact through `.gitattributes`, and hashing the canonical staged bytes. The focused hash test verifies the working files against those manifest values.

Metadata candidate `faeafd906ebb5d6f27c05904f3b31b50880aa0b5` received test/release approval at `2026-08-24T06:06:15Z`, but workflow/safety review rejected it at `2026-08-24T06:05:16Z`: the machine catalog linked `REQ-CAP-001` and `REQ-CAP-008` to `CTRL-RATE-001` and `TEST-STORM-CONCURRENCY`, while the corresponding readable rows omitted those two IDs. The corrected readable table fully expands every flow, control, and test ID for all nineteen requirements. A generic row-level integrity test now extracts every readable requirement mapping and requires exact ordered equality with the machine catalog, so a mismatch in any requirement row fails the suite. Because the artifact changed, the earlier test/release approval is superseded and both roles must review the next committed candidate.

The manifest remains `incomplete`. FND-013 must not be marked done until the corrected artifact revision is committed with canonical hashes and both independent reviewers approve its metadata-only review candidate.
