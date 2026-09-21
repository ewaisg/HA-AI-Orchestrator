import { afterEach, describe, expect, it } from "vitest";
import * as axe from "axe-core";
import { fetchActionCatalog, parseActionProfile, previewSwitchReview, updateSwitchReview, type ActionProfile } from "../src/api/action-client";
import { ActionControlsView } from "../src/panel/action-controls-view";
import { CHAT_LIMITS } from "../src/api/chat-client";
import type { HomeAssistantLike } from "../src/ha/hass-contract";
import { createFakeHass } from "./fixtures/fake-hass";

const ID = "12345678-1234-4234-9234-123456789abc";
const REVIEW = { registry_id: "switch-id", classification: "ordinary_noncritical" as const, review_id: "12345678-1234-4234-9234-123456789abd", reviewed_at: "2026-09-20T12:00:00+00:00" };
const PROFILE: ActionProfile = { connection_id: ID, revision: 0, action_scopes: [], switch_reviews: [] };
const TARGET = { registry_id: "switch-id", entity_id: "switch.synthetic", name: "Synthetic switch", device_name: "Synthetic physical device", status: "unreviewed" as const };
const WIRE_PREVIEW = { schema_version: 2, revision: 0, registry_id: TARGET.registry_id, entity_id: TARGET.entity_id, name: TARGET.name, device_name: TARGET.device_name, review_token: "synthetic-token", expires_in: 300 };
const OPTIONS = { schema_version: 1, providers: [{ connection_id: ID, title: "Synthetic agent", display_name: "Local provider", destination: "local", capability_verified: false }], limits: CHAT_LIMITS, streaming: false, household_context: false, actions: false, history_persisted: false };
const views: ActionControlsView[] = [];
async function settle(view: ActionControlsView) { await view.updateComplete; await new Promise(resolve => setTimeout(resolve, 0)); await view.updateComplete; }
async function mount(hass: HomeAssistantLike) { const view = document.createElement("ai-orchestrator-action-controls-view") as ActionControlsView; view.hass = hass; view.mode = "permissions"; document.body.append(view); views.push(view); await settle(view); return view; }
function button(view: ActionControlsView, label: string) { return [...view.shadowRoot!.querySelectorAll("button")].find(item => item.textContent?.trim() === label)!; }
async function inspect(view: ActionControlsView) { const select = [...view.shadowRoot!.querySelectorAll("label")].find(item => item.textContent?.startsWith("Switch to inspect"))!.querySelector("select")!; select.value = TARGET.registry_id; select.dispatchEvent(new Event("change")); await settle(view); button(view, "Inspect switch review").click(); await settle(view); }
function fake(requests: Record<string, unknown>[], override?: (request: Record<string, unknown>) => unknown): HomeAssistantLike {
  let profile = structuredClone(PROFILE);
  return { user: { id: "admin" }, callWS: async <T>(request: Record<string, unknown>) => {
    requests.push(request); const replacement = override?.(request); if (replacement !== undefined) return await replacement as T;
    if (request.type === "ai_orchestrator/chat/options") return OPTIONS as T;
    if (request.type === "ai_orchestrator/actions/catalog") return { schema_version: 2, profile, tools: [], switch_candidates: [{ ...TARGET, status: profile.switch_reviews.length ? "reviewed" : "unreviewed" }] } as T;
    if (request.type === "ai_orchestrator/actions/switch_review/preview") return { ...WIRE_PREVIEW, revision: profile.revision } as T;
    if (request.type === "ai_orchestrator/actions/switch_review/save" || request.type === "ai_orchestrator/actions/switch_review/revoke") {
      profile = { ...profile, revision: profile.revision + 1, switch_reviews: String(request.type).endsWith("save") ? [REVIEW] : [] };
      return { schema_version: 2, profile } as T;
    }
    throw new Error("Unexpected command");
  } };
}
afterEach(() => views.splice(0).forEach(view => view.remove()));
describe("explicit switch classification", () => {
  it("requires all three attestations, saves no grants and revokes separately", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(fake(requests)); await inspect(view);
    expect(view.shadowRoot!.textContent).toContain(TARGET.device_name);
    const checkboxes = view.shadowRoot!.querySelectorAll<HTMLInputElement>("section[aria-label='Switch classification review'] input");
    expect(checkboxes).toHaveLength(3);
    expect(button(view, "Save switch review").disabled).toBe(true);
    for (const checkbox of checkboxes) { checkbox.checked = true; checkbox.dispatchEvent(new Event("change")); await settle(view); }
    button(view, "Save switch review").click(); await settle(view);
    const save = requests.find(request => String(request.type).endsWith("switch_review/save"));
    expect(save).toEqual({ type: "ai_orchestrator/actions/switch_review/save", connection_id: ID, expected_revision: 0, registry_id: "switch-id", review_token: "synthetic-token", classification: "ordinary_noncritical", attestations: { physical_target_verified: true, single_device: true, not_security_or_life_safety: true } });
    expect(requests.some(request => ["ai_orchestrator/actions/save", "ai_orchestrator/actions/confirm", "ai_orchestrator/actions/propose"].includes(String(request.type)))).toBe(false);
    expect(view.shadowRoot!.textContent).toContain("No action is granted yet");
    button(view, "Revoke switch review").click(); await settle(view);
    expect(requests.at(-2)).toEqual({ type: "ai_orchestrator/actions/switch_review/revoke", connection_id: ID, expected_revision: 1, registry_id: "switch-id" });
    expect(view.shadowRoot!.textContent).toContain("review revoked");
  });
  it.each([{ classification: "critical" }, { reviewed_at: "PRIVATE_TIME" }, { review_id: "PRIVATE_ID" }, { extra: "PRIVATE_CONTENT" }])("rejects unsupported review metadata %j", change => {
    expect(() => parseActionProfile({ ...PROFILE, switch_reviews: [{ ...REVIEW, ...change }] })).toThrow();
  });
  it("rejects unreviewed grants and targets and lowered switch risk", async () => {
    expect(() => parseActionProfile({ ...PROFILE, action_scopes: [{ tool_id: "switch_turn_on_v1", registry_ids: ["switch-id"] }] })).toThrow();
    for (const risk of ["medium", "high"]) await expect(fetchActionCatalog(createFakeHass({ schema_version: 2, profile: PROFILE, switch_candidates: [TARGET], tools: [{ tool_id: "switch_turn_on_v1", label: "Switch on", risk, arguments: "none", targets: [{ registry_id: TARGET.registry_id, entity_id: TARGET.entity_id, name: TARGET.name }] }] }), ID)).rejects.toThrow();
  });
  it("accepts a reviewed high-risk target without inventing a grant", async () => {
    const result = await fetchActionCatalog(createFakeHass({ schema_version: 2, profile: { ...PROFILE, switch_reviews: [REVIEW] }, switch_candidates: [{ ...TARGET, status: "reviewed" }], tools: [{ tool_id: "switch_turn_on_v1", label: "Switch on", risk: "high", arguments: "none", targets: [{ registry_id: TARGET.registry_id, entity_id: TARGET.entity_id, name: TARGET.name }] }] }), ID);
    expect(result.tools[0]!.risk).toBe("high");
    expect(result.profile.action_scopes).toEqual([]);
  });
  it("keeps missing stored reviews revocable while offering no hidden target", async () => {
    const view = await mount(fake([], request => request.type === "ai_orchestrator/actions/catalog" ? { schema_version: 2, profile: { ...PROFILE, switch_reviews: [REVIEW] }, tools: [], switch_candidates: [] } : undefined));
    expect(view.shadowRoot!.textContent).toContain("Unavailable reviewed switch");
    expect(button(view, "Revoke switch review").disabled).toBe(false);
    expect(button(view, "Inspect switch review").disabled).toBe(true);
  });
  it("requires revocation to remove both target switch grants while preserving unrelated scopes", async () => {
    const profile: ActionProfile = { ...PROFILE, switch_reviews: [REVIEW], action_scopes: [{ tool_id: "switch_turn_on_v1", registry_ids: [TARGET.registry_id] }, { tool_id: "switch_turn_off_v1", registry_ids: [TARGET.registry_id] }, { tool_id: "light_turn_on_v1", registry_ids: ["light-id"] }] };
    const saved = { ...profile, revision: 1, switch_reviews: [], action_scopes: [profile.action_scopes[2]!] };
    expect(await updateSwitchReview(createFakeHass({ schema_version: 2, profile: saved }), profile, TARGET.registry_id)).toEqual(saved);
    await expect(updateSwitchReview(createFakeHass({ schema_version: 2, profile: { ...saved, action_scopes: [] } }), profile, TARGET.registry_id)).rejects.toThrow();
  });
  it("rejects altered preview identity, expiry and extra fields", async () => {
    for (const change of [{ entity_id: "switch.other" }, { device_name: "Other physical target" }, { revision: 9 }, { expires_in: 999 }, { hidden: "PRIVATE" }]) await expect(previewSwitchReview(createFakeHass({ ...WIRE_PREVIEW, ...change }), PROFILE, TARGET)).rejects.toThrow();
  });
  it("rejects save responses that silently grant an action", async () => {
    const preview = await previewSwitchReview(createFakeHass(WIRE_PREVIEW), PROFILE, TARGET);
    await expect(updateSwitchReview(createFakeHass({ schema_version: 2, profile: { ...PROFILE, revision: 1, switch_reviews: [REVIEW], action_scopes: [{ tool_id: "switch_turn_on_v1", registry_ids: [TARGET.registry_id] }] } }), PROFILE, TARGET.registry_id, preview)).rejects.toThrow();
  });
  it("clears review and unchecked attestations on identity change and ignores late preview", async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise(r => { resolve = r; });
    const view = await mount(fake([], request => String(request.type).endsWith("/preview") ? pending : undefined));
    await inspect(view); view.hass = { ...fake([]), user: { id: "other" } }; await settle(view); resolve(WIRE_PREVIEW); await settle(view);
    expect(view.shadowRoot!.querySelector("section[aria-label='Switch classification review']")).toBeNull();
    await inspect(view);
    expect([...view.shadowRoot!.querySelectorAll<HTMLInputElement>("section[aria-label='Switch classification review'] input")].every(item => !item.checked)).toBe(true);
  });
  it("displays static errors and does not replay a failed review", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mount(fake(requests, request => String(request.type).endsWith("/preview") ? Promise.reject(new Error("PRIVATE_FAILURE")) : undefined));
    await inspect(view);
    expect(view.shadowRoot!.textContent).toContain("Switch review is unavailable");
    expect(view.shadowRoot!.textContent).not.toContain("PRIVATE_FAILURE");
    expect(requests.filter(request => String(request.type).endsWith("/preview"))).toHaveLength(1);
  });
  it("keeps review labels accessible at 390px", async () => {
    const view = await mount(fake([])); view.style.width = "390px"; await inspect(view);
    expect(view.scrollWidth).toBeLessThanOrEqual(390);
    const results = await axe.run(view, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
