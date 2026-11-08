import { afterEach, describe, expect, it } from "vitest";
import { AiOrchestratorPanel, PANEL_TAG } from "../src/entry";
import { createFakeHass, FOUNDATION_STATUS } from "./fixtures/fake-hass";

const panels: AiOrchestratorPanel[] = [];
async function mount(loaded = false): Promise<AiOrchestratorPanel> {
  const panel = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
  panel.hass = createFakeHass({ ...FOUNDATION_STATUS, configured: true,
    features: { ...FOUNDATION_STATUS.features, providers: loaded } });
  panels.push(panel); document.body.append(panel);
  await panel.updateComplete;
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  await panel.updateComplete;
  return panel;
}
afterEach(() => panels.splice(0).forEach(panel => panel.remove()));

describe("guided onboarding", () => {
  it("keeps first chat unavailable until a provider is actually reported loaded", async () => {
    const panel = await mount();
    const buttons = [...panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".setup-path button")];
    expect(buttons.map(button => button.disabled)).toEqual([false, true, true, true]);
    buttons[0]!.click(); await panel.updateComplete;
    expect(panel.shadowRoot!.textContent).toContain("Provider connections");
  });
  it("does not present loaded-provider status as successful inference", async () => {
    const panel = await mount(true);
    expect(panel.shadowRoot!.textContent).toContain("inference still needs testing");
    const chat = panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".setup-path button")[1]!;
    expect(chat.disabled).toBe(false); chat.click(); await panel.updateComplete;
    expect(panel.shadowRoot!.querySelector("ai-orchestrator-assistant")).not.toBeNull();
  });
  it("keeps advanced workflow tools closed and opens them for an explicit editor handoff", async () => {
    const panel = await mount(true);
    [...panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".nav-button")]
      .find(button => button.textContent?.includes("Automations"))!.click();
    await panel.updateComplete;
    const tools = panel.shadowRoot!.querySelector<HTMLDetailsElement>("#workflow-testing")!;
    expect(tools.open).toBe(false);
    const builder = panel.shadowRoot!.querySelector("ai-orchestrator-workflow-builder")!;
    builder.dispatchEvent(new CustomEvent("workflow-draft", { detail: { json: "{}" }, bubbles: true, composed: true }));
    await panel.updateComplete;
    expect(tools.open).toBe(true);
  });
});
