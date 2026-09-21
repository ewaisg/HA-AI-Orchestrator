import { afterEach, describe, expect, it } from "vitest";
import { ActivityView } from "../src/panel/activity-view";
import { createFakeHass, createFailingHass } from "./fixtures/fake-hass";
import { ACTIVE_STATUS, EMPTY_LIST, STORED_WORKFLOW } from "./fixtures/workflows";
import type { HomeAssistantLike } from "../src/ha/hass-contract";

const mounted: ActivityView[] = [];
async function settle(view: ActivityView) {
  await view.updateComplete;
  await new Promise(resolve => setTimeout(resolve, 0));
  await view.updateComplete;
}
async function mount(hass: HomeAssistantLike) {
  const view = document.createElement("ai-orchestrator-activity") as ActivityView;
  view.hass = hass;
  document.body.append(view);
  mounted.push(view);
  await settle(view);
  return view;
}
function text(view: ActivityView) { return view.shadowRoot?.textContent ?? ""; }
afterEach(() => mounted.splice(0).forEach(view => view.remove()));
const result = {
  schema_version: 1, store: "ready",
  workflows: [{ workflow: { ...STORED_WORKFLOW, description: "PRIVATE_DESCRIPTION", steps: [{kind: "ai_compose", prompt: "PRIVATE_PROMPT"}] }, status: {
    ...ACTIVE_STATUS, executions: 1,
    last_execution: {
      started_at: "2026-09-20T20:00:00Z", finished_at: "2026-09-20T20:00:02Z",
      completed: true, error: null, provider_calls: 1, actions_executed: 1,
      steps: [
        { index: 0, step_id: "compose", kind: "ai_compose", executed: true, status: "ok" },
        { index: 1, step_id: "notify", kind: "notify", executed: true, status: "delivered", target: "entity" },
      ],
    },
  } }],
};
describe("workflow activity", () => {
  it("shows failures and skipped steps without calling any action", async () => {
    const failed = structuredClone(result);
    const status = failed.workflows[0]!.status;
    Object.assign(status, {execution_failures: 1});
    status.last_execution.completed = false;
    Object.assign(status.last_execution, { error: "provider_unavailable", actions_executed: 0,
      steps: [
        {index: 0, step_id: "compose", kind: "ai_compose", executed: false, status: "skipped"},
        {index: 1, step_id: "notify", kind: "notify", executed: false, status: "skipped"},
      ] });
    const view = await mount(createFakeHass(failed));
    expect(text(view)).toContain("Last run: Failed");
    expect(text(view)).toContain("Failure code: provider_unavailable");
    expect(text(view)).toContain("Successful notification calls: 0");
    expect(view.shadowRoot?.querySelectorAll("li")).toHaveLength(2);
  });
  it("shows actual ordered execution metadata without workflow prompt or description", async () => {
    const calls: unknown[] = [];
    const view = await mount(createFakeHass(result, request => calls.push(request)));
    expect(text(view)).toContain("Last run: Completed");
    expect(text(view)).toContain("Successful notification calls: 1");
    expect([...view.shadowRoot!.querySelectorAll("li")].map(el => el.textContent)).toEqual(["compose: ok", "notify: delivered (entity)"]);
    expect(text(view)).not.toContain("PRIVATE_");
    expect(calls).toEqual([{ type: "ai_orchestrator/workflows/list" }]);
  });
  it("distinguishes no data, unavailable storage and transport errors", async () => {
    expect(text(await mount(createFakeHass(EMPTY_LIST)))).toContain("No stored workflows yet");
    expect(text(await mount(createFakeHass({...EMPTY_LIST, store: "unreadable"})))).toContain("Workflow storage is unavailable");
    const view = await mount(createFailingHass(new Error("PRIVATE_ERROR")));
    expect(text(view)).toContain("Activity could not be loaded");
    expect(text(view)).not.toContain("PRIVATE_ERROR");
  });
  it("rejects a late response from another session", async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise(r => { resolve = r; });
    const view = await mount({ callWS: async <T>() => await pending as T, user: {id: "old"} });
    view.hass = createFakeHass(EMPTY_LIST);
    await settle(view);
    resolve(result);
    await settle(view);
    expect(text(view)).toContain("No stored workflows yet");
    expect(text(view)).not.toContain("Synthetic evening window");
  });
  it("clears visible results on disconnect and reloads on ready", async () => {
    const listeners = new Map<string, () => void>();
    const connection = { connected: true,
      addEventListener: (event: "ready" | "disconnected", cb: () => void) => { listeners.set(event, cb); },
      removeEventListener: (event: "ready" | "disconnected") => { listeners.delete(event); },
    };
    const view = await mount({...createFakeHass(result), connection});
    connection.connected = false;
    listeners.get("disconnected")?.();
    await settle(view);
    expect(text(view)).not.toContain("Synthetic evening window");
    connection.connected = true;
    listeners.get("ready")?.();
    await settle(view);
    expect(text(view)).toContain("Last run: Completed");
  });
});
