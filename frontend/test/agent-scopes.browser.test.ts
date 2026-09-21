import { afterEach, describe, expect, it } from "vitest";
import { askScopedAgent, fetchAgentProfiles, parseAgentProfile, probeAgentTools, saveAgentProfile } from "../src/api/agent-client";
import { CHAT_LIMITS } from "../src/api/chat-client";
import { AgentScopesView } from "../src/panel/agent-scopes-view";
import { createFakeHass, createRoutedFakeHass } from "./fixtures/fake-hass";
import { VALID_CATALOG } from "./catalog-client.browser.test";
import type { HomeAssistantLike } from "../src/ha/hass-contract";

const ID = "12345678-1234-4234-9234-123456789abc";
const PROFILE = { connection_id: ID, revision: 0, observe_registry_ids: [], action_scopes: [] };
const OPTIONS = { schema_version: 1, providers: [{ connection_id: ID, title: "Synthetic local agent", display_name: "Synthetic provider", destination: "local", capability_verified: false }], limits: CHAT_LIMITS, streaming: false, household_context: false, actions: false, history_persisted: false };
const responses = { "ai_orchestrator/agents/list": { schema_version: 1, profiles: [PROFILE] }, "ai_orchestrator/chat/options": OPTIONS, "ai_orchestrator/catalog/list": VALID_CATALOG };
const views: AgentScopesView[] = [];
async function settle(view: AgentScopesView) { await view.updateComplete; await new Promise((resolve) => setTimeout(resolve, 0)); await view.updateComplete; }
async function mount(hass: HomeAssistantLike) {
  const view = document.createElement("ai-orchestrator-agent-scopes-view") as AgentScopesView;
  view.hass = hass; document.body.append(view); views.push(view); await settle(view); return view;
}
function button(view: AgentScopesView, text: string): HTMLButtonElement {
  const result = [...view.shadowRoot!.querySelectorAll("button")].find((item) => item.textContent?.includes(text));
  if (!result) throw new Error("Button missing"); return result;
}
afterEach(() => views.splice(0).forEach((view) => view.remove()));

describe("explicit agent observation policy", () => {
  it("rejects invented tool support and answers claiming actions or hidden trace content", async () => {
    await expect(probeAgentTools(createFakeHass({ schema_version: 1, connection_id: ID, supported: true, error_code: "timeout" }), ID)).rejects.toThrow();
    for (const extra of [{ actions_executed: 1 }, { trace: ["private-state"] }, { provider_calls: 5 }]) {
      const hass: HomeAssistantLike = { callWS: async <T>(request: Record<string, unknown>) => ({ schema_version: 1, connection_id: ID, request_id: request.request_id, text: "Synthetic answer", provider_calls: 1, tool_calls: 0, trace: ["provider_response"], destination: "local", actions_executed: 0, ...extra }) as T };
      await expect(askScopedAgent(hass, PROFILE, "Question")).rejects.toThrow();
    }
  });
  it("requires explicit probe and saved scope before a single-turn local question", async () => {
    const requests: Record<string, unknown>[] = [];
    const saved = { ...PROFILE, revision: 2, observe_registry_ids: ["entity123"] };
    const hass: HomeAssistantLike = { callWS: async <T>(request: Record<string, unknown>) => {
      requests.push(request);
      if (request.type === "ai_orchestrator/agents/list") return { schema_version: 1, profiles: [saved] } as T;
      if (request.type === "ai_orchestrator/agents/probe_tools") return { schema_version: 1, connection_id: ID, supported: true, error_code: null } as T;
      if (request.type === "ai_orchestrator/agents/chat") return { schema_version: 1, connection_id: ID, request_id: request.request_id, text: "The synthetic window is on.", provider_calls: 2, tool_calls: 1, trace: ["provider_response", "state_read", "provider_response"], destination: "local", actions_executed: 0 } as T;
      return responses[request.type as keyof typeof responses] as T;
    } };
    const view = await mount(hass);
    const textarea = view.shadowRoot!.querySelector("textarea")!;
    textarea.value = "Is my window open?"; textarea.dispatchEvent(new Event("input")); await settle(view);
    expect(button(view, "Ask local").disabled).toBe(true);
    expect(requests.some((request) => request.type === "ai_orchestrator/agents/chat")).toBe(false);
    button(view, "Test tool").click(); await settle(view);
    button(view, "Ask local").click(); await settle(view);
    expect(requests.at(-1)).toMatchObject({ type: "ai_orchestrator/agents/chat", connection_id: ID, expected_revision: 2, prompt: "Is my window open?" });
    expect(requests.at(-1)).not.toHaveProperty("messages");
    expect(view.shadowRoot!.textContent).toContain("The synthetic window is on.");
    expect(view.shadowRoot!.textContent).toContain("0 actions");
    const trace = view.shadowRoot!.querySelector('[aria-label="Scoped question trace"]')!;
    expect([...trace.querySelectorAll("li")].map((item) => item.textContent)).toEqual([
      "Local provider returned a response", "Read permitted entity states", "Local provider returned a response",
    ]);
    expect(trace.textContent).not.toContain("The synthetic window is on.");
    expect(trace.textContent).not.toContain("Is my window open?");
    expect(trace.textContent).toContain("not saved as history");
    button(view, "Clear selection").click(); await settle(view);
    expect(button(view, "Ask local").disabled).toBe(true);
    expect(view.shadowRoot!.textContent).not.toContain("The synthetic window is on.");
    expect(view.shadowRoot!.querySelector('[aria-label="Scoped question trace"]')).toBeNull();
  });
  it("rejects unknown fields, action grants, duplicate IDs and invalid revisions", () => {
    for (const value of [{ ...PROFILE, secret: "marker" }, { ...PROFILE, action_scopes: ["*"] }, { ...PROFILE, revision: -1 }, { ...PROFILE, revision: 0.5 }, { ...PROFILE, observe_registry_ids: ["a", "a"] }]) expect(() => parseAgentProfile(value)).toThrow();
  });
  it("rejects duplicate profiles and mismatched saved scope", async () => {
    await expect(fetchAgentProfiles(createFakeHass({ schema_version: 1, profiles: [PROFILE, PROFILE] }))).rejects.toThrow();
    await expect(saveAgentProfile(createFakeHass({ schema_version: 1, profile: { ...PROFILE, revision: 1, observe_registry_ids: ["unexpected"] } }), PROFILE)).rejects.toThrow();
  });
  it("starts empty, sends exact registry identity and expected revision, and supports revocation", async () => {
    const requests: Record<string, unknown>[] = [];
    const hass: HomeAssistantLike = { callWS: async <T>(message: Record<string, unknown>) => {
      requests.push(message);
      return (message.type === "ai_orchestrator/agents/save" ? { schema_version: 1, profile: { ...PROFILE, revision: (message.expected_revision as number) + 1, observe_registry_ids: message.observe_registry_ids } } : responses[message.type as keyof typeof responses]) as T;
    } };
    const view = await mount(hass);
    const checkbox = view.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.checked).toBe(false);
    checkbox.click(); await settle(view); button(view, "Save observation").click(); await settle(view);
    expect(requests.at(-1)).toEqual({ type: "ai_orchestrator/agents/save", connection_id: ID, expected_revision: 0, observe_registry_ids: ["entity123"] });
    expect(view.shadowRoot!.textContent).toContain("policy saved");
    button(view, "Clear selection").click(); await settle(view); button(view, "Save observation").click(); await settle(view);
    expect(requests.at(-1)).toEqual({ type: "ai_orchestrator/agents/save", connection_id: ID, expected_revision: 1, observe_registry_ids: [] });
  });
  it("keeps save failures static and does not show a success", async () => {
    const hass: HomeAssistantLike = { callWS: async <T>(message: Record<string, unknown>) => {
      if (message.type === "ai_orchestrator/agents/save") throw new Error("secret-marker");
      return responses[message.type as keyof typeof responses] as T;
    } };
    const view = await mount(hass); button(view, "Save observation").click(); await settle(view);
    expect(view.shadowRoot!.textContent).toContain("Policy was not saved");
    expect(view.shadowRoot!.textContent).not.toContain("secret-marker");
  });
  it("discards an old user's pending save result", async () => {
    let resolveSave!: (value: unknown) => void;
    const pending = new Promise((resolve) => { resolveSave = resolve; });
    const view = await mount({ user: { id: "old" }, callWS: async <T>(message: Record<string, unknown>) => (message.type === "ai_orchestrator/agents/save" ? await pending : responses[message.type as keyof typeof responses]) as T });
    button(view, "Save observation").click(); await settle(view);
    view.hass = { ...createRoutedFakeHass(responses), user: { id: "new" } }; await settle(view);
    resolveSave({ schema_version: 1, profile: { ...PROFILE, revision: 1 } }); await settle(view);
    expect(view.shadowRoot!.textContent).not.toContain("policy saved");
  });
  it("clears the previous user's catalogue when the replacement session fails", async () => {
    const view = await mount({ ...createRoutedFakeHass(responses), user: { id: "old" } });
    expect(view.shadowRoot!.textContent).toContain("Kitchen Window");
    view.hass = { user: { id: "new" }, callWS: async () => { throw new Error("private"); } };
    await settle(view);
    expect(view.shadowRoot!.textContent).not.toContain("Kitchen Window");
    expect(view.shadowRoot!.textContent).not.toContain("Synthetic local agent");
    expect(button(view, "Save observation").disabled).toBe(true);
  });
  it("invalidates pending results and clears metadata on a same-user disconnect", async () => {
    const callbacks = new Map<string, () => void>();
    const connection = { connected: true, addEventListener: (event: string, callback: () => void) => { callbacks.set(event, callback); }, removeEventListener: (event: string) => { callbacks.delete(event); } };
    let resolveSave!: (value: unknown) => void;
    const pending = new Promise((resolve) => { resolveSave = resolve; });
    const view = await mount({ connection, user: { id: "same" }, callWS: async <T>(message: Record<string, unknown>) => (message.type === "ai_orchestrator/agents/save" ? await pending : responses[message.type as keyof typeof responses]) as T });
    button(view, "Save observation").click(); await settle(view);
    connection.connected = false; callbacks.get("disconnected")!(); await settle(view);
    resolveSave({ schema_version: 1, profile: { ...PROFILE, revision: 1 } }); await settle(view);
    expect(view.shadowRoot!.textContent).not.toContain("policy saved");
    expect(view.shadowRoot!.textContent).not.toContain("Kitchen Window");
    expect(button(view, "Save observation").disabled).toBe(true);
    connection.connected = true; callbacks.get("ready")!(); await settle(view);
    expect(view.shadowRoot!.textContent).toContain("Kitchen Window");
    view.remove(); expect(callbacks.size).toBe(0);
  });
});
