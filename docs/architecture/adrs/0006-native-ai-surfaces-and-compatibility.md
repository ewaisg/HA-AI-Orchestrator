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

## 2026-08-24 scope clarification

The owner selected exactly Home Assistant Core 2026.8.3 as the only current MVP compatibility claim. The observed same-version installation, panel, reload, restart, cache, mobile, fallback, and removal/reinstallation results define that narrow boundary. Survival across a Core version change remains unverified and must be reopened before the project claims support for another Core version; it is not a gate for continuing the owner-approved current-version MVP.
