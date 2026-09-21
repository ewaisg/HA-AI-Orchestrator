import type { LitElement } from "lit";
import { afterEach, expect, it } from "vitest";
import { AiOrchestratorPanel, PANEL_TAG } from "../src/entry";
import { createRoutedFakeHass, FOUNDATION_STATUS } from "./fixtures/fake-hass";
import { EMPTY_LIST, STORED_WORKFLOW } from "./fixtures/workflows";

let panel: AiOrchestratorPanel;
const calls: unknown[] = [];
async function mount(): Promise<HTMLElement> {
  calls.length = 0;
  panel = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
  panel.hass = createRoutedFakeHass({
    "ai_orchestrator/status": FOUNDATION_STATUS,
    "ai_orchestrator/workflows/list": EMPTY_LIST,
  }, (message) => calls.push(message.type));
  document.body.append(panel);
  await panel.updateComplete;
  [...panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".nav-button")]
    .find((button) => button.textContent?.includes("Chat"))!.click();
  await panel.updateComplete;
  return panel.shadowRoot!.querySelector<HTMLElement>("ai-orchestrator-assistant")!;
}
function handoff(target: HTMLElement, json: unknown): void {
  target.dispatchEvent(new CustomEvent("assistant-workflow-review", {
    bubbles: true, composed: true, detail: {json},
  }));
}
afterEach(() => panel?.remove());

it("hands an explicit disabled draft into both editors without saving or enabling", async () => {
  const assistant = await mount();
  const draft = {...STORED_WORKFLOW, enabled: false};
  handoff(assistant, JSON.stringify(draft));
  await panel.updateComplete;
  const preview = panel.shadowRoot!.querySelector<LitElement>("ai-orchestrator-workflow-preview")!;
  const builder = panel.shadowRoot!.querySelector<LitElement>("ai-orchestrator-workflow-builder")!;
  await Promise.all([preview.updateComplete, builder.updateComplete]);
  expect(JSON.parse(preview.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value)).toEqual(draft);
  expect((builder as unknown as {draft: {json: string}}).draft.json).toContain("Synthetic evening window");
  expect(calls).not.toContain("ai_orchestrator/workflows/save");
  expect(calls).not.toContain("ai_orchestrator/workflows/set_enabled");
  [...panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".nav-button")]
    .find((button) => button.textContent?.includes("Home"))!.click();
  await panel.updateComplete;
  [...panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".nav-button")]
    .find((button) => button.textContent?.includes("Automations"))!.click();
  await panel.updateComplete;
  const next = panel.shadowRoot!.querySelector<LitElement>("ai-orchestrator-workflow-preview")!;
  await next.updateComplete;
  expect(next.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value).toBe("");
});

it.each(["{bad", JSON.stringify(STORED_WORKFLOW), "x".repeat(65_537), null])(
  "rejects malformed, enabled or oversized handoffs: case %#", async (json) => {
    const assistant = await mount();
    handoff(assistant, json);
    await panel.updateComplete;
    expect(panel.shadowRoot!.querySelector("ai-orchestrator-assistant")).toBe(assistant);
    expect(panel.shadowRoot!.querySelector("ai-orchestrator-workflow-preview")).toBeNull();
  },
);

it("rejects a handoff when the user changed before the next render", async () => {
  const assistant = await mount();
  panel.hass = {...panel.hass!, user: {id: "changed-user"}};
  handoff(assistant, JSON.stringify({...STORED_WORKFLOW, enabled: false}));
  await panel.updateComplete;
  expect(panel.shadowRoot!.querySelector("ai-orchestrator-workflow-preview")).toBeNull();
});

it("discards an accepted handoff when the user changes before editor mount", async () => {
  const assistant = await mount();
  handoff(assistant, JSON.stringify({...STORED_WORKFLOW, enabled: false}));
  panel.hass = {...panel.hass!, user: {id: "next-user"}};
  await panel.updateComplete;
  const preview = panel.shadowRoot!.querySelector<LitElement>("ai-orchestrator-workflow-preview")!;
  const builder = panel.shadowRoot!.querySelector<LitElement>("ai-orchestrator-workflow-builder")!;
  await Promise.all([preview.updateComplete, builder.updateComplete]);
  expect(preview.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value).toBe("");
  expect((builder as unknown as {draft?: {json: string}}).draft).toBeUndefined();
  expect(builder.shadowRoot!.textContent).not.toContain("Editing: Synthetic evening window");
  expect(calls).not.toContain("ai_orchestrator/workflows/save");
});

it.each(["transport", "connection", "remove"])(
  "discards an accepted handoff before editor mount on %s change", async (change) => {
    const assistant = await mount();
    handoff(assistant, JSON.stringify({...STORED_WORKFLOW, enabled: false}));
    if (change === "transport") {
      const original = panel.hass!.callWS;
      panel.hass = {...panel.hass!, callWS: <T>(request: Record<string, unknown>) => original<T>(request)};
    } else if (change === "connection") {
      panel.hass = {...panel.hass!, connection: {connected: true, addEventListener: () => undefined, removeEventListener: () => undefined}};
    } else {
      panel.remove();
      document.body.append(panel);
    }
    await panel.updateComplete;
    const preview = panel.shadowRoot!.querySelector<LitElement>("ai-orchestrator-workflow-preview")!;
    const builder = panel.shadowRoot!.querySelector<LitElement>("ai-orchestrator-workflow-builder")!;
    await Promise.all([preview.updateComplete, builder.updateComplete]);
    expect(preview.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value).toBe("");
    expect((builder as unknown as {draft?: {json: string}}).draft).toBeUndefined();
    expect(calls).not.toContain("ai_orchestrator/workflows/save");
  },
);

it("clears an accepted handoff on socket disconnect and releases its listeners", async () => {
  await mount();
  const listeners = new Map<string, Set<() => void>>();
  const connection = {
    connected: true,
    addEventListener(event: "ready" | "disconnected", callback: () => void) {
      const callbacks = listeners.get(event) ?? new Set<() => void>();
      callbacks.add(callback); listeners.set(event, callbacks);
    },
    removeEventListener(event: "ready" | "disconnected", callback: () => void) {
      listeners.get(event)?.delete(callback);
    },
  };
  panel.hass = {...panel.hass!, connection};
  await panel.updateComplete;
  const assistant = panel.shadowRoot!.querySelector<HTMLElement>("ai-orchestrator-assistant")!;
  handoff(assistant, JSON.stringify({...STORED_WORKFLOW, enabled: false}));
  connection.connected = false;
  for (const callback of [...listeners.get("disconnected") ?? []]) callback();
  await panel.updateComplete;
  const preview = panel.shadowRoot!.querySelector<LitElement>("ai-orchestrator-workflow-preview")!;
  await preview.updateComplete;
  expect(preview.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value).toBe("");
  expect(calls).not.toContain("ai_orchestrator/workflows/save");
  panel.remove();
  expect([...listeners.values()].every(callbacks => callbacks.size === 0)).toBe(true);
});
