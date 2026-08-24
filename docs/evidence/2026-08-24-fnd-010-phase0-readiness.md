# FND-010 Phase 0 readiness evidence — 2026-08-24

## Scope and decision boundary

FND-010 reviews whether the verified Phase 0 foundation is ready for the local-provider MVP. On 2026-08-24, the project owner explicitly chose to continue on the installed Home Assistant Core version and defer cross-Core upgrade evaluation until choosing to check upgrades. DEC-023 therefore limits the current compatibility claim to exactly Core 2026.8.3. It does not mark an upgrade test passed and does not claim compatibility with another Core version.

This gate authorizes later Phase 1 work only after both independent reviewers approve the committed candidate. It does not deliver a real provider adapter, provider setup UI, entity discovery, panel chat, workflow engine, model tool access, Home Assistant action executor, cloud route, or HACS installation/update support.

## Dependency readiness

| Dependency | Recorded evidence | Current-version disposition |
|---|---|---|
| FND-007 live facts and owner policies | `docs/EVIDENCE-REGISTER.md`; redacted Home Assistant, LM Studio, backup, network, privacy, and retention evidence | Complete for the current Phase 0 boundary; drifting facts have named revalidation points |
| FND-011 panel and compatibility boundary | `docs/evidence/2026-08-23-fnd-011-panel-lifecycle.md`; DEC-023 | Complete for exactly Core 2026.8.3; cross-Core survival remains deferred and unclaimed |
| FND-012 restricted workflow lifecycle | `docs/evidence/manifests/FND-012/FND-012-WORKFLOW-LIFECYCLE-001.json` | Complete; the action-free probe survived the recorded same-version reload/restart scenarios |
| FND-013 data-flow/control/test traceability | `docs/evidence/manifests/FND-013/FND-013-DATA-FLOW-TRACEABILITY-001.json` | Complete; all product requirements remain planned rather than falsely delivered |
| FND-014 evidence and fixture conventions | `docs/evidence/manifests/FND-014/FND-014-FIXTURE-HARNESS-001.json` | Complete |
| FND-015 integration/panel skeleton | `docs/evidence/manifests/FND-015/FND-015-FOUNDATION-SKELETON-001.json` | Complete; provider-neutral foundation only |

## Current candidate verification

The following checks were run from clean committed decision revision `4a944e4d41bc42bdb1f0f112b211e9ed981edb15`. The formal acceptance candidate will point to the later committed artifact revision containing this evidence and manifest.

| Check | Observed result |
|---|---|
| `uv sync --frozen` | Passed; 153 locked packages checked |
| `uv run python scripts/run_pure_tests.py` | 88 passed; five known dependency deprecation warnings |
| `npm run check` in `frontend/` | Script syntax, lint, typecheck, 29 browser tests, production build, synchronization, and bundle identity passed |
| Frontend bundle verification | One self-contained byte-identical 51,573-byte bundle; no unresolved import or source-map reference |
| Evidence/traceability suite with Home Assistant plugin autoload disabled | 23 passed |
| `uv run ruff format --check .` | 58 files already formatted |
| `uv run ruff check .` | Passed |
| `uv run python scripts/canary_scan.py` | Passed with no findings |
| `npm audit --audit-level=high` | Passed; zero vulnerabilities reported |
| Targeted sensitive-pattern scan of the scope-decision files | Zero matches |
| `git diff --check` and post-build working-tree check | Passed; the build produced no repository diff |

The Windows pure runner deliberately excludes the Home Assistant pytest plugin because that dependency imports `fcntl`. A fresh independent clean-source Linux full-suite run remains required before FND-010 acceptance.

## Known limitations and future gates

- Cross-Core upgrade, migration, and rollback behavior is unverified. Reopen FND-011 before claiming compatibility with any Core version other than 2026.8.3.
- The exact processor architecture remains unknown because the current skeleton is architecture-independent. It must be resolved before the first architecture-sensitive dependency decision.
- The approved isolated backup-restore exercise remains due by 2027-02-23 or earlier after a major backup or migration change. It is not replaced by this repository gate.
- Real provider behavior must be revalidated during LOC-003. Prior authenticated connectivity proves the current network path, not the unimplemented adapter.
- Phase 1 product behavior remains absent until LOC-001 through LOC-006 are implemented and LOC-007 passes.
- Manual copy remains the supported private development installation path. HACS support is not claimed.

## Acceptance status

Artifact revision `2af1077ecca4c894938efeddc0364aba5c7ca126` contains this readiness record and its incomplete manifest. The local current-version checks pass, but FND-010 remains in review until the clean metadata candidate receives independent workflow/safety and test/release approval. LOC-001 must not begin before that closeout.
