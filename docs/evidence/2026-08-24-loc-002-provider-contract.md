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
- Usage, stream sequences, tool identities, retry hints, model identities, and duplicate model records are fail-closed at construction or fixture parsing.
- Typed tool definitions, provider-requested tool calls, and tool-result continuation are data only. The provider contract has no executor, and the fake provider performs no tool or Home Assistant action.
- The fake provider remains one-shot, manually clocked, synthetic, exact-match, and zero-network.

## Synthetic fixture catalogue

Fourteen reviewed fixtures cover validation success, model discovery, health, unknown capabilities, text and empty success, streaming with usage, a typed tool call, tool-result continuation, authentication failure, rate limiting with retry hint, timeout, malformed response, and cancellation. Fixtures contain no live provider endpoint, credential, account, household identifier, entity ID, or live model ID.

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

Artifact revision `755935eded9180ad4649eec0f2060af2958b3f4e` reproduced the same Ruff, 120 focused/pure, canary, traceability, manifest-schema, diff, and clean-worktree results. A clean Linux full suite and independent reviews remain required.

## Residual gates

- Every live provider adapter must run the common contract suite plus adapter-specific transport, authentication, endpoint, cancellation, timeout, and redaction tests.
- LOC-003 must revalidate the already observed LM Studio environment through the implemented backend adapter. This synthetic task does not reuse or disclose the live token, URL, model identifier, or response.
- Provider-side MCP remains excluded from version 1.
- The contract does not authorize any Home Assistant action. Workflow tool allowlists, confirmations, action policy, and deterministic life-safety behavior remain later safety tasks.

## Acceptance status

`IN REVIEW`. Artifact revision `755935eded9180ad4649eec0f2060af2958b3f4e` is committed and locally reproduced. The metadata candidate, clean Linux full-suite result, and independent provider/safety and test/release approvals are still required before LOC-002 can be `DONE`.
