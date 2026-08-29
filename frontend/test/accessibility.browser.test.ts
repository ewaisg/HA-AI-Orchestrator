import * as axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import { type AiOrchestratorPanel, PANEL_TAG } from "../src/entry";
import { createFakeHass, createRoutedFakeHass, FOUNDATION_STATUS } from "./fixtures/fake-hass";

let mounted: AiOrchestratorPanel | undefined;

afterEach(() => {
  mounted?.remove();
  mounted = undefined;
});

describe("panel accessibility baseline", () => {
  it("has no serious or critical automated WCAG violations in the rendered shell", async () => {
    mounted = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
    mounted.hass = createRoutedFakeHass({
      "ai_orchestrator/status": FOUNDATION_STATUS,
      "ai_orchestrator/providers/list": { schema_version: 1, providers: [] },
    });
    document.body.append(mounted);
    await mounted.updateComplete;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await mounted.updateComplete;

    const results = await axe.run(
      { fromShadowDom: [PANEL_TAG, ".app-frame"] },
      {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      },
    );
    const stopShipViolations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(stopShipViolations, JSON.stringify(stopShipViolations, undefined, 2)).toEqual([]);
  });

  it("has no serious or critical violations in the lifecycle probe surface", async () => {
    mounted = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
    mounted.hass = createFakeHass();
    document.body.append(mounted);
    await mounted.updateComplete;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await mounted.updateComplete;
    const automationButton = [
      ...(mounted.shadowRoot?.querySelectorAll<HTMLButtonElement>(".nav-button") ?? []),
    ].find((button) => button.textContent?.includes("Automations"));
    automationButton?.click();
    await mounted.updateComplete;

    const results = await axe.run(
      { fromShadowDom: [PANEL_TAG, ".app-frame"] },
      {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      },
    );
    const stopShipViolations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(stopShipViolations, JSON.stringify(stopShipViolations, undefined, 2)).toEqual([]);
  });

  it("has no serious or critical violations in the provider setup surface", async () => {
    mounted = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
    mounted.hass = createRoutedFakeHass({
      "ai_orchestrator/status": FOUNDATION_STATUS,
      "ai_orchestrator/providers/list": { schema_version: 1, providers: [] },
    });
    document.body.append(mounted);
    await mounted.updateComplete;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await mounted.updateComplete;
    const providerButton = [
      ...(mounted.shadowRoot?.querySelectorAll<HTMLButtonElement>(".nav-button") ?? []),
    ].find((button) => button.textContent?.includes("Providers"));
    providerButton?.click();
    await mounted.updateComplete;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    const results = await axe.run(
      { fromShadowDom: [PANEL_TAG, ".app-frame"] },
      {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      },
    );
    const stopShipViolations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(stopShipViolations, JSON.stringify(stopShipViolations, undefined, 2)).toEqual([]);
  });

  it("has no serious or critical violations in the registry catalogue", async () => {
    mounted = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
    mounted.hass = createRoutedFakeHass({
      "ai_orchestrator/status": FOUNDATION_STATUS,
      "ai_orchestrator/catalog/list": {
        schema_version: 1,
        areas: [{ area_id: "kitchen", name: "Kitchen" }],
        devices: [],
        entities: [{
          registry_id: "entity123",
          entity_id: "sensor.kitchen",
          domain: "sensor",
          platform: "synthetic",
          name: "Kitchen",
          device_id: null,
          area_id: "kitchen",
          area_source: "entity",
          disabled: false,
          availability: "available",
        }],
      },
    });
    document.body.append(mounted);
    await mounted.updateComplete;
    const permissionsButton = [
      ...(mounted.shadowRoot?.querySelectorAll<HTMLButtonElement>(".nav-button") ?? []),
    ].find((button) => button.textContent?.includes("Entities & Permissions"));
    permissionsButton?.click();
    await mounted.updateComplete;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    const results = await axe.run(
      { fromShadowDom: [PANEL_TAG, ".app-frame"] },
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } },
    );
    const stopShipViolations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(stopShipViolations, JSON.stringify(stopShipViolations, undefined, 2)).toEqual([]);
  });
});
