# Decision register

This file records product-level decisions. Implementation-sensitive decisions will be expanded into ADR files after specialist review.

## Accepted

| ID | Decision | Rationale | Date |
|---|---|---|---|
| DEC-001 | Build a Home Assistant custom integration with a bundled frontend panel | Gives native config, auth, state, action, registry, and Assist integration | 2026-08-22 |
| DEC-002 | Keep an add-on optional and deferred | Avoid a second runtime until isolation or heavyweight workloads require it | 2026-08-22 |
| DEC-003 | Use Home Assistant as the authoritative state and action runtime | Prevents duplicate device and automation authority | 2026-08-22 |
| DEC-004 | Put constrained AI steps inside deterministic workflows | Makes conditions, permissions, side effects, and failure behavior reviewable | 2026-08-22 |
| DEC-005 | Never expose a generic unrestricted action tool to a model | Limits hallucinated, injected, or over-broad control | 2026-08-22 |
| DEC-006 | Require explicit workflow-level cloud permission and failover | Makes data disclosure visible and intentional | 2026-08-22 |
| DEC-007 | Make the project tracker and recorded evidence the source of truth for progress | Enables safe multi-agent handoff and exact resume points | 2026-08-22 |
| DEC-008 | Use native `ConversationEntity`/`ChatLog` and evaluate `AITaskEntity` for structured tasks | Uses documented Home Assistant AI surfaces instead of inventing a public protocol | 2026-08-22 |
| DEC-009 | Own a small deterministic v1 workflow runtime instead of depending on private native automation internals | Home Assistant does not document a stable third-party contract for its complete editor/runtime | 2026-08-22 |
| DEC-010 | Probe provider/model capabilities rather than infer them from protocol compatibility | HTTP success and API shape do not prove reliable tools, schemas, or streaming | 2026-08-22 |
| DEC-011 | Implement new Azure support as Azure OpenAI v1; treat Foundry project/agent APIs separately | The older Foundry Model Inference `/models` path is retired for new work | 2026-08-22 |
| DEC-012 | Exclude provider-side MCP from v1 | Keeps tools typed, client-side, allowlisted, and auditable in the integration | 2026-08-22 |
| DEC-013 | Use `ai_orchestrator` as the permanent Home Assistant integration domain | The existing architecture already uses this namespace; the internal domain must remain stable even if the visible product name changes | 2026-08-22 |
| DEC-014 | Target exactly Home Assistant Core 2026.8.3 for the Phase 0 skeleton | Matches the inspected host and prevents an unsupported compatibility range from being implied | 2026-08-22 |
| DEC-015 | Keep the Phase 0 runtime architecture-independent and provider-SDK-free | Allows the skeleton to proceed without guessing CPU architecture and defers heavy/provider-specific dependencies to measured spikes | 2026-08-22 |
| DEC-016 | Produce a manual-copy bundle in an HACS-compatible repository layout without claiming HACS support yet | HACS currently documents public GitHub repository access and requires repository/owner metadata and validation evidence the project does not yet have; releases are optional | 2026-08-22 |

## Proposed — requires Phase 0 ADR

| ID | Proposal | Evidence/decision still needed |
|---|---|---|
| ADR-P01 | TypeScript and Lit for the frontend panel | Compatibility spike against the user's HA version |
| ADR-P02 | Versioned Home Assistant `Store` data for workflows | Migration, write-frequency, backup, and size validation |
| ADR-P03 | Direct async HTTP transport for OpenAI-compatible and Azure adapters | Dependency and streaming behavior validation |
| ADR-P04 | AWS SDK transport strategy for Bedrock | Home Assistant dependency footprint and event-loop safety spike |
| ADR-P05 | Curated internal workflow engine instead of editing HA automation YAML | Trigger/action coverage and restart behavior prototype |
| ADR-P06 | Stable registry references plus entity-ID snapshots | Live rename/delete/recreate behavior validation |
| ADR-P07 | Support current HA stable plus one prior stable release | User update cadence and maintenance-cost decision |
| ADR-P08 | Bounded tool loop and default maximum call count | Reliability and latency tests with selected models |

The accepted/provisional ADR records now live in [`docs/architecture/adrs/`](architecture/adrs/README.md). The proposals above remain as finer-grained implementation questions until the applicable spike supplies evidence.

## User policy decisions not yet made

- Which medium- and high-risk Home Assistant actions will ever be eligible for AI control.
- Whether confirmation must occur in chat, Companion notification, or both.
- Default retention for conversation and execution history.
- Which workflows may send selected context to cloud providers.
- Whether Azure and AWS credentials will be static least-privilege credentials or brokered/rotated identities.
