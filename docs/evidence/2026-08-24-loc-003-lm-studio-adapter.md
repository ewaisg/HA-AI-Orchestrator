# LOC-003 authenticated LM Studio adapter evidence — 2026-08-24

## Scope

LOC-003 adds the first live-capable provider behind the accepted provider and config-entry contracts. The adapter is registered as `lm_studio`, reuses Home Assistant's shared `aiohttp` session, and accepts only administrator-entered OpenAI-compatible API base URL, API token value, and exact model identifier. No private endpoint, credential, or model is committed.

This implementation does not add provider setup to the custom panel, streaming, provider-side MCP, cloud failover, Home Assistant entity access, tool execution, workflow execution, or any Home Assistant action. Panel setup remains LOC-004. Streaming and all unproven model features report unknown or unsupported until separately implemented and evidenced.

## Official contract checked

- Home Assistant recommends injecting its shared web session into HTTP integrations: <https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/inject-websession/>
- LM Studio documents optional API-token authentication and the `Authorization: Bearer` request header: <https://lmstudio.ai/docs/developer/core/authentication>
- LM Studio documents OpenAI-compatible `GET /v1/models` and `POST /v1/chat/completions`: <https://lmstudio.ai/docs/developer/openai-compat>
- LM Studio documents model listing behavior: <https://lmstudio.ai/docs/developer/openai-compat/models>
- LM Studio documents chat-completion payloads: <https://lmstudio.ai/docs/developer/openai-compat/chat-completions>
- LM Studio documents JSON-schema structured output: <https://lmstudio.ai/docs/developer/openai-compat/structured-output>
- LM Studio documents that models request tool calls and client code performs any execution: <https://lmstudio.ai/docs/developer/openai-compat/tools>

## Implemented boundaries

- The form never receives stored configuration. Setup and reconfiguration require all three fields; reauthentication accepts only a replacement token and preserves the already stored base URL and model ID.
- Password selectors mask token entry. Provider and validated-config representations exclude the token. The adapter adds the Bearer scheme at request time and rejects an input that already contains an authorization scheme.
- The base URL accepts only an RFC 1918 IPv4 or unique-local IPv6 literal over HTTP or HTTPS, with no hostname resolution, loopback, link-local/metadata, public address, user information, query, fragment, or path beyond the API root. This matches the observed same-private-subnet LM Studio deployment and prevents the provider form from becoming a general SSRF client. It canonicalizes the root to `/v1`. Requests append only `/models` or `/chat/completions` and set `allow_redirects=False`, so credentials cannot follow a provider redirect.
- Requests use Home Assistant's shared session, a fixed 60-second timeout, and a 2 MiB response limit. Cancellation propagates. The provider never closes the shared session; unload drops only entry-local provider runtime.
- HTTP status, timeout, connection, DNS, and TLS failures map to fixed provider-neutral codes and safe messages. Provider response bodies and exception text do not cross the boundary.
- JSON parsing rejects invalid encoding, nonfinite values, duplicate keys, non-object envelopes, malformed catalogs, duplicate model IDs, malformed usage, invalid tool calls, and malformed structured output.
- Connection validation requires authenticated model listing and the configured exact model ID to be present. Model discovery is the only capability marked supported by implementation. Other model features remain unknown even though bounded generation code exists.
- Chat requests are non-streaming. Returned text, optional usage, structured JSON, and tool-call requests are normalized and revalidated against the common contract. Tool calls are returned as data only; nothing executes them.

## Working-tree verification

| Check | Observed result |
|---|---|
| LM Studio adapter-focused synthetic suite | 54 passed; five known upstream dependency deprecations |
| Provider/security/quality suite | 222 passed; the same five warnings |
| Pure test runner | 222 passed; the same five warnings |
| Core 2026.8.3 Linux config-flow/setup focused suite before the final unload assertion | 56 passed |
| Ruff format and lint | Passed |
| Canary scan | Passed with no findings |
| `git diff --check` | Passed; Windows line-ending notices only |

The earlier mounted-worktree full Linux run reached its final security scan but was interrupted after the scanner traversed the bind-mounted ignored Windows virtual environment. That attempt is not a passed full gate. The same run had already completed the Home Assistant and provider tests; a subsequent focused Linux run passed 56 tests. The immutable Git-archive run will not contain the ignored virtual environment and remains required.

Immutable synthetic artifact `598a3259de25e9f1060a4b670a2b13dace4808ca` was reconstructed from a Git archive in clean Linux with Python `3.14.5`, Home Assistant `2026.8.3`, and pytest Home Assistant plugin `0.13.357`. It passed 315 full tests, 72 focused lifecycle tests, 192 provider tests, 54 LM Studio adapter tests, 30 security/evidence/traceability tests, and 222 pure tests. Ruff format/lint, canary, evidence schema, traceability, diff, and four canonical hashes passed. Five known upstream deprecations remain and no project failure occurred.

## Remaining gates

1. Run the exact committed artifact in clean Linux for the full, adapter-focused, Home Assistant lifecycle, provider/security/quality, pure, Ruff, canary, schema, traceability, diff, and canonical-hash gates.
2. Obtain independent workflow/safety and test/release pre-live reviews of the exact artifact.
3. Push the reviewed bundle and install it on the named Home Assistant Core `2026.8.3` target.
4. Through the integration config flow, enter the owner's existing exact private API base URL, token value without the `Bearer` prefix, and exact currently available model identifier. None may be copied into evidence.
5. Record redacted positive validation, isolated invalid-credential behavior, reload/unload/restart behavior, cancellation/timeout behavior where safely reproducible, panel/foundation health, and scoped logs. Never expose the token or full private endpoint.

## Acceptance status

`IN PROGRESS — PRE-LIVE REVIEW`. Artifact `598a3259de25e9f1060a4b670a2b13dace4808ca` passes its exact-source synthetic gates. No live request from the implemented adapter is claimed. LOC-003 cannot be `DONE` until independent pre-live acceptance and redacted live Home Assistant revalidation both pass.
