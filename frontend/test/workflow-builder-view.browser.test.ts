import * as axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { WORKFLOW_BUILDER_TAG, type WorkflowBuilderView } from "../src/panel/workflow-builder-view";
import type { HomeAssistantLike } from "../src/ha/hass-contract";
import { VALID_CATALOG } from "./catalog-client.browser.test";
import { createRoutedFakeHass } from "./fixtures/fake-hass";
import { CHAT_OPTIONS, NOTIFY_TARGETS, STORED_WORKFLOW, STORED_WORKFLOW_ID, WORKFLOW_LIST } from "./fixtures/workflows";

const LOOKUPS = new Set(["ai_orchestrator/catalog/list", "ai_orchestrator/chat/options", "ai_orchestrator/notify/targets"]);
const ROUTES = { "ai_orchestrator/catalog/list": VALID_CATALOG, "ai_orchestrator/chat/options": CHAT_OPTIONS, "ai_orchestrator/notify/targets": NOTIFY_TARGETS, "ai_orchestrator/workflows/save": { ...WORKFLOW_LIST, workflow: STORED_WORKFLOW } };
const mounted: WorkflowBuilderView[] = [];
async function settle(view: WorkflowBuilderView): Promise<void> { await view.updateComplete; await new Promise<void>((r) => setTimeout(r, 0)); await view.updateComplete; await new Promise<void>((r) => setTimeout(r, 0)); await view.updateComplete; }
async function mount(hass?: HomeAssistantLike): Promise<WorkflowBuilderView> {
  const view = document.createElement(WORKFLOW_BUILDER_TAG) as WorkflowBuilderView;
  view.hass = hass; document.body.append(view); mounted.push(view); await settle(view); return view;
}
function field<T extends HTMLElement>(view: WorkflowBuilderView, id: string): T { const el = view.shadowRoot!.querySelector<T>(`#${id}`); if (!el) throw new Error(`Missing #${id}`); return el; }
async function type(view: WorkflowBuilderView, id: string, value: string): Promise<void> { const el = field<HTMLInputElement>(view, id); el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); await settle(view); }
async function choose(view: WorkflowBuilderView, id: string, value: string): Promise<void> { const el = field<HTMLSelectElement>(view, id); el.value = value; el.dispatchEvent(new Event("change", { bubbles: true })); await settle(view); }
function text(view: WorkflowBuilderView): string { return view.shadowRoot?.textContent?.replace(/\s+/gu, " ") ?? ""; }
function button(view: WorkflowBuilderView, label: string): HTMLButtonElement { const b = [...view.shadowRoot!.querySelectorAll("button")].find((x) => x.textContent?.trim() === label); if (!b) throw new Error(`Missing ${label}`); return b; }
afterEach(() => { for (const view of mounted.splice(0)) view.remove(); });

describe("structured workflow builder", () => {
  it("only reads lookups until an explicit save, and builds the exact v1 document", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(createRoutedFakeHass(ROUTES, (m) => requests.push(m)));
    expect(requests.every((m) => LOOKUPS.has(m.type as string))).toBe(true);
    expect(field<HTMLButtonElement>(view, "wb-save").disabled).toBe(true);
    expect(text(view)).toContain("Give the workflow a name");
    await type(view, "wb-name", "Window reminder");
    await type(view, "wb-trigger-entity", "binary_sensor.kitchen_window");
    expect(text(view)).toContain("match(es)");
    await choose(view, "wb-mode", "execute");
    await choose(view, "wb-s1-target", "notify.kitchen_speaker");
    button(view, "Add time window").click(); await settle(view);
    expect(field<HTMLButtonElement>(view, "wb-save").disabled).toBe(false);
    const document = view.document();
    expect(document).toMatchObject({
      schema_version: 1, name: "Window reminder", enabled: false, run_mode: "execute",
      provider_connection_id: "12345678-1234-4234-9234-123456789abc",
      triggers: [{ kind: "state", entity_ids: ["binary_sensor.kitchen_window"], to_state: "on" }],
      conditions: [{ kind: "time_window", after_time: "18:00", before_time: "06:00" }],
      steps: [{ step_id: "compose", kind: "ai_compose" }, { step_id: "notify", kind: "notify", notify_service: "notify.kitchen_speaker" }],
    });
    expect(document.workflow_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
    const saved: Event[] = []; view.addEventListener("workflow-saved", (e) => saved.push(e));
    field<HTMLButtonElement>(view, "wb-save").click(); await settle(view);
    const sent = requests.filter((m) => m.type === "ai_orchestrator/workflows/save");
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]!.workflow_json as string)).toEqual(document);
    expect(saved).toHaveLength(1); expect(text(view)).toContain("Workflow saved");
  });
  it("refuses unknown targets, observe/execute provider rules, and bad times before contacting Home Assistant", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(createRoutedFakeHass(ROUTES, (m) => requests.push(m)));
    await type(view, "wb-name", "x"); await type(view, "wb-trigger-entity", "binary_sensor.kitchen_window");
    expect(text(view)).toContain("choose a notification target that Home Assistant has");
    await choose(view, "wb-s1-target", "notify.kitchen_speaker");
    await choose(view, "wb-trigger-kind", "time"); expect(text(view)).toContain("Enter the trigger time as HH:MM");
    await type(view, "wb-at-time", "25:99"); expect(text(view)).toContain("Enter the trigger time as HH:MM");
    await type(view, "wb-at-time", "07:30"); expect(field<HTMLButtonElement>(view, "wb-save").disabled).toBe(false);
    expect(view.document().triggers).toEqual([{ kind: "time", at_time: "07:30" }]);
    expect(view.document().provider_connection_id).toBeNull();
    field<HTMLButtonElement>(view, "wb-save").click(); await settle(view);
    expect(requests.filter((m) => m.type === "ai_orchestrator/workflows/save")).toHaveLength(1);
  });
  it("hands the document to the JSON editor and maps a backend rejection statically", async () => {
    const drafts: string[] = [];
    const hass: HomeAssistantLike = { callWS: async <T>(m: Record<string, unknown>): Promise<T> => {
      if (LOOKUPS.has(m.type as string)) return structuredClone(ROUTES[m.type as keyof typeof ROUTES]) as T;
      throw Object.assign(new Error("workflow.name is too long"), { code: "invalid_workflow" });
    } };
    const view = await mount(hass);
    view.addEventListener("workflow-draft", (e) => drafts.push((e as CustomEvent<{ json: string }>).detail.json));
    await type(view, "wb-name", "Draft"); await type(view, "wb-trigger-entity", "binary_sensor.kitchen_window"); await choose(view, "wb-s1-target", "notify.kitchen_speaker");
    field<HTMLButtonElement>(view, "wb-to-editor").click(); await settle(view);
    expect(drafts).toHaveLength(1); expect(JSON.parse(drafts[0]!).name).toBe("Draft");
    field<HTMLButtonElement>(view, "wb-save").click(); await settle(view);
    expect(text(view)).toContain("Home Assistant rejected the workflow"); expect(text(view)).toContain("workflow.name is too long");
  });
  it("builds extract and branch steps and refuses a branch without a preceding classify", async () => {
    const view = await mount(createRoutedFakeHass(ROUTES));
    await type(view, "wb-name", "Gate"); await type(view, "wb-trigger-entity", "binary_sensor.kitchen_window"); await choose(view, "wb-s1-target", "notify.kitchen_speaker");
    button(view, "Add branch").click(); await settle(view);
    expect(text(view)).toContain("choose an earlier classify step to branch on");
    button(view, "Remove step 3").click(); await settle(view);
    button(view, "Add classify").click(); await settle(view);
    button(view, "Add branch").click(); await settle(view);
    button(view, "Add extract values").click(); await settle(view);
    expect(view.document().steps).toHaveLength(5);
    await choose(view, "wb-s3-when", "classify");
    expect(text(view)).toContain("choose one of that step's categories");
    await choose(view, "wb-s3-category", "urgent");
    await type(view, "wb-s2-prompt", "Classify it."); await type(view, "wb-s4-prompt", "Extract it.");
    expect(view.problems()).toEqual([]);
    const steps = view.document().steps as Record<string, unknown>[];
    expect(steps.map((s) => s.step_id)).toEqual(["compose", "notify", "classify", "gate", "extract"]);
    expect(steps[3]).toEqual({ step_id: "gate", kind: "branch", when_step_id: "classify", when_category: "urgent" });
    expect(steps[4]).toMatchObject({ kind: "ai_extract", fields: [{ name: "room", type: "string" }, { name: "needs_action", type: "boolean" }] });
  });
  it("edits a stored workflow, keeps its id and step ids, and reorders steps", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(createRoutedFakeHass(ROUTES, (m) => requests.push(m)));
    const stored = { ...STORED_WORKFLOW, run_mode: "execute", provider_connection_id: "12345678-1234-4234-9234-123456789abc", conditions: [{ kind: "time_window", after_time: "18:00", before_time: "06:00" }, { kind: "state", entity_id: "binary_sensor.kitchen_window", state: "on" }], steps: [{ step_id: "classify", kind: "ai_classify", prompt: "Classify.", categories: ["urgent", "routine"] }, { step_id: "gate", kind: "branch", when_step_id: "classify", when_category: "urgent" }, { step_id: "compose", kind: "ai_compose", prompt: "Write." }, { step_id: "notify", kind: "notify", notify_service: "notify.kitchen_speaker" }] };
    view.draft = { json: JSON.stringify(stored), sequence: 1 }; await settle(view);
    expect(text(view)).toContain("Edit a workflow"); expect(text(view)).toContain(STORED_WORKFLOW_ID);
    expect(field<HTMLInputElement>(view, "wb-name").value).toBe("Synthetic evening window");
    expect(field<HTMLInputElement>(view, "wb-trigger-entity").value).toBe("binary_sensor.synthetic_window");
    expect(view.problems()).toEqual([]);
    const before = view.document();
    expect(before.workflow_id).toBe(STORED_WORKFLOW_ID);
    expect((before.steps as Record<string, unknown>[]).map((s) => s.step_id)).toEqual(["classify", "gate", "compose", "notify"]);
    expect(before.run_mode).toBe("execute");
    button(view, "Move step 3 down").click(); await settle(view);
    expect((view.document().steps as Record<string, unknown>[]).map((s) => s.step_id)).toEqual(["classify", "gate", "notify", "compose"]);
    button(view, "Move condition 2 up").click(); await settle(view);
    expect((view.document().conditions as Record<string, unknown>[])[0]).toMatchObject({ kind: "state" });
    button(view, "Add compose text").click(); await settle(view);
    expect((view.document().steps as Record<string, unknown>[]).map((s) => s.step_id)).toEqual(["classify", "gate", "notify", "compose", "compose_2"]);
    expect(field<HTMLButtonElement>(view, "wb-save").disabled).toBe(true);
    button(view, "Remove step 5").click(); await settle(view);
    expect(field<HTMLButtonElement>(view, "wb-save").disabled).toBe(false);
    field<HTMLButtonElement>(view, "wb-save").click(); await settle(view);
    const sent = requests.filter((m) => m.type === "ai_orchestrator/workflows/save");
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]!.workflow_json as string).workflow_id).toBe(STORED_WORKFLOW_ID);
    button(view, "Start a new one").click(); await settle(view);
    expect(text(view)).toContain("Build a workflow"); expect(view.document().workflow_id).not.toBe(STORED_WORKFLOW_ID);
  });
  it("preserves a description and an any-transition trigger through an edit round trip", async () => {
    const view = await mount(createRoutedFakeHass(ROUTES));
    const stored = { ...STORED_WORKFLOW, description: "Keep me", triggers: [{ kind: "state", entity_ids: ["binary_sensor.kitchen_window"] }], steps: [{ step_id: "notify", kind: "notify", notify_service: "notify.kitchen_speaker" }] };
    view.draft = { json: JSON.stringify(stored), sequence: 1 }; await settle(view);
    expect(field<HTMLInputElement>(view, "wb-description").value).toBe("Keep me");
    expect(field<HTMLInputElement>(view, "wb-to-state").value).toBe("");
    expect(view.problems()).toEqual([]);
    const doc = view.document();
    expect(doc.description).toBe("Keep me");
    expect(doc.triggers).toEqual([{ kind: "state", entity_ids: ["binary_sensor.kitchen_window"] }]);
  });
  it("declines a document shape it cannot represent and points to the JSON editor", async () => {
    const view = await mount(createRoutedFakeHass(ROUTES));
    view.draft = { json: JSON.stringify({ ...STORED_WORKFLOW, triggers: [{ kind: "manual" }, { kind: "time", at_time: "07:00" }] }), sequence: 1 }; await settle(view);
    expect(text(view)).toContain("cannot show"); expect(text(view)).toContain("Build a workflow");
    expect(view.document().workflow_id).not.toBe(STORED_WORKFLOW_ID);
  });
  it("works without lookups, at 390px, with accessible labels", async () => {
    const view = await mount({ callWS: async () => { throw new Error("private-secret"); } });
    view.style.width = "390px"; await settle(view);
    expect(text(view)).toContain("Catalogue unavailable"); expect(text(view)).not.toContain("private-secret");
    expect(view.shadowRoot!.querySelector("section")!.scrollWidth).toBeLessThanOrEqual(390);
    for (const control of view.shadowRoot!.querySelectorAll("input, select, textarea")) expect(view.shadowRoot!.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    const results = await axe.run({ fromShadowDom: [WORKFLOW_BUILDER_TAG, "section"] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
  });
});
