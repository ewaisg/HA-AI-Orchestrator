# ADR-0006: Native AI surfaces and compatibility boundaries

Date: 2026-08-22
Status: Accepted; minimum Home Assistant version provisional

## Context

Home Assistant provides current documented `ConversationEntity`, `ChatLog`, Assist LLM APIs, and `AITaskEntity`, but these APIs and frontend behavior evolve with monthly releases.

## Decision

- Use `ConversationEntity` and `ChatLog` for chat/Assist.
- Use `AITaskEntity.GENERATE_DATA` for native compose/classify/extract integration after schema conversion is proven.
- Preserve the initiating Home Assistant `Context` through permitted actions.
- Build a self-contained custom-element frontend.
- Isolate panel registration, storage, frontend pickers, and version-sensitive lifecycle behavior in compatibility modules.
- Claim compatibility only for exact Home Assistant versions tested.

## Consequences

The minimum version and supported matrix are not selected until the user's current environment is captured. Every claimed version must pass clean install, upgrade, panel, chat, workflow, reload/restart, registry, diagnostics, and removal checks.
