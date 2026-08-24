# LOC-002 provider contract version 1 evidence — 2026-08-24

## Scope

LOC-002 defines the provider-neutral contract that later configuration entries and live adapters must implement. The contract covers explicit connection/authentication success, model discovery, health, generation, streaming, tool continuation, normalized usage, capability records, cancellation, and normalized errors.

This task does not implement an LM Studio transport, store a provider URL or credential, contact a network service, execute a tool, call a Home Assistant action, implement routing/failover, or claim that any live model supports an untested capability. Provider-specific transport remains LOC-003. Configuration-entry lifecycle remains LOC-001.

## Implemented boundary

- Contract version `1` is exported by the provider-neutral package.
- Capability records explicitly represent text generation, model discovery, streaming, structured output, tool calling, and usage as `supported`, `unsupported`, or `unknown`.
- Validation success requires both reachability and authentication. Every failure uses the normalized error channel.
- Discovered model records carry only provider-supplied identity and display name; they do not imply model capabilities.
- Health success is `healthy` or `degraded`; unavailable and authentication states are normalized failures for the caller to present.
- Usage, stream sequences, tool identities, retry hints, model identities, duplicate model records, and duplicate tool-call IDs are fail-closed at construction or fixture parsing.
- Assistant tool calls and tool-result messages preserve the exact provider-neutral call ID. A continuation rejects missing, duplicate, or unknown correlations, including multi-call histories.
- Tool parameters and structured output use a deliberately small closed schema dialect. Unknown schema keywords, extra fields, missing fields, wrong types, invalid arguments, unrequested structured output, and calls to unexposed tools fail closed.
- Normalized error text is selected from a fixed safe mapping by error category. Raw provider error text, including secret-bearing text, cannot enter `NormalizedError`.
- Typed tool definitions, provider-requested tool calls, correlated tool-result continuation, and structured output are data only. The provider contract has no executor, and the fake provider performs no tool or Home Assistant action.
- The fake provider remains one-shot, manually clocked, synthetic, exact-match, and zero-network.

## Synthetic fixture catalogue

Nineteen committed reviewed fixtures cover validation success, model discovery, health, unknown capabilities, text and empty success, structured output, streaming success/cancellation/interruption/invalid terminal normalization, single and multiple typed tool calls, correlated tool-result continuation, authentication failure, rate limiting with retry hint, timeout, malformed response, and request cancellation. Parameterized synthetic cases additionally cover chunk boundaries, structured extra/missing/wrong/markdown/refusal outcomes, missing/duplicate/invalid/unknown/unsupported tool calls, the normalized error taxonomy, usage present/absent/provider-specific rejection, capability absence/contradiction/drift, unsafe error text, and prompt-injection text remaining untrusted data. Fixtures contain no live provider endpoint, credential, account, household identifier, entity ID, or live model ID.

## Verification status

Local provider-focused tests passed before evidence finalization. The broader gate then correctly failed because this evidence path did not yet exist and the intentionally changed traceability files no longer matched their FND-013 recorded hashes. Those bookkeeping failures are retained here as part of the work history; they are not reported as passing. The hashes were refreshed to the new reviewed traceability bytes, and all final commands must be rerun from the committed candidate before acceptance.

After those corrections, the working-tree checks produced:

| Check | Observed result |
|---|---|
| Provider/security/evidence/traceability suite with plugin autoload disabled | 120 passed; five known dependency deprecation warnings |
| Pure test runner | 120 passed; the same five known dependency deprecation warnings |
| Ruff format | 60 files already formatted |
| Ruff lint | Passed |
| Canary scan | Passed with no findings |
| `git diff --check` | Passed |

Artifact revision `755935eded9180ad4649eec0f2060af2958b3f4e` reproduced the same Ruff, 120 focused/pure, canary, traceability, manifest-schema, diff, and clean-worktree results. Candidate `e8a5acd2a99c8cb446e924bd75e8dccf9fc202a1` was then rejected by independent workflow/safety review at `2026-08-24T07:06:43Z` for two P1 findings: tool-result continuation did not preserve the original structured call ID, and traceability falsely marked the every-adapter control/test verified from only the fake suite.

The current working remediation preserves and validates call IDs, adds the closed schema and fixed safe-error boundaries, expands the synthetic common cases, and returns `CTRL-PROVIDER-001` to `design_only` and `TEST-PROVIDER-CONTRACT` to `planned`. A passing historical candidate is not inferred; all gates and independent reviews must run again on a new committed candidate.

The remediated working tree passed 130 provider tests and 160 focused/pure tests, with the same five known dependency deprecation warnings. Ruff format reported 60 files formatted, Ruff lint passed, the canary scan had no findings, and `git diff --check` passed. Remediated artifact `9b5bd56667c27564244b456b7416ca125845db4e` reproduced 160 focused/pure tests, Ruff, canary, diff, and clean-worktree gates from the exact commit.

## Residual gates

- Every live provider adapter must run the provider-neutral cases plus adapter-specific transport, authentication, endpoint, timeout, cancellation, raw-response normalization, and redaction tests. `TEST-PROVIDER-CONTRACT` remains planned until every implemented adapter passes; this task does not claim that every-adapter gate.
- LOC-003 must revalidate the already observed LM Studio environment through the implemented backend adapter. This synthetic task does not reuse or disclose the live token, URL, model identifier, or response.
- Provider-side MCP remains excluded from version 1.
- The contract does not authorize any Home Assistant action. Workflow tool allowlists, confirmations, action policy, and deterministic life-safety behavior remain later safety tasks.

## Acceptance status

`IN REVIEW` after rejected candidate `e8a5acd2a99c8cb446e924bd75e8dccf9fc202a1`. Remediated artifact `9b5bd56667c27564244b456b7416ca125845db4e` passes its committed local gates. Commit the replacement metadata candidate, then obtain fresh workflow/safety and test/release approvals before LOC-002 can be `DONE`.
