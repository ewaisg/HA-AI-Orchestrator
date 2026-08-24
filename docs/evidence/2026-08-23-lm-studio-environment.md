# LM Studio environment evidence — 2026-08-23

## Scope and handling

This record captures local inspection, two synthetic capability probes, and a redacted authenticated Home Assistant-origin connectivity test for `FND-007` / `ENV-003`. No Home Assistant entity, household data, credential, private hostname, LAN address, or owner prompt was sent to the model or written here. The probes did not execute a tool or load/unload a model. The owner enabled LM Studio authentication, created a restricted token, stored it as a Home Assistant secret, and authorized the two existing synthetic `rest_command` definitions to use that secret.

## Observed local environment

| Evidence ID | Observed result | Method |
|---|---|---|
| LM-LIVE-001 | LM Studio desktop version `0.4.21+2` (`0.4.21.0` product version) was running | Local process/file metadata |
| LM-LIVE-002 | The local inference backend was the LM Studio-bundled llama.cpp CUDA/AVX2 backend | Local process path; host-specific path withheld |
| LM-LIVE-003 | LM Studio was listening on TCP port `1234` on all IPv4 interfaces, not only loopback | Local TCP listener inspection |
| LM-LIVE-004 | An unauthenticated `GET /v1/models` request over local plain HTTP returned `200` | Local loopback request; proves API authentication was disabled at observation time |
| LM-LIVE-005 | `GET /api/v0/models` returned nine available models and one loaded model | Local loopback request |
| LM-LIVE-006 | The loaded model was `mistralai/ministral-3-14b-reasoning`, GGUF `Q4_K_M`, with an active context length of `8192` and a reported maximum context length of `262144` | Local `/api/v0/models` response |
| LM-LIVE-007 | LM Studio reported `tool_use` for the loaded model | Local `/api/v0/models` response |
| LM-LIVE-008 | Windows Firewall was enabled with default inbound blocking on Domain, Private, and Public profiles, but two enabled `lm studio.exe` inbound allow rules covered TCP and UDP, any local/remote port, any local/remote IP, and both Private and Public profiles | Read-only `netsh advfirewall` profile and exact named-rule reports; no network name or address retained |
| LM-LIVE-009 | The live Server Settings popover showed Require Authentication off, zero active API keys, Serve on Local Network on, Allow per-request MCPs on, calling servers from `mcp.json` off, CORS off, just-in-time model loading on, automatic unload on, a 60-minute idle TTL, and keep-only-last-JIT-model on | Read-only LM Studio UI inspection; no setting or token manager was changed or opened |
| LM-LIVE-010 | After the owner completed the security handoff, an unauthenticated loopback `GET /v1/models` returned `401`. The new permission token's visible policy denied both per-request remote MCP servers and calling servers from `mcp.json` | Redacted local HTTP negative test plus read-only LM Studio UI verification; token value deliberately not recorded or reused |
| LM-LIVE-011 | Both existing Home Assistant LM Studio `rest_command` definitions were saved with `Authorization: !secret lmstudio_authorization`; the owner reported that Home Assistant's configuration check and the scoped RESTful Command reload both completed without error | Live Home Assistant File Editor and YAML tools; secret value, endpoint, and private identifiers withheld |
| LM-LIVE-012 | Home Assistant executed the existing synthetic `rest_command.lmstudio_test` over the LAN and received HTTP `200` from `mistralai/ministral-3-14b-reasoning`. The assistant content was `Local AI connection established successfully.` and usage reported 20 prompt tokens, 7 completion tokens, and 27 total tokens | Owner-supplied Home Assistant Actions response; unique response ID, timestamp, headers, endpoint, and credential omitted |
| LM-LIVE-013 | After LM-LIVE-012, Home Assistant log searches returned `No issues found` for both `ai_orchestrator` and `rest_command`; the AI Orchestrator Home panel still loaded and displayed `None contacted` | Live Home Assistant logs and panel inspection |
| LM-LIVE-014 | An isolated temporary Home Assistant `rest_command` used an intentionally invalid, non-secret credential against the same endpoint. LM Studio returned HTTP `401`, error type `invalid_request_error`, and code `invalid_api_key`; its message masked the submitted test value | Owner-supplied Home Assistant Actions response; temporary command, private endpoint, unique response metadata, and complete submitted test value omitted |
| LM-LIVE-015 | The temporary command was removed. The saved configuration was verified to contain exactly `lmstudio_test` and `lmstudio_chat`, two secret-backed authorization headers, two endpoint lines, no negative-probe command, and no placeholder. The owner then reran `lmstudio_test` and received HTTP `200` with the same model, completion text, and 20/7/27 usage. The panel remained healthy with `None contacted`; `ai_orchestrator` still had no scoped log issue | Live File Editor, owner-supplied Actions response, scoped log review, and live panel inspection |
| LM-LIVE-016 | Effective Windows Firewall reinspection found exactly two LM Studio inbound rules. The enabled TCP allow rule is scoped to the Private profile, local port `1234`, one remote source address, and blocked edge traversal. The UDP rule is disabled | Read-only local firewall rule, port-filter, and address-filter inspection; program path, rule identifiers, network name, and private source address withheld |
| LM-LIVE-017 | After LM-LIVE-016, Home Assistant reran `rest_command.lmstudio_test` and received HTTP `200` with the same model, completion text, and 20/7/27 usage | Owner-supplied Home Assistant Actions response; unique response ID, timestamp, headers, endpoint, and credential omitted |

The complete model inventory is intentionally unnecessary for the first adapter. The loaded model identifier above is recorded because it was actually probed; it is not a promise that the same model will remain loaded after restart.

## Synthetic capability probes

Both probes used `POST /v1/chat/completions` through loopback with temperature `0` and no private data.

| Evidence ID | Probe | Actual result |
|---|---|---|
| LM-PROBE-001 | Strict JSON-schema response with exactly `category` and `value` fields; synthetic input token `BLUE` | Request succeeded; `finish_reason` was `stop`; response was valid JSON with exactly the required keys, `category: color`, and `value: BLUE` |
| LM-PROBE-002 | Required call to a synthetic function named `lookup_test_value` with only `key: alpha` allowed | Request succeeded; `finish_reason` was `tool_calls`; exactly one call named `lookup_test_value` was returned; arguments parsed as `{"key":"alpha"}`; answer content was empty; the tool was not executed |

These results prove the observed loaded model/server combination can produce the two protocol shapes under these bounded prompts. They do not prove general model reliability, safe action selection, streaming behavior, performance under load, or compatibility after a model/server change.

## Official contract checked

- LM Studio documents OpenAI-compatible `GET /v1/models` and `POST /v1/chat/completions`: <https://lmstudio.ai/docs/developer/openai-compat>
- LM Studio documents its default local server and optional API-token authentication: <https://lmstudio.ai/docs/developer/rest/quickstart>
- LM Studio documents the server authentication toggle and Bearer-token requirement: <https://lmstudio.ai/docs/developer/core/authentication>
- LM Studio documents the richer `/api/v0/models` inspection endpoint: <https://lmstudio.ai/docs/developer/rest/endpoints>
- LM Studio documents JSON-schema structured output for `/v1/chat/completions`: <https://beta.lmstudio.ai/docs/developer/openai-compat/structured-output>
- LM Studio documents OpenAI-style tool requests and makes clear that the client, not LM Studio, executes requested tools: <https://lmstudio.ai/docs/developer/openai-compat/tools>
- Home Assistant documents secret-backed headers for `rest_command`: <https://www.home-assistant.io/integrations/rest_command/>

## Security disposition

The original combination of an all-interface listener, plain HTTP, no API token, enabled per-request MCPs, and broad LM Studio application allow rules was not accepted as the final product connection posture. LM-LIVE-010 proves application-layer authentication rejects a missing token and the created token denies both MCP permission classes. LM-LIVE-011 through LM-LIVE-015 prove current positive and invalid-credential Home Assistant-origin behavior. LM-LIVE-016 proves the former broad firewall posture was replaced by an enabled Private-only TCP `1234` rule restricted to one remote source with blocked edge traversal, while the UDP rule is disabled. LM-LIVE-017 proves Home Assistant still reaches LM Studio after that restriction. The project must not publish port `1234` to the internet or make OpenVPN a runtime dependency.

Completed owner security steps:

1. LM Studio authentication is enabled and missing-token rejection is verified.
2. The created token denies both provider-side MCP permission classes required by DEC-012.
3. The token is stored under a secret key in Home Assistant; its value is excluded from this record.
4. Both existing Home Assistant LM Studio REST commands use the secret-backed authorization header, and the saved YAML loaded without a reported error.
5. A synthetic Home Assistant-origin authenticated request returned HTTP `200`; both scoped log searches remained clear and the AI Orchestrator foundation panel remained healthy.
6. An isolated Home Assistant-origin invalid-credential request returned HTTP `401` with `invalid_api_key`; the valid secret was not overwritten or exposed.
7. The saved file no longer contains the temporary negative command and again contains the intended two commands. A later positive request returned HTTP `200` and the foundation panel remained healthy.
8. The effective host firewall is restricted to Private-profile TCP `1234` from one remote source; edge traversal is blocked, UDP is disabled, and the Home Assistant test still returns HTTP `200` afterward.

Current network/authentication precondition disposition:

1. The Phase 0 live authentication, positive/negative Home Assistant transport, provider-side MCP-denial, and host-firewall evidence required by `ENV-003` is complete for the observed setup.
2. `LOC-003` still requires implementation and adapter-level contract, secret-handling, timeout, normalized-error, redirect/SSRF, unload/reload, and live revalidation tests. The evidence here does not mark that future implementation task done.

Authentication is enabled and both existing Home Assistant `rest_command` definitions now use the secret-backed header. LM-LIVE-012 through LM-LIVE-015 prove current positive and invalid-credential Home Assistant-origin transport behavior plus cleanup restoration; they do not substitute for adapter-level secret handling or timeout behavior. Firewall narrowing and post-change reachability are separately evidenced by LM-LIVE-016 and LM-LIVE-017.

During cleanup, an endpoint placeholder was briefly saved and tested, and `lmstudio_chat` was invoked once without its required `system_prompt` and `prompt` inputs. Home Assistant Actions reported those operator-test errors. The scoped RESTful Command log retained the placeholder errors and intentional `401`. The final saved configuration contains no placeholder, and the later positive `200` occurred after those errors. The retained historical log entries are not represented as a clean log or as failures of the final positive request.

The exact Home Assistant LAN source address was observed in its Network page on 2026-08-23 and is deliberately withheld from this public repository. It is available only for the owner's local firewall configuration.

## Remaining unknowns

- Whether the LM Studio server and loaded model automatically recover after host or application restart.
- Real timeout, cancellation, streaming, and concurrent-request behavior.
- Performance and reliability thresholds for the selected workflow classes.
- Router/VLAN policy and backup/restore readiness tracked under `ENV-010`.

These unknowns remain assigned to `LOC-003`, `LOC-007`, and the open part of `FND-007`; none is represented as passed.

## Repository-update verification

| Check | Result |
|---|---|
| Structured-output synthetic probe | Passed with valid exact-key JSON; see LM-PROBE-001 |
| No-execution tool-call synthetic probe | Passed with one valid requested tool call and no execution; see LM-PROBE-002 |
| Home Assistant configuration check and RESTful Command reload | Project owner reported both completed without error after the secret-backed headers were saved |
| Authenticated Home Assistant-origin synthetic request | HTTP `200`; see LM-LIVE-012 |
| Post-request Home Assistant health | `ai_orchestrator` and `rest_command` log searches both returned `No issues found`; panel Home remained healthy with the expected foundation value `None contacted` |
| Isolated invalid-credential Home Assistant-origin request | HTTP `401` with `invalid_api_key`; see LM-LIVE-014 |
| Cleanup restoration | Temporary command and placeholder absent; intended two commands and two secret-backed headers present; final `lmstudio_test` returned HTTP `200`; see LM-LIVE-015 |
| Final scoped log interpretation | `ai_orchestrator` returned `No issues found`; `rest_command` retained the intentional `401` and intervening operator-test errors, with no later error after the final positive request |
| Effective firewall reinspection | Enabled TCP allow is Private-only, local port `1234`, one remote source, and edge traversal blocked; UDP rule disabled; see LM-LIVE-016 |
| Post-firewall Home Assistant request | HTTP `200`; see LM-LIVE-017 |
| `git diff --check` | Passed; only expected Windows line-ending notices were emitted |
| `uv run python scripts/canary_scan.py` | Passed with no findings |
| `uv run python scripts/run_pure_tests.py` | `81 passed`, with five dependency deprecation warnings |
| Sensitive-value review of the repository | No custom domain, observed private address range, LM Studio token prefix/value, Bearer credential, unique chat-completion ID, or unredacted credential-bearing RTSP URL retained |
| Independent workflow/safety review | Approved the current authentication, cleanup, and effective-firewall documentation with no blocking findings; confirmed the bounded ENV-003 resolution, redaction, and retained blockers |

An initial unqualified `python scripts/run_pure_tests.py` attempt did not start the suite because the workstation's default Python interpreter did not have `pytest`. The documented project environment command above was then used successfully; the failed environment lookup is not represented as a test failure or a passing check.
