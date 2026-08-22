# Architecture decision records

ADRs preserve decisions, evidence, consequences, and remaining validation gates. An accepted architectural direction can still contain a specifically named implementation mechanism that remains provisional.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-native-custom-integration-and-panel.md) | Native custom integration and bundled panel | Accepted; registration mechanism provisional |
| [0002](0002-deterministic-workflow-runtime.md) | Bounded deterministic workflow runtime | Accepted; initial trigger set provisional |
| [0003](0003-provider-contract-and-routing.md) | Normalized providers, live capability probes, explicit routing | Accepted; Bedrock transport provisional |
| [0004](0004-least-privilege-tools-and-actions.md) | Per-request least-privilege tools and HA-only side effects | Accepted |
| [0005](0005-provider-and-workflow-storage.md) | Config entries for providers and versioned repository for workflows | Accepted concept; storage implementation provisional |
| [0006](0006-native-ai-surfaces-and-compatibility.md) | Conversation/AI Task entities with isolated compatibility boundaries | Accepted; minimum HA version provisional |

Status meanings:

- **Accepted:** project direction approved.
- **Provisional:** evidence is required before selecting or shipping the named mechanism.
- **Superseded:** retained for history but replaced by a newer ADR.
