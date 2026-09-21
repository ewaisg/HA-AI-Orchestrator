# WFL-005 structured workflow draft generation

Live r15 evidence supplied by the primary agent: a selected-window/Fold8Ultra draft failed with the static diagnostic that the provider did not return valid JSON. Previous draft requests asked for JSON in prose but did not set the provider contract's output schema.

The draft API now requests `StructuredOutputDefinition("workflow_draft", ...)`. The new provider-neutral `workflow_draft_schema.py` uses only the existing contract's supported closed objects, arrays, primitive types, and enums. Entity and notification references are restricted to the selected values; unselected kinds/properties are absent when no corresponding references are selected.

The existing contract has no union or length/count keywords. Variant fields are therefore optional in the transport schema. The unchanged strict workflow parser remains authoritative for per-kind fields, required values, bounds, branch order and semantics. The API still validates selected references and compose-before-notify, then independently checks the generation contract. Normalized structured output is required: valid text alone is refused, with no retry or text fallback. Immutable output is serialized with a character bound before parsing. Provider failures and diagnostics remain static and contain no output text.

After generation the API obtains the current Home Assistant user and requires an active administrator, then checks provider/foundation/source/reference identity again before returning data. No await occurs between these final checks and returning the new disabled unsaved workflow. Existing save, dry-run receipt and activation gates remain separate.

## Verification

Core 2026.9.3 isolated environment:

```sh
python -m pytest tests/home_assistant/test_workflow_draft_api.py tests/test_workflow_draft_schema.py tests/providers/test_lm_studio.py -q
```

**159 passed in 8.41 seconds:** 83 draft API cases, 12 transport schema cases, and 64 LM Studio adapter cases. New tests include actual adapter request/response handling against mocked HTTP, strict JSON-schema request formatting, invalid JSON without fallback/retry, no service calls or storage changes, omitted structured results, wrong-variant rejection, closed authority/reference limits, schema immutability, and removed/inactive/demoted users.

An initial test run had two fixture failures because the storage snapshot preceded WebSocket/HTTP setup; moving the snapshot after connection setup fixed the assertions without changing product code.

Ruff check passed; all four owned Python files are formatted; owned tracked diff whitespace check passed. Independent root review and an exact frozen release gate are pending. The selected live model's support for this optional-field transport schema remains unproven until installation and a live generation attempt. No live model request or HA device action was performed by this subagent.

Independent review subsequently approved by the primary agent: **159 passed in 8.35 seconds**, no changes requested. Review evidence: `docs/evidence/2026-09-20-structured-draft-independent-review.md`. Exact release and live acceptance gates remain pending.
