# WFL-002A offline workflow preview

Date: 2026-09-09. Status: DONE for the bounded offline command/evaluator.
This does not complete WFL-002 listener lifecycle, WFL-006 full dry run or LOC-007.

## Scope and ownership

Primary claimed WFL-002A before implementation and owned scripts/preview_workflow.py,
tests/quality/test_workflow_preview_cli.py, synthetic fixtures under
tests/fixtures/workflows and user/evidence docs. Backend subagent owned
workflow_preview.py and test_workflow_preview.py. Independent reviewer inspected
both paths, reran focused tests and approved the offline boundary with no remaining
findings. Existing unrelated providers-view.ts changes were left untouched.

The evaluator validates the schema and snapshot, combines trigger matches with
OR and conditions with AND, handles midnight windows and finite exclusive
numeric limits, and returns static outcomes plus planned step kinds. Disabled
drafts can be previewed without activation. No provider, HA listener, persistent
storage or action executor is available to it. The CLI reads bounded local JSON
and returns static redacted invalid-input errors; it bypasses HA initialization.

## Real verification

| Check | Result |
|---|---|
| Evaluator focused suite | 70 passed |
| Independent evaluator plus CLI focused run | 82 passed |
| uv run python scripts/run_pure_tests.py | 388 passed, 5 dependency deprecation warnings |
| Full WSL Core 2026.9.0 python -m pytest -q | 537 passed in 4.99s |
| Full WSL Core 2026.8.3 python -m pytest -q | 537 passed in 5.83s |
| uv run ruff check . | All checks passed |
| Ruff format check on four new Python files | 4 already formatted |
| uv run python scripts/canary_scan.py | Exit 0, no findings |
| git diff --check | Exit 0; line-ending notices only |

Ignored logs and sample outputs: artifacts/workflow-preview-2026-09-09/.
Linux runs used the prior isolated candidate-loc009-20260909 source directory
with the new evaluator, CLI, tests and synthetic fixtures copied in, and the
persistent venv-202690 / venv-202683 environments. No frontend behavior changed
in this task, and no frontend build/deployment is claimed.

The CLI tests run child Python with -S, proving these examples do not require
installed site packages or HA initialization. Independent reviewer additionally
checked 27 malformed kind cases and observed no homeassistant/aiohttp/requests
imports. A test portability defect from an oversized generated pytest case ID
was fixed with short explicit IDs and the suite rerun successfully.

Reviewed SHA-256: evaluator
91467816a3e192147214361837087de01bcd7f57556ae8373fb5dc0604d69886;
CLI f777470ae95e5c99b9c69057dafbe72a0dd2e45dbb62c70e200d0e7b8b1b9ba7.

## End-to-end examples

Both real commands used `uv run python scripts/preview_workflow.py --workflow
 tests/fixtures/workflows/window-preview.json --snapshot ...` from the repository.
With evening-open.json, the event matches, both conditions pass, eligible is true
and compose/notify are planned. With daytime-open.json, the time condition reports
outside_time_window, eligible is false and planned_steps is empty. Both return
provider_calls=0 and actions_executed=0. These are synthetic scenarios, not live
household facts or notification delivery evidence.

## Resume

The runnable guide is docs/OFFLINE-WORKFLOW-PREVIEW.md. The next production gate
remains LOC-007 and its named remaining acceptance. WFL-002 still needs actual
HA trigger binding, cancellation, duplicate registration and restart coverage;
this pure evaluator can then be reused behind that boundary. No production
activation, service discovery, state authorization or live action was performed.
