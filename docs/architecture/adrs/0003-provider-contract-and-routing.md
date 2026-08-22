# ADR-0003: Provider contract, capability probes, and explicit routing

Date: 2026-08-22
Status: Accepted; Bedrock transport provisional

## Context

OpenAI-compatible protocol shape does not prove model support for streaming, structured output, or reliable tool calls. Azure endpoints and Bedrock models also differ by resource, deployment, region, account access, and capability.

## Decision

All providers implement a versioned internal contract for validation, discovery where available, health, generation, streaming, tool continuation, normalized usage, capability records, and normalized errors.

- LM Studio and compatible endpoints use the OpenAI-compatible adapter and the Home Assistant shared async HTTP session.
- New Azure work uses an `azure_openai_v1` adapter and not the retired Foundry Model Inference `/models` path.
- Bedrock uses Converse/ConverseStream only for configured models that prove support.
- Capabilities are recorded from documentation plus harmless live probes; unknown means unavailable.
- Named routing policies make local/cloud permission and failover explicit.
- Provider-side MCP is excluded from v1.

## Consequences

- No model, deployment, region, endpoint, or capability is fabricated.
- Cloud adapters remain mocked until the user supplies exact account evidence and authorizes a live test.
- AWS signing will not be hand-written.

## Validation gate

Measure an official AWS SDK approach on the target Home Assistant host for install size/time, ARM64 support, memory, event-loop behavior, cancellation, latency, and failures. If it is unsuitable, isolate only Bedrock in an optional broker/add-on.
