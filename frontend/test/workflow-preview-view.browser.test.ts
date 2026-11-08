import * as axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { WORKFLOW_PREVIEW_TAG, type WorkflowPreviewView } from "../src/panel/workflow-preview-view";
import type { HomeAssistantLike } from "../src/ha/hass-contract";
import { createRoutedFakeHass } from "./fixtures/fake-hass";
import { VALID_PREVIEW } from "./fixtures/workflow-preview";
import { CHAT_OPTIONS, DRY_RUN, NOTIFY_TARGETS, STORED_WORKFLOW, STORED_WORKFLOW_ID, WORKFLOW_LIST } from "./fixtures/workflows";

const mounted: WorkflowPreviewView[] = [];
async function settle(view: WorkflowPreviewView): Promise<void> { await view.updateComplete; await new Promise<void>((resolve) => setTimeout(resolve, 0)); await view.updateComplete; }
async function mount(hass?: HomeAssistantLike): Promise<WorkflowPreviewView> {
  const view = document.createElement(WORKFLOW_PREVIEW_TAG) as WorkflowPreviewView;
  view.hass = hass; document.body.append(view); mounted.push(view); await settle(view); return view;
}
function button(view: WorkflowPreviewView, label: string): HTMLButtonElement {
  const result = [...view.shadowRoot!.querySelectorAll("button")].find((item) => item.textContent?.includes(label));
  if (!result) throw new Error("Button missing"); return result;
}
function text(view: WorkflowPreviewView): string { return view.shadowRoot?.textContent ?? ""; }
const OPTIONS_LOOKUP = "ai_orchestrator/chat/options";
const TARGETS_LOOKUP = "ai_orchestrator/notify/targets";
const LOOKUPS = new Set([OPTIONS_LOOKUP, TARGETS_LOOKUP]);
function actions(requests: Record<string, unknown>[]): Record<string, unknown>[] { return requests.filter((m) => !LOOKUPS.has(m.type as string)); }
function dryRunButton(view: WorkflowPreviewView): HTMLButtonElement { return view.shadowRoot!.querySelector<HTMLButtonElement>("#dry-run")!; }
afterEach(() => { for (const view of mounted.splice(0)) view.remove(); });

describe("offline workflow editor", () => {
  it.each([
    { trigger: { kind: "state", entity_ids: ["input_boolean.test"], to_state: "on" }, event: { kind: "state", entity_id: "input_boolean.test", from_state: "off", to_state: "on" }, time: "12:00" },
    { trigger: { kind: "time", at_time: "18:30" }, event: { kind: "time" }, time: "18:30" },
  ])("creates an explicit sample event without contacting Home Assistant: $trigger.kind", async ({trigger, event, time}) => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(createRoutedFakeHass({}, message => requests.push(message)));
    view.draft = { sequence: 1, json: JSON.stringify({ ...STORED_WORKFLOW, enabled: false, conditions: [], triggers: [trigger] }) };
    await settle(view);
    button(view, "Create sample test event").click(); await settle(view);
    const sample = JSON.parse(view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!.value) as Record<string, unknown>;
    expect(sample.event).toEqual(event); expect(sample.time).toBe(time);
    expect(actions(requests)).toEqual([]);
    expect(text(view)).toContain("not your home’s current state");
  });
  it("does not invent condition values for sample events", async () => {
    const view = await mount();
    view.draft = { sequence: 1, json: JSON.stringify(STORED_WORKFLOW) }; await settle(view);
    button(view, "Create sample test event").click(); await settle(view);
    expect(text(view)).toContain("enter a representative snapshot");
    expect(view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!.value).toBe("");
  });
  it("requires explicit sample loading and preview; shows readable results", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(createRoutedFakeHass({ "ai_orchestrator/workflow/preview": VALID_PREVIEW }, (message) => requests.push(message)));
    expect(actions(requests)).toEqual([]); expect(button(view, "Preview workflow").disabled).toBe(true);
    button(view, "evening").click(); await settle(view);
    expect(actions(requests)).toEqual([]);
    button(view, "Preview workflow").click(); await settle(view);
    expect(actions(requests)).toHaveLength(1);
    expect(JSON.parse(actions(requests)[0]!.snapshot_json as string).time).toBe("20:00");
    expect(text(view)).toContain("Scenario passes"); expect(text(view)).toContain("Trigger 1: Pass");
    expect(text(view)).toContain("Notification — not executed"); expect(text(view)).toContain("Provider calls: 0");
    button(view, "daytime").click(); await settle(view);
    expect(text(view)).not.toContain("Scenario passes");
    expect(JSON.parse(view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!.value).time).toBe("12:00");
  });
  it("renders why a daytime snapshot blocks the steps", async () => {
    const view = await mount(createRoutedFakeHass({ "ai_orchestrator/workflow/preview": { ...VALID_PREVIEW, eligible: false, conditions_passed: false, condition_results: [{ index: 0, passed: false, reason: "outside_time_window" }], planned_steps: [] } }));
    button(view, "daytime").click(); await settle(view); button(view, "Preview workflow").click(); await settle(view);
    expect(text(view)).toContain("Scenario blocked"); expect(text(view)).toContain("Condition 1: Fail — Outside the time window");
  });
  it.each(["edit", "reset", "remove", "identity", "disconnect"])("suppresses late responses after %s and guards duplicate submits", async (operation) => {
    let resolve!: (value: unknown) => void;
    let calls = 0;
    const listeners = new Map<string, () => void>();
    const hass: HomeAssistantLike = { user: { id: "admin" }, connection: { connected: true, addEventListener: (name, cb) => { listeners.set(name, cb); }, removeEventListener: (name) => { listeners.delete(name); } }, callWS: <T>(message: Record<string, unknown>) => { if (LOOKUPS.has(message.type as string)) return Promise.reject(new Error("no lookups")); calls++; return new Promise<T>((done) => { resolve = done as (value: unknown) => void; }); } };
    const view = await mount(hass); button(view, "evening").click(); await settle(view);
    const submit = button(view, "Preview workflow"); submit.click(); submit.click(); await settle(view);
    expect(calls).toBe(1); expect(submit.disabled).toBe(true);
    if (operation === "edit") { const field = view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!; field.value = "{}"; field.dispatchEvent(new Event("input")); }
    if (operation === "reset") button(view, "Reset preview").click();
    if (operation === "remove") view.remove();
    if (operation === "identity") view.hass = { ...hass, user: { id: "another-admin" } };
    if (operation === "disconnect") listeners.get("disconnected")?.();
    resolve(VALID_PREVIEW); await settle(view);
    expect(text(view)).not.toContain("Scenario passes"); expect(text(view)).not.toContain("Previewing…");
    if (operation !== "edit") expect(view.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value).toBe("");
  });
  it("does not echo failed transport or malformed response details", async () => {
    const view = await mount({ callWS: async () => { throw new Error("private-secret"); } });
    button(view, "evening").click(); await settle(view); button(view, "Preview workflow").click(); await settle(view);
    expect(text(view)).toContain("Preview could not be completed"); expect(text(view)).not.toContain("private-secret");
    button(view, "Reset preview").click(); await settle(view); expect(text(view)).not.toContain("could not be completed");
  });
  it("rebinds disconnect protection when the same view is reattached", async () => {
    let disconnect: (() => void) | undefined;
    let resolve!: (value: unknown) => void;
    const view = await mount({ connection: { connected: true, addEventListener: (_, cb) => { disconnect = cb; }, removeEventListener: () => { disconnect = undefined; } }, callWS: <T>() => new Promise<T>((done) => { resolve = done as (value: unknown) => void; }) });
    view.remove(); expect(disconnect).toBeUndefined(); document.body.append(view); await settle(view);
    button(view, "evening").click(); await settle(view); button(view, "Preview workflow").click(); await settle(view);
    expect(disconnect).toBeTypeOf("function"); disconnect?.(); resolve(VALID_PREVIEW); await settle(view);
    expect(text(view)).not.toContain("Scenario passes"); expect(view.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value).toBe("");
  });
  it("saves the edited workflow only on explicit request and announces it", async () => {
    const requests: Record<string, unknown>[] = [];
    const savedEvents: Event[] = [];
    const view = await mount(createRoutedFakeHass({
      "ai_orchestrator/workflow/preview": VALID_PREVIEW,
      "ai_orchestrator/workflows/save": { ...WORKFLOW_LIST, workflow: { ...STORED_WORKFLOW, enabled: false } },
    }, (message) => requests.push(message)));
    view.addEventListener("workflow-saved", (event) => savedEvents.push(event));
    expect(button(view, "Save as workflow").disabled).toBe(true);
    button(view, "evening").click(); await settle(view);
    expect(actions(requests)).toEqual([]);
    button(view, "Save as workflow").click(); await settle(view);
    expect(actions(requests)).toHaveLength(1);
    expect(actions(requests)[0]!.type).toBe("ai_orchestrator/workflows/save");
    expect(JSON.parse(actions(requests)[0]!.workflow_json as string).workflow_id).toBe(STORED_WORKFLOW_ID);
    expect(text(view)).toContain("Workflow saved");
    expect(savedEvents).toHaveLength(1);
    expect(JSON.parse(view.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value).enabled).toBe(false);
  });
  it("reports a failed save statically and keeps the draft", async () => {
    const view = await mount({ callWS: async () => { throw new Error("private-secret"); } });
    button(view, "evening").click(); await settle(view);
    button(view, "Save as workflow").click(); await settle(view);
    expect(text(view)).toContain("The workflow could not be saved");
    expect(text(view)).not.toContain("private-secret");
    expect(view.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value).not.toBe("");
  });
  it("loads a stored document handed in as a draft, replacing the editor text", async () => {
    const view = await mount(createRoutedFakeHass({ "ai_orchestrator/workflow/preview": VALID_PREVIEW }));
    button(view, "evening").click(); await settle(view);
    view.draft = { json: JSON.stringify(STORED_WORKFLOW), sequence: 1 }; await settle(view);
    expect(JSON.parse(view.shadowRoot!.querySelector<HTMLTextAreaElement>("#workflow")!.value)).toEqual(STORED_WORKFLOW);
    expect(text(view)).not.toContain("Scenario passes");
  });
  it("dry-runs only a stored workflow with a selected local provider and renders the composed text", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(createRoutedFakeHass({ "ai_orchestrator/chat/options": CHAT_OPTIONS, "ai_orchestrator/workflows/dry_run": DRY_RUN, "ai_orchestrator/workflow/preview": VALID_PREVIEW }, (message) => requests.push(message)));
    expect(requests.map((m) => m.type).sort()).toEqual(["ai_orchestrator/chat/options", "ai_orchestrator/notify/targets"]);
    expect(dryRunButton(view).disabled).toBe(true);
    view.draft = { json: JSON.stringify(STORED_WORKFLOW), sequence: 1 }; await settle(view);
    expect(dryRunButton(view).disabled).toBe(true);
    const snapshot = view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!;
    snapshot.value = JSON.stringify({ states: { "binary_sensor.synthetic_window": "on" }, time: "20:00", event: { kind: "manual" } }); snapshot.dispatchEvent(new Event("input")); await settle(view);
    expect(dryRunButton(view).disabled).toBe(false);
    dryRunButton(view).click(); await settle(view);
    const sent = requests.find((m) => m.type === "ai_orchestrator/workflows/dry_run")!;
    expect(sent.workflow_id).toBe(STORED_WORKFLOW_ID); expect(sent.connection_id).toBe("12345678-1234-4234-9234-123456789abc");
    expect(JSON.parse(sent.snapshot_json as string).time).toBe("20:00");
    expect(text(view)).toContain("Dry run completed — nothing was sent");
    expect(text(view)).toContain("Please close the window."); expect(text(view)).toContain("Notification — planned, not sent");
    expect(text(view)).toContain("Provider calls: 1 · Actions executed: 0");
    snapshot.value = "{}"; snapshot.dispatchEvent(new Event("input")); await settle(view);
    expect(text(view)).not.toContain("Please close the window.");
  });
  it("lists real notification targets from discovery and explains execute mode", async () => {
    const view = await mount(createRoutedFakeHass({ "ai_orchestrator/notify/targets": NOTIFY_TARGETS, "ai_orchestrator/chat/options": CHAT_OPTIONS }));
    expect(text(view)).toContain("Notification targets found in Home Assistant (2)");
    expect(text(view)).toContain("notify.kitchen_speaker"); expect(text(view)).toContain("Kitchen speaker (notify entity)");
    expect(text(view)).toContain("notify.mobile_app_synthetic"); expect(text(view)).toContain("(notify service)");
    expect(text(view)).toContain('"run_mode": "execute"');
  });
  it("shows where a planned notification would go in a dry run", async () => {
    const view = await mount(createRoutedFakeHass({ "ai_orchestrator/chat/options": CHAT_OPTIONS, "ai_orchestrator/workflows/dry_run": { ...DRY_RUN, steps: [(DRY_RUN.steps as Record<string, unknown>[])[0], { ...(DRY_RUN.steps as Record<string, unknown>[])[1], target: "missing" }] } }));
    view.draft = { json: JSON.stringify(STORED_WORKFLOW), sequence: 1 }; await settle(view);
    const snapshot = view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!;
    snapshot.value = JSON.stringify({ states: {}, time: "20:00", event: { kind: "manual" } }); snapshot.dispatchEvent(new Event("input")); await settle(view);
    dryRunButton(view).click(); await settle(view);
    expect(text(view)).toContain("target not found in Home Assistant");
  });
  it("keeps provider and target lookups when the editor is used before they resolve", async () => {
    const pending: ((value: unknown) => void)[] = [];
    const view = await mount({ callWS: <T>(message: Record<string, unknown>): Promise<T> => {
      if (message.type === OPTIONS_LOOKUP) return new Promise<T>((done) => pending.push(() => done(structuredClone(CHAT_OPTIONS) as T)));
      if (message.type === TARGETS_LOOKUP) return new Promise<T>((done) => pending.push(() => done(structuredClone(NOTIFY_TARGETS) as T)));
      return Promise.resolve(structuredClone(VALID_PREVIEW) as T);
    } });
    button(view, "evening").click(); await settle(view);
    const snapshot = view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!; snapshot.value = "{}"; snapshot.dispatchEvent(new Event("input")); await settle(view);
    for (const resolve of pending.splice(0)) resolve(undefined); await settle(view);
    expect(text(view)).toContain("Synthetic local AI");
    expect(text(view)).toContain("Notification targets found in Home Assistant (2)");
    view.draft = { json: JSON.stringify(STORED_WORKFLOW), sequence: 1 }; await settle(view);
    snapshot.value = JSON.stringify({ states: {}, time: "20:00", event: { kind: "manual" } }); snapshot.dispatchEvent(new Event("input")); await settle(view);
    expect(dryRunButton(view).disabled).toBe(false);
  });
  it("disables the dry run when no local provider is available and never fails the editor", async () => {
    const view = await mount(createRoutedFakeHass({ "ai_orchestrator/workflow/preview": VALID_PREVIEW }));
    button(view, "evening").click(); await settle(view);
    expect(dryRunButton(view).disabled).toBe(true);
    expect(text(view)).toContain("No local provider available"); expect(text(view)).not.toContain("could not be completed");
    button(view, "Preview workflow").click(); await settle(view); expect(text(view)).toContain("Scenario passes");
  });
  it("maps dry-run failures to static messages without echoing details", async () => {
    const view = await mount({ callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
      if (message.type === "ai_orchestrator/chat/options") return structuredClone(CHAT_OPTIONS) as T;
      throw Object.assign(new Error("private-secret"), { code: "workflow_not_found" });
    } });
    view.draft = { json: JSON.stringify(STORED_WORKFLOW), sequence: 1 }; await settle(view);
    const snapshot = view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!;
    snapshot.value = JSON.stringify({ states: {}, time: "20:00", event: { kind: "manual" } }); snapshot.dispatchEvent(new Event("input")); await settle(view);
    dryRunButton(view).click(); await settle(view);
    expect(text(view)).toContain("Save the workflow first"); expect(text(view)).not.toContain("private-secret");
  });
  it("drops a late dry-run result after the snapshot is edited", async () => {
    let resolve!: (value: unknown) => void;
    const view = await mount({ callWS: <T>(message: Record<string, unknown>): Promise<T> => {
      if (message.type === "ai_orchestrator/chat/options") return Promise.resolve(structuredClone(CHAT_OPTIONS) as T);
      return new Promise<T>((done) => { resolve = done as (value: unknown) => void; });
    } });
    view.draft = { json: JSON.stringify(STORED_WORKFLOW), sequence: 1 }; await settle(view);
    const snapshot = view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot")!;
    snapshot.value = JSON.stringify({ states: {}, time: "20:00", event: { kind: "manual" } }); snapshot.dispatchEvent(new Event("input")); await settle(view);
    dryRunButton(view).click(); await settle(view);
    expect(dryRunButton(view).disabled).toBe(true);
    snapshot.value = "{}"; snapshot.dispatchEvent(new Event("input")); await settle(view);
    resolve(DRY_RUN); await settle(view);
    expect(text(view)).not.toContain("Please close the window."); expect(text(view)).not.toContain("Working…");
  });
  it("fits a 390px container and has accessible controls", async () => {
    const view = await mount(); view.style.width = "390px"; view.style.fontFamily = "Arial, sans-serif";
    button(view, "evening").click(); await settle(view);
    expect(view.shadowRoot!.querySelector("section")!.scrollWidth).toBeLessThanOrEqual(390);
    for (const textarea of view.shadowRoot!.querySelectorAll("textarea")) expect(view.shadowRoot!.querySelector(`label[for="${textarea.id}"]`)).not.toBeNull();
    const results = await axe.run({ fromShadowDom: [WORKFLOW_PREVIEW_TAG, "section"] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
    await page.screenshot({ path: "__screenshots__/workflow-preview-390px.png", fullPage: true });
  });
});

