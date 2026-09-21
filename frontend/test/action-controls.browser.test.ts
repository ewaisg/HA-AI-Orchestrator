import { afterEach, describe, expect, it } from "vitest";
import * as axe from "axe-core";
import { confirmAction, fetchActionCatalog, interpretAction, parseActionProfile, proposeAction, saveActionProfile, type ActionCatalog, type ActionProposal } from "../src/api/action-client";
import { CHAT_LIMITS } from "../src/api/chat-client";
import { ActionControlsView } from "../src/panel/action-controls-view";
import type { HomeAssistantLike } from "../src/ha/hass-contract";
import { createFakeHass } from "./fixtures/fake-hass";

const ID = "12345678-1234-4234-9234-123456789abc";
const ID2 = "12345678-1234-4234-9234-123456789abd";
const PROFILE = { connection_id: ID, revision: 0, action_scopes: [], switch_reviews: [] };
const GRANTED = { ...PROFILE, revision: 1, action_scopes: [{ tool_id: "light_turn_on_v1" as const, registry_ids: ["light-id"] }] };
const TARGET = { registry_id: "light-id", entity_id: "light.synthetic", name: "Synthetic light" };
const CATALOG: ActionCatalog = { profile: GRANTED, switch_candidates: [], tools: [{ tool_id: "light_turn_on_v1", label: "Turn light on", risk: "medium", arguments: "none", targets: [TARGET] }] };
const PROPOSAL: ActionProposal = { connection_id: ID, request_id: ID2, token: "synthetic-confirmation-token", expires_in: 300, tool_id: "light_turn_on_v1", entity_id: TARGET.entity_id, risk: "medium", arguments: {}, state: "off" };
const OPTIONS = { schema_version: 1, providers: [ID, ID2].map((id) => ({ connection_id: id, title: id === ID ? "Synthetic agent" : "Other agent", display_name: "Local provider", destination: "local", capability_verified: false })), limits: CHAT_LIMITS, streaming: false, household_context: false, actions: false, history_persisted: false };
const views: ActionControlsView[] = [];
async function settle(view: ActionControlsView) { await view.updateComplete; await new Promise((resolve) => setTimeout(resolve, 0)); await view.updateComplete; }
async function mount(hass: HomeAssistantLike, mode: ActionControlsView["mode"] = "all") {
  const view = document.createElement("ai-orchestrator-action-controls-view") as ActionControlsView;
  view.hass = hass; view.mode = mode; document.body.append(view); views.push(view); await settle(view); return view;
}
function button(view: ActionControlsView, label: string): HTMLButtonElement {
  const item = [...view.shadowRoot!.querySelectorAll("button")].find((element) => element.textContent?.includes(label));
  if (!item) throw new Error(`Missing button ${label}`); return item;
}
async function select(view: ActionControlsView, label: string, value: string) {
  const item = [...view.shadowRoot!.querySelectorAll("label")].find((element) => element.textContent?.startsWith(label))!.querySelector("select")!;
  item.value = value; item.dispatchEvent(new Event("change")); await settle(view);
}
function fake(requests: Record<string, unknown>[], override?: (request: Record<string, unknown>) => unknown): HomeAssistantLike {
  return { user: { id: "admin" }, callWS: async <T>(request: Record<string, unknown>) => {
    requests.push(request); const replacement = override?.(request); if (replacement !== undefined) return await replacement as T;
    if (request.type === "ai_orchestrator/chat/options") return OPTIONS as T;
    if (request.type === "ai_orchestrator/actions/catalog") return { schema_version: 2, ...CATALOG, profile: { ...GRANTED, connection_id: request.connection_id } } as T;
    if (request.type === "ai_orchestrator/actions/save") return { schema_version: 2, profile: { connection_id: request.connection_id, revision: Number(request.expected_revision) + 1, action_scopes: request.action_scopes, switch_reviews: [] } } as T;
    if (request.type === "ai_orchestrator/actions/propose" || request.type === "ai_orchestrator/actions/interpret") return { schema_version: 1, ...PROPOSAL, connection_id: request.connection_id, request_id: request.request_id } as T;
    if (request.type === "ai_orchestrator/actions/confirm") return { schema_version: 1, connection_id: request.connection_id, request_id: request.request_id, status: "completed", actions_executed: 1 } as T;
    throw new Error("Unexpected command");
  } };
}
afterEach(() => views.splice(0).forEach((view) => view.remove()));

describe("closed action transport", () => {
  it("rejects invented tools, wildcard grants, duplicates and malformed revisions", () => {
    for (const profile of [{ ...PROFILE, secret: "marker" }, { ...PROFILE, revision: -1 }, { ...PROFILE, action_scopes: [{ tool_id: "call_service", registry_ids: ["*"] }] }, { ...GRANTED, action_scopes: [...GRANTED.action_scopes, ...GRANTED.action_scopes] }, { ...GRANTED, action_scopes: [{ tool_id: "light_turn_on_v1", registry_ids: ["x", "x"] }] }]) expect(() => parseActionProfile(profile)).toThrow();
  });
  it("rejects foreign profile, added catalog fields and altered grants on save", async () => {
    for (const catalog of [{ schema_version: 2, ...CATALOG, secret: "marker" }, { schema_version: 2, ...CATALOG, profile: { ...GRANTED, connection_id: ID2 } }, { schema_version: 2, ...CATALOG, tools: [{ ...CATALOG.tools[0], arguments: "arbitrary" }] }]) await expect(fetchActionCatalog(createFakeHass(catalog), ID)).rejects.toThrow();
    await expect(saveActionProfile(createFakeHass({ schema_version: 2, profile: { ...PROFILE, revision: 2 } }), GRANTED)).rejects.toThrow();
  });
  it("binds exact requested target/arguments/risk and never confirms a proposal implicitly", async () => {
    for (const change of [{ entity_id: "light.other" }, { risk: "low" }, { state: {} }, { arguments: { volume_level: 1 } }, { expires_in: 999 }, { hidden: "marker" }]) {
      const requests: Record<string, unknown>[] = [];
      await expect(proposeAction(fake(requests, (request) => request.type === "ai_orchestrator/actions/propose" ? { schema_version: 1, ...PROPOSAL, request_id: request.request_id, ...change } : undefined), GRANTED, CATALOG.tools[0]!, TARGET, {})).rejects.toThrow();
      expect(requests).toHaveLength(1);
    }
  });
  it("rejects an outcome falsely pairing unknown with successful execution", async () => {
    await expect(confirmAction(createFakeHass({ schema_version: 1, connection_id: ID, request_id: ID2, status: "unknown", actions_executed: 1 }), PROPOSAL)).rejects.toThrow();
  });
  it("rejects AI proposals outside the saved grants or discovered action catalog", async () => {
    const hass = fake([]);
    await expect(interpretAction(hass, { ...CATALOG, profile: PROFILE }, "Turn the light on")).rejects.toThrow();
    await expect(interpretAction(hass, { ...CATALOG, tools: [] }, "Turn the light on")).rejects.toThrow();
  });
});

describe("human reviewed device actions", () => {
  it("requires a bounded explicit volume and displays its exact argument", async () => {
    const requests: Record<string, unknown>[] = [];
    const volumeProfile = { ...GRANTED, action_scopes: [{ tool_id: "media_volume_v1", registry_ids: ["media-id"] }] };
    const volumeTarget = { registry_id: "media-id", entity_id: "media_player.synthetic", name: "Synthetic speaker" };
    const view = await mount(fake(requests, (request) => {
      if (request.type === "ai_orchestrator/actions/catalog") return { schema_version: 2, profile: volumeProfile, switch_candidates: [], tools: [{ tool_id: "media_volume_v1", label: "Set volume", risk: "medium", arguments: "volume", targets: [volumeTarget] }] };
      if (request.type === "ai_orchestrator/actions/propose") return { schema_version: 1, ...PROPOSAL, request_id: request.request_id, tool_id: "media_volume_v1", entity_id: volumeTarget.entity_id, arguments: request.arguments };
    }), "control");
    await select(view, "Granted device", "media-id"); button(view, "Review action").click(); await settle(view);
    expect(requests.some((request) => request.type === "ai_orchestrator/actions/propose")).toBe(false);
    const volume = view.shadowRoot!.querySelector<HTMLInputElement>('input[type="number"]')!;
    volume.value = "1.2"; volume.dispatchEvent(new Event("input")); await settle(view); button(view, "Review action").click(); await settle(view);
    expect(requests.some((request) => request.type === "ai_orchestrator/actions/propose")).toBe(false);
    volume.value = "0.25"; volume.dispatchEvent(new Event("input")); await settle(view); button(view, "Review action").click(); await settle(view);
    expect(requests.at(-1)).toMatchObject({ arguments: { volume_level: 0.25 } });
    expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')!.textContent).toContain('"volume_level":0.25');
    const results = await axe.run({ fromShadowDom: ["ai-orchestrator-action-controls-view", "section"] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    expect(results.violations).toEqual([]);
    view.style.width = "390px"; await settle(view);
    expect(view.scrollWidth).toBeLessThanOrEqual(390);
  });
  it("asks local AI for one proposal, never auto-confirms, and clears it when the request changes", async () => {
    const requests: Record<string, unknown>[] = []; const view = await mount(fake(requests), "control");
    const textarea = view.shadowRoot!.querySelector("textarea")!;
    textarea.value = "Turn the synthetic light on"; textarea.dispatchEvent(new Event("input")); await settle(view);
    button(view, "Ask AI").click(); button(view, "Ask AI").click(); await settle(view);
    expect(requests.filter((request) => request.type === "ai_orchestrator/actions/interpret")).toHaveLength(1);
    expect(requests.at(-1)).toMatchObject({ connection_id: ID, expected_revision: 1, prompt: "Turn the synthetic light on" });
    expect(requests.some((request) => request.type === "ai_orchestrator/actions/confirm")).toBe(false);
    expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')).not.toBeNull();
    textarea.value = "Different request"; textarea.dispatchEvent(new Event("input")); await settle(view);
    expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')).toBeNull();
  });
  it("saves and revokes grants without proposing or acting; permission mode has no execution", async () => {
    const requests: Record<string, unknown>[] = []; const view = await mount(fake(requests), "permissions");
    expect(view.shadowRoot!.querySelector('input[type="checkbox"]')).not.toBeNull();
    button(view, "Clear all").click(); await settle(view);
    button(view, "Save action").click(); button(view, "Save action").click(); await settle(view);
    expect(requests.filter((request) => request.type === "ai_orchestrator/actions/save")).toHaveLength(1);
    expect(requests.at(-1)).toMatchObject({ expected_revision: 1, action_scopes: [] });
    expect(view.shadowRoot!.textContent).toContain("Action permissions saved");
    expect(view.shadowRoot!.textContent).not.toContain("Review action");
    expect(requests.some((request) => /propose|confirm/u.test(String(request.type)))).toBe(false);
  });
  it("reviews exact proposal then sends one explicit confirmation with no automatic replay", async () => {
    const requests: Record<string, unknown>[] = []; const view = await mount(fake(requests), "control");
    expect(view.shadowRoot!.textContent).not.toContain("Save action permissions");
    await select(view, "Granted device", "light-id");
    button(view, "Review action").click(); button(view, "Review action").click(); await settle(view);
    expect(requests.filter((request) => request.type === "ai_orchestrator/actions/propose")).toHaveLength(1);
    expect(requests.some((request) => request.type === "ai_orchestrator/actions/confirm")).toBe(false);
    const card = view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')!;
    expect(card.textContent).toContain("light.synthetic"); expect(card.textContent).toContain("off"); expect(card.textContent).toContain("medium");
    expect(view.shadowRoot!.textContent).not.toContain(PROPOSAL.token);
    button(view, "Confirm this").click(); button(view, "Confirm this").click(); await settle(view);
    expect(requests.filter((request) => request.type === "ai_orchestrator/actions/confirm")).toHaveLength(1);
    expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')).toBeNull();
    expect(view.shadowRoot!.textContent).toContain("Check the device");
  });
  it("clears approval on provider/target/scope changes", async () => {
    const view = await mount(fake([])); await select(view, "Granted device", "light-id"); button(view, "Review action").click(); await settle(view);
    button(view, "Clear all").click(); await settle(view);
    expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')).toBeNull(); expect(button(view, "Review action").disabled).toBe(true);
    await select(view, "Action provider", ID2); await select(view, "Granted device", "light-id"); button(view, "Review action").click(); await settle(view);
    await select(view, "Granted device", ""); expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')).toBeNull();
  });
  it("keeps failed confirmations static, consumes the card and never retries", async () => {
    const requests: Record<string, unknown>[] = []; const view = await mount(fake(requests, (request) => { if (request.type === "ai_orchestrator/actions/confirm") return Promise.reject(new Error("private-secret")); }));
    await select(view, "Granted device", "light-id"); button(view, "Review action").click(); await settle(view); button(view, "Confirm this").click(); await settle(view);
    expect(view.shadowRoot!.textContent).toContain("outcome is unknown"); expect(view.shadowRoot!.textContent).not.toContain("private-secret");
    expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')).toBeNull(); expect(requests.filter((request) => request.type === "ai_orchestrator/actions/confirm")).toHaveLength(1);
  });
  it("discards another user's late proposal", async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((done) => { resolve = done; }); const requests: Record<string, unknown>[] = [];
    const view = await mount(fake(requests, (request) => request.type === "ai_orchestrator/actions/propose" ? pending : undefined));
    await select(view, "Granted device", "light-id"); button(view, "Review action").click(); await settle(view);
    const request = requests.at(-1)!;
    view.hass = { ...fake([]), user: { id: "other-user" } }; await settle(view);
    resolve({ schema_version: 1, ...PROPOSAL, request_id: request.request_id }); await settle(view);
    expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')).toBeNull();
  });
  it("clears state immediately on disconnect and removes listeners on detach", async () => {
    const callbacks = new Map<string, () => void>(); const connection = { connected: true, addEventListener: (event: string, callback: () => void) => { callbacks.set(event, callback); }, removeEventListener: (event: string) => { callbacks.delete(event); } };
    const view = await mount({ ...fake([]), connection }); await select(view, "Granted device", "light-id"); button(view, "Review action").click(); await settle(view);
    connection.connected = false; callbacks.get("disconnected")!(); await settle(view);
    expect(view.shadowRoot!.textContent).not.toContain("light.synthetic"); expect(view.shadowRoot!.querySelector('[aria-label="Action confirmation"]')).toBeNull();
    view.remove(); expect(callbacks.size).toBe(0);
  });
});
