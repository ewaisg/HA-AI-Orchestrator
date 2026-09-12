import * as axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import type { HomeAssistantLike } from "../src/ha/hass-contract";
import { WORKFLOWS_VIEW_TAG, type WorkflowsView } from "../src/panel/workflows-view";
import { createRoutedFakeHass } from "./fixtures/fake-hass";
import {
  EMPTY_LIST,
  INACTIVE_STATUS,
  OBSERVATION,
  STORED_WORKFLOW,
  STORED_WORKFLOW_ID,
  WORKFLOW_LIST,
} from "./fixtures/workflows";

const mounted: WorkflowsView[] = [];

async function settle(view: WorkflowsView): Promise<void> {
  await view.updateComplete;
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await view.updateComplete;
}

async function mount(hass?: HomeAssistantLike): Promise<WorkflowsView> {
  const view = document.createElement(WORKFLOWS_VIEW_TAG) as WorkflowsView;
  view.hass = hass;
  document.body.append(view);
  mounted.push(view);
  await settle(view);
  return view;
}

function button(view: WorkflowsView, label: string): HTMLButtonElement {
  const result = [...view.shadowRoot!.querySelectorAll("button")].find((item) =>
    item.textContent?.trim().startsWith(label),
  );
  if (!result) throw new Error(`Button missing: ${label}`);
  return result;
}

function text(view: WorkflowsView): string {
  return view.shadowRoot?.textContent?.replace(/\s+/gu, " ") ?? "";
}

afterEach(() => {
  for (const view of mounted.splice(0)) view.remove();
});

describe("stored workflows view", () => {
  it("lists stored workflows with redacted live status after one list request", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(
      createRoutedFakeHass({ "ai_orchestrator/workflows/list": WORKFLOW_LIST }, (m) => requests.push(m)),
    );
    expect(requests).toEqual([{ type: "ai_orchestrator/workflows/list" }]);
    expect(text(view)).toContain("Synthetic evening window");
    expect(text(view)).toContain("Active");
    expect(text(view)).toContain("1 trigger(s) · 1 condition(s) · 1 step(s)");
    expect(text(view)).toContain("Observations 2 · Ignored events 1 · Listeners 1");
    expect(text(view)).toContain("Latest observation: triggered yes · conditions passed · 1 step(s) planned, none executed");
    expect(text(view)).not.toContain("Write a short window reminder");
    expect(text(view)).not.toContain(STORED_WORKFLOW_ID);
    expect(button(view, "Disable").disabled).toBe(false);
    expect(button(view, "Observe now").disabled).toBe(false);
  });

  it("shows empty, disabled, error and unreadable states without raw content", async () => {
    const empty = await mount(createRoutedFakeHass({ "ai_orchestrator/workflows/list": EMPTY_LIST }));
    expect(text(empty)).toContain("No stored workflows");

    const disabled = await mount(
      createRoutedFakeHass({
        "ai_orchestrator/workflows/list": {
          ...WORKFLOW_LIST,
          workflows: [{ workflow: { ...STORED_WORKFLOW, enabled: false }, status: INACTIVE_STATUS }],
        },
      }),
    );
    expect(text(disabled)).toContain("Disabled");
    expect(button(disabled, "Enable").disabled).toBe(false);
    expect(button(disabled, "Observe now").disabled).toBe(true);

    const failed = await mount(
      createRoutedFakeHass({
        "ai_orchestrator/workflows/list": {
          ...WORKFLOW_LIST,
          workflows: [{ workflow: STORED_WORKFLOW, status: { ...INACTIVE_STATUS, error: "activation_failed" } }],
        },
      }),
    );
    expect(text(failed)).toContain("Activation failed");

    const unreadable = await mount(
      createRoutedFakeHass({ "ai_orchestrator/workflows/list": { schema_version: 1, store: "unreadable", workflows: [] } }),
    );
    expect(text(unreadable)).toContain("cannot validate");

    const broken = await mount(
      createRoutedFakeHass({ "ai_orchestrator/workflows/list": { ...WORKFLOW_LIST, marker: "private-marker-must-not-render" } }),
    );
    expect(text(broken)).toContain("could not be read from Home Assistant");
    expect(text(broken)).not.toContain("private-marker");
  });

  it("enables, disables, observes and deletes only through explicit clicks", async () => {
    const requests: Record<string, unknown>[] = [];
    const disabledList = {
      ...WORKFLOW_LIST,
      workflows: [{ workflow: { ...STORED_WORKFLOW, enabled: false }, status: INACTIVE_STATUS }],
    };
    let listResponse: unknown = WORKFLOW_LIST;
    const hass: HomeAssistantLike = {
      callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
        requests.push(message);
        switch (message.type) {
          case "ai_orchestrator/workflows/list":
            return structuredClone(listResponse) as T;
          case "ai_orchestrator/workflows/set_enabled":
            listResponse = message.enabled ? WORKFLOW_LIST : disabledList;
            return structuredClone({
              ...(listResponse as object),
              workflow: { ...STORED_WORKFLOW, enabled: message.enabled },
            }) as T;
          case "ai_orchestrator/workflows/run_manual":
            return structuredClone({ schema_version: 1, ...OBSERVATION, conditions_passed: false, eligible: false, planned_steps: [], condition_results: [{ index: 0, passed: false, reason: "outside_time_window" }] }) as T;
          case "ai_orchestrator/workflows/delete":
            listResponse = EMPTY_LIST;
            return structuredClone(EMPTY_LIST) as T;
          default:
            throw new Error("unexpected");
        }
      },
    };
    const view = await mount(hass);

    button(view, "Disable").click();
    await settle(view);
    expect(requests.at(-1)).toEqual({ type: "ai_orchestrator/workflows/set_enabled", workflow_id: STORED_WORKFLOW_ID, enabled: false });
    expect(text(view)).toContain("Disabled");
    expect(button(view, "Observe now").disabled).toBe(true);

    button(view, "Enable").click();
    await settle(view);
    expect(requests.at(-1)).toEqual({ type: "ai_orchestrator/workflows/set_enabled", workflow_id: STORED_WORKFLOW_ID, enabled: true });
    expect(text(view)).toContain("Active");

    button(view, "Observe now").click();
    await settle(view);
    expect(requests.slice(-2).map((m) => m.type)).toEqual(["ai_orchestrator/workflows/run_manual", "ai_orchestrator/workflows/list"]);
    expect(text(view)).toContain("Manual observation: triggered yes · conditions failed · no steps planned");

    button(view, "Delete").click();
    await settle(view);
    expect(requests.some((m) => m.type === "ai_orchestrator/workflows/delete")).toBe(false);
    button(view, "Keep").click();
    await settle(view);
    expect(() => button(view, "Confirm delete")).toThrow();
    button(view, "Delete").click();
    await settle(view);
    button(view, "Confirm delete").click();
    await settle(view);
    expect(requests.at(-1)).toEqual({ type: "ai_orchestrator/workflows/delete", workflow_id: STORED_WORKFLOW_ID });
    expect(text(view)).toContain("No stored workflows");
  });

  it("blocks duplicate submissions and reports failures statically", async () => {
    let resolve!: (value: unknown) => void;
    let calls = 0;
    const hass: HomeAssistantLike = {
      callWS: <T>(message: Record<string, unknown>): Promise<T> => {
        if (message.type === "ai_orchestrator/workflows/list") return Promise.resolve(structuredClone(WORKFLOW_LIST) as T);
        calls++;
        return new Promise<T>((done) => { resolve = done as (value: unknown) => void; });
      },
    };
    const view = await mount(hass);
    const disable = button(view, "Disable");
    disable.click();
    disable.click();
    await settle(view);
    expect(calls).toBe(1);
    expect(disable.disabled).toBe(true);
    expect(button(view, "Observe now").disabled).toBe(true);
    resolve({ raw: "private-failure-marker" });
    await settle(view);
    expect(text(view)).toContain("The change could not be completed");
    expect(text(view)).not.toContain("private-failure-marker");
    expect(button(view, "Disable").disabled).toBe(false);
  });

  it.each(["remove", "identity", "disconnect"])("suppresses late responses after %s", async (operation) => {
    let resolve!: (value: unknown) => void;
    const listeners = new Map<string, () => void>();
    const hass: HomeAssistantLike = {
      user: { id: "admin" },
      connection: {
        connected: true,
        addEventListener: (name, cb) => { listeners.set(name, cb); },
        removeEventListener: (name) => { listeners.delete(name); },
      },
      callWS: <T>() => new Promise<T>((done) => { resolve = done as (value: unknown) => void; }),
    };
    const view = await mount(hass);
    if (operation === "remove") view.remove();
    if (operation === "identity") view.hass = { ...hass, user: { id: "another-admin" } };
    if (operation === "disconnect") listeners.get("disconnected")?.();
    resolve(structuredClone(WORKFLOW_LIST));
    await settle(view);
    expect(text(view)).not.toContain("Synthetic evening window");
  });

  it("does not strand a mutation when a reload or identity change overlaps it", async () => {
    let resolve!: (value: unknown) => void;
    const requests: string[] = [];
    const hass: HomeAssistantLike = {
      user: { id: "admin" },
      callWS: <T>(message: Record<string, unknown>): Promise<T> => {
        requests.push(message.type as string);
        if (message.type === "ai_orchestrator/workflows/list") return Promise.resolve(structuredClone(WORKFLOW_LIST) as T);
        return new Promise<T>((done) => { resolve = done as (value: unknown) => void; });
      },
    };
    const view = await mount(hass);
    button(view, "Disable").click();
    await settle(view);
    expect(button(view, "Reload workflows").disabled).toBe(true);
    view.refreshToken = 1;
    await settle(view);
    expect(requests.filter((t) => t === "ai_orchestrator/workflows/list")).toHaveLength(1);
    resolve({ ...WORKFLOW_LIST, workflow: { ...STORED_WORKFLOW, enabled: false } });
    await settle(view);
    expect(button(view, "Disable").disabled).toBe(false);
    expect(button(view, "Reload workflows").disabled).toBe(false);
    expect(text(view)).not.toContain("Saving…");
    // The refresh requested during the mutation is replayed once it settles.
    expect(requests.filter((t) => t === "ai_orchestrator/workflows/list")).toHaveLength(2);

    button(view, "Disable").click();
    await settle(view);
    view.hass = { ...hass, user: { id: "another-admin" } };
    await settle(view);
    resolve({ raw: "private-late-failure" });
    await settle(view);
    expect(text(view)).not.toContain("could not be completed");
    expect(text(view)).not.toContain("private-late-failure");
    expect(button(view, "Reload workflows").disabled).toBe(false);
  });

  it("loads exactly once on first mount and once more on reattachment", async () => {
    const requests: string[] = [];
    const view = await mount(
      createRoutedFakeHass({ "ai_orchestrator/workflows/list": WORKFLOW_LIST }, (m) => requests.push(m.type as string)),
    );
    expect(requests).toHaveLength(1);
    view.remove();
    document.body.append(view);
    await settle(view);
    expect(requests).toHaveLength(2);
    expect(text(view)).toContain("Synthetic evening window");
  });

  it("reloads when the refresh token changes and hands a document to the editor", async () => {
    const requests: string[] = [];
    const view = await mount(
      createRoutedFakeHass({ "ai_orchestrator/workflows/list": WORKFLOW_LIST }, (m) => requests.push(m.type as string)),
    );
    expect(requests).toHaveLength(1);
    view.refreshToken = 1;
    await settle(view);
    expect(requests).toHaveLength(2);

    const loads: string[] = [];
    view.addEventListener("workflow-load", (event) => loads.push((event as CustomEvent<{ json: string }>).detail.json));
    button(view, "Load into editor").click();
    expect(loads).toHaveLength(1);
    expect(JSON.parse(loads[0]!)).toEqual(STORED_WORKFLOW);
  });

  it("fits a 390px container and has accessible controls", async () => {
    const view = await mount(createRoutedFakeHass({ "ai_orchestrator/workflows/list": WORKFLOW_LIST }));
    view.style.width = "390px";
    view.style.fontFamily = "Arial, sans-serif";
    await settle(view);
    expect(view.shadowRoot!.querySelector("section")!.scrollWidth).toBeLessThanOrEqual(390);
    const results = await axe.run(
      { fromShadowDom: [WORKFLOWS_VIEW_TAG, "section"] },
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } },
    );
    expect(results.violations).toEqual([]);
  });
});
