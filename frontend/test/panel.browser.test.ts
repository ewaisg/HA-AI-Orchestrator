import { afterEach, describe, expect, it } from "vitest";

import { AiOrchestratorPanel, type CatalogView, PANEL_TAG } from "../src/entry";
import {
  createFailingHass,
  createFakeHass,
  createRoutedFakeHass,
  FOUNDATION_STATUS,
  FOUNDATION_WORKFLOW_PROBE_RESULT,
} from "./fixtures/fake-hass";

const mounted: AiOrchestratorPanel[] = [];

async function mountPanel(hass = createFakeHass()): Promise<AiOrchestratorPanel> {
  const panel = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
  panel.hass = hass;
  document.body.append(panel);
  mounted.push(panel);
  await panel.updateComplete;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  await panel.updateComplete;
  return panel;
}

function shadowText(panel: AiOrchestratorPanel): string {
  return panel.shadowRoot?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

afterEach(() => {
  for (const panel of mounted.splice(0)) {
    panel.remove();
  }
});

describe("AI Orchestrator panel shell", () => {
  it("registers one custom element and reports an incomplete setup honestly", async () => {
    const panel = await mountPanel();

    expect(customElements.get(PANEL_TAG)).toBe(AiOrchestratorPanel);
    expect(shadowText(panel)).toContain("Integration setup is not complete");
    expect(shadowText(panel)).toContain("None contacted");
    expect(shadowText(panel)).toContain("Not available");
  });

  it("does not treat unknown status values as healthy", async () => {
    const panel = await mountPanel(
      createFakeHass({ ...FOUNDATION_STATUS, schema_version: 99 }),
    );

    expect(shadowText(panel)).toContain("The status response is not supported");
    expect(shadowText(panel)).toContain("No action ran");
  });

  it("shows a bounded failure state without rendering raw error content", async () => {
    const panel = await mountPanel(
      createFailingHass(new Error("credential-like-value-must-not-render")),
    );

    expect(shadowText(panel)).toContain("The integration status could not be read");
    expect(shadowText(panel)).not.toContain("credential-like-value-must-not-render");
    const featureStates = [
      ...(panel.shadowRoot?.querySelectorAll<HTMLElement>(".status-list .state-pill") ?? []),
    ].map((pill) => pill.textContent?.trim());
    expect(featureStates).toEqual(["Unknown", "Unknown", "Unknown", "Unknown"]);
  });

  it("provides keyboard-native section navigation without fabricated data", async () => {
    const panel = await mountPanel();
    const providerButton = [...(panel.shadowRoot?.querySelectorAll<HTMLButtonElement>(".nav-button") ?? [])].find(
      (button) => button.textContent?.includes("Providers"),
    );

    expect(providerButton).toBeDefined();
    providerButton?.click();
    await panel.updateComplete;

    expect(shadowText(panel)).toContain("Provider connections");
    expect(shadowText(panel)).toContain("Test connection");
    expect(shadowText(panel)).toContain("no stored secret");
  });

  it("constrains only the chat section to the available panel height", async () => {
    const panel = await mountPanel();
    const navButton = (label: string): HTMLButtonElement | undefined =>
      [...(panel.shadowRoot?.querySelectorAll<HTMLButtonElement>(".nav-button") ?? [])].find((button) =>
        button.textContent?.includes(label),
      );

    // Non-chat sections must scroll normally and stay unconstrained.
    expect(panel.classList.contains("chat-host")).toBe(false);
    expect(panel.style.getPropertyValue("--orchestrator-shell-height")).toBe("");

    navButton("Chat")?.click();
    await panel.updateComplete;

    // Chat becomes an app shell sized to the space Home Assistant actually gave
    // the panel, so the composer cannot be pushed below the viewport.
    expect(panel.classList.contains("chat-host")).toBe(true);
    const height = panel.style.getPropertyValue("--orchestrator-shell-height");
    expect(height).toMatch(/^\d+px$/u);
    const available = window.innerHeight - panel.getBoundingClientRect().top;
    expect(Number.parseInt(height, 10)).toBeLessThanOrEqual(Math.max(320, Math.ceil(available)) + 1);
    expect(panel.shadowRoot?.querySelector(".app-frame")?.classList.contains("chat-mode")).toBe(true);

    // Leaving chat releases the constraint again.
    navButton("Home")?.click();
    await panel.updateComplete;
    expect(panel.classList.contains("chat-host")).toBe(false);
    expect(panel.style.getPropertyValue("--orchestrator-shell-height")).toBe("");
    expect(panel.shadowRoot?.querySelector(".app-frame")?.classList.contains("chat-mode")).toBe(false);
  });

  it("opens the read-only registry catalogue with no AI permission", async () => {
    const panel = await mountPanel(
      createRoutedFakeHass({
        "ai_orchestrator/status": FOUNDATION_STATUS,
        "ai_orchestrator/catalog/list": {
          schema_version: 1,
          areas: [],
          devices: [],
          entities: [],
        },
      }),
    );
    const permissionsButton = [
      ...(panel.shadowRoot?.querySelectorAll<HTMLButtonElement>(".nav-button") ?? []),
    ].find((button) => button.textContent?.includes("Entities & Permissions"));

    permissionsButton?.click();
    await panel.updateComplete;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    const catalog = panel.shadowRoot?.querySelector<CatalogView>(
      "ai-orchestrator-catalog-view",
    );
    await catalog?.updateComplete;

    expect(shadowText(panel)).toContain("Home Assistant registry catalogue");
    expect(shadowText(panel)).toContain("AI access none");
    expect(catalog?.shadowRoot?.textContent).toContain("No registered entities are available");
  });

  it("does not write panel state to browser storage", async () => {
    const before = new Map<string, string>();
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key !== null) {
        before.set(key, localStorage.getItem(key) ?? "");
      }
    }

    await mountPanel();

    const after = new Map<string, string>();
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key !== null) {
        after.set(key, localStorage.getItem(key) ?? "");
      }
    }
    expect(after).toEqual(before);
  });

  it("runs only the bounded no-side-effect lifecycle probe", async () => {
    const requestTypes: unknown[] = [];
    const panel = await mountPanel(
      createRoutedFakeHass(
        {
          "ai_orchestrator/status": FOUNDATION_STATUS,
          "ai_orchestrator/workflow/probe/run": FOUNDATION_WORKFLOW_PROBE_RESULT,
        },
        (message) => requestTypes.push(message.type),
      ),
    );
    const automationButton = [
      ...(panel.shadowRoot?.querySelectorAll<HTMLButtonElement>(".nav-button") ?? []),
    ].find((button) => button.textContent?.includes("Automations"));

    automationButton?.click();
    await panel.updateComplete;
    const probeButton = [
      ...(panel.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ].find((button) => button.textContent?.includes("Run lifecycle probe"));
    probeButton?.click();
    await panel.updateComplete;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await panel.updateComplete;

    expect(requestTypes).toEqual([
      "ai_orchestrator/status",
      "ai_orchestrator/workflow/probe/run",
    ]);
    expect(shadowText(panel)).toContain("One trigger produced exactly one execution");
    expect(shadowText(panel)).toContain("Provider contacted: no");
    expect(shadowText(panel)).toContain("Home Assistant action called: no");
  });

  it("renders a bounded failure without exposing malformed probe content", async () => {
    const panel = await mountPanel(
      createRoutedFakeHass({
        "ai_orchestrator/status": FOUNDATION_STATUS,
        "ai_orchestrator/workflow/probe/run": {
          ...FOUNDATION_WORKFLOW_PROBE_RESULT,
          executions_for_trigger: 2,
          raw_error: "credential-like-probe-error-must-not-render",
        },
      }),
    );
    const automationButton = [
      ...(panel.shadowRoot?.querySelectorAll<HTMLButtonElement>(".nav-button") ?? []),
    ].find((button) => button.textContent?.includes("Automations"));
    automationButton?.click();
    await panel.updateComplete;
    const probeButton = [
      ...(panel.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? []),
    ].find((button) => button.textContent?.includes("Run lifecycle probe"));
    probeButton?.click();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await panel.updateComplete;

    expect(shadowText(panel)).toContain("The lifecycle probe was not confirmed");
    expect(shadowText(panel)).toContain("No provider or Home Assistant action was called");
    expect(shadowText(panel)).not.toContain("credential-like-probe-error-must-not-render");
  });
});
