# ADR-0001: Native custom integration and bundled panel

Date: 2026-08-22
Status: Accepted; automatic registration mechanism provisional

## Context

The product needs Home Assistant authentication, registries, actions, Assist, UI setup, and a polished low-YAML experience. A separate Node-RED, AppDaemon, or web application runtime would duplicate authority or configuration.

## Decision

Build the primary product as a Home Assistant custom integration with a self-contained frontend custom-element bundle shown as a full-screen panel. Keep an app/add-on optional and introduce it only after measured isolation, dependency, media, storage, or long-running-work requirements justify it.

## Consequences

- Home Assistant remains authoritative for state and actions.
- The integration owns authenticated WebSocket commands and provider/workflow services.
- The UI is packaged with the integration and uses compatibility adapters around any unstable frontend element.
- We do not depend on Node-RED or AppDaemon for core behavior.

## Validation gate

Official custom-panel documentation demonstrates panels but its public example uses `panel_custom` YAML. Before promising zero YAML, prove integration-owned asset serving, sidebar registration, unload/reload, cache busting, desktop/mobile rendering, and survival across a Home Assistant upgrade on the target version. Isolate any undocumented backend helper and document a fallback.

Evidence: `docs/architecture/HA-PLATFORM-REVIEW.md` sections 4 and “Automatic sidebar-panel registration.”
