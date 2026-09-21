# Independent structured workflow draft review

Primary independently inspected the provider-neutral closed transport schema, conditional reference enums, generated request, bounded encoding of immutable normalized output, strict workflow parser and final provider-contract validation. There is no text fallback, retry, save, enable or tool executor. Fresh active-administrator authorization is checked after the provider returns and before exposing a draft, followed by the current provider/source/reference guards.

Independent Core 2026.9.3 rerun: `pytest tests/home_assistant/test_workflow_draft_api.py tests/test_workflow_draft_schema.py tests/providers/test_lm_studio.py -q` returned **159 passed in 8.35s**, exit 0. It includes strict response-format transport integration, invalid JSON without retry, selected references, source changes, removed/inactive/demoted users and zero side effects.

Review approved for the next frozen release gate. Live model support for this nested schema is not established by mocked HTTP tests; r15 still fails its text-only draft path with invalid JSON. Live acceptance remains WFL-005.
