import { afterEach, describe, expect, it } from "vitest";
import { fetchAudit, parseAuditRecord } from "../src/api/audit-client";
import { AuditView } from "../src/panel/audit-view";
import { createFakeHass, createFailingHass } from "./fixtures/fake-hass";
import type { HomeAssistantLike } from "../src/ha/hass-contract";

const ROW = { sequence: 1, audit_id: "00000000-0000-4000-8000-000000000001", parent_id: null,
  kind: "action", phase: "committed", created_at: "2026-09-20T10:00:00+00:00", updated_at: "2026-09-20T10:00:01.000001+00:00",
  operation: "light_turn_on_v1", risk: "medium", step_index: null, provider_calls: 0, actions_attempted: 1, service_returns: 1, error_code: null, counts_final: true };
const PAGE = { schema_version: 1, retention_days: 90, records: [ROW], next_cursor: null };
const mounted: AuditView[] = [];
async function settle(view: AuditView) { await view.updateComplete; await new Promise(resolve => setTimeout(resolve, 0)); await view.updateComplete; }
async function mount(hass: HomeAssistantLike) {
  const view = document.createElement("ai-orchestrator-audit") as AuditView;
  view.hass = hass; document.body.append(view); mounted.push(view); await settle(view); return view;
}
function text(view: AuditView) { return view.shadowRoot!.textContent!; }
afterEach(() => mounted.splice(0).forEach(view => view.remove()));

describe("durable audit metadata", () => {
  it.each(["switch_turn_on_v1", "switch_turn_off_v1"])("requires high risk metadata for %s", async operation => {
    expect(() => parseAuditRecord({ ...ROW, operation })).toThrow();
    const view = await mount(createFakeHass({ ...PAGE, records: [{ ...ROW, operation, risk: "high" }] }));
    expect(text(view)).toContain("Turn switch");
    expect(text(view)).toContain("Stage: committed");
  });
  it("loads only the read API and distinguishes service return from physical outcome", async () => {
    const calls: unknown[] = [];
    const view = await mount(createFakeHass(PAGE, request => calls.push(request)));
    expect(calls).toEqual([{ type: "ai_orchestrator/audit/list", after_sequence: 0, limit: 100 }]);
    expect(text(view)).toContain("Turn light on");
    expect(text(view)).toContain("Stage: committed");
    expect(text(view)).toContain("does not confirm a physical device change");
    expect(text(view)).toContain("Workflows are not recorded here yet");
    expect(text(view)).not.toContain(ROW.audit_id);
    expect(view.shadowRoot!.querySelectorAll("time")).toHaveLength(2);
  });
  it("shows unknown counts as non-final", async () => {
    const view = await mount(createFakeHass({ ...PAGE, records: [{ ...ROW, phase: "unknown", counts_final: false, service_returns: 0, error_code: "dispatch_unknown" }] }));
    expect(text(view)).toContain("Stage: unknown. Counts: not final");
    expect(text(view)).toContain("Actions attempted: 1");
    expect(text(view)).toContain("Service returns: 0");
  });
  it.each([
    { prompt: "PRIVATE_PROMPT" }, { operation: "PRIVATE_OPERATION" }, { kind: "workflow" }, { risk: null },
    { counts_final: false }, { error_code: "PRIVATE_ERROR" }, { phase: "success" }, { sequence: 0 },
    { provider_calls: 65 }, { actions_attempted: true }, { service_returns: 2 }, { audit_id: "PRIVATE_ID" },
    { parent_id: ROW.audit_id }, { step_index: 64 }, { created_at: "2026-02-30T00:00:00+00:00" },
    { updated_at: "2026-09-20T09:00:00+00:00" }, { updated_at: "2026-09-20T10:00:00Z" },
    { phase: "requested", counts_final: false },
  ])("rejects inconsistent or content-bearing records %j", patch => {
    expect(() => parseAuditRecord({ ...ROW, ...patch })).toThrow("Invalid audit metadata");
  });
  it("compares submillisecond timestamps without losing precision", () => {
    expect(() => parseAuditRecord({ ...ROW, created_at: "2026-09-20T10:00:00.000002+00:00", updated_at: "2026-09-20T10:00:00.000001+00:00" })).toThrow();
    expect(parseAuditRecord({ ...ROW, updated_at: "2026-09-20T10:00:00.000001+00:00" })).toBeDefined();
  });
  it.each([
    { next_cursor: 2 }, { next_cursor: 0 }, { schema_version: 2 }, { retention_days: 30 },
    { records: [ROW, ROW] }, { records: [], next_cursor: 1 }, { private: "PRIVATE" },
  ])("rejects invalid page envelope %j", async patch => {
    await expect(fetchAudit(createFakeHass({ ...PAGE, ...patch }))).rejects.toThrow();
  });
  it("pages explicitly using validated cursor and refreshes from the beginning", async () => {
    const calls: Record<string, unknown>[] = [];
    const hass: HomeAssistantLike = { callWS: async <T>(request: Record<string, unknown>) => {
      calls.push(request);
      return (request.after_sequence === 0 ? { ...PAGE, next_cursor: 1 } : { ...PAGE, records: [{ ...ROW, sequence: 2, audit_id: "00000000-0000-4000-8000-000000000002" }] }) as T;
    } };
    const view = await mount(hass);
    expect(calls).toHaveLength(1);
    (view.shadowRoot!.querySelectorAll("button")[1] as HTMLButtonElement).click(); await settle(view);
    expect(calls[1]).toEqual({ type: "ai_orchestrator/audit/list", after_sequence: 1, limit: 100 });
    expect(view.shadowRoot!.querySelectorAll("li")).toHaveLength(2);
    (view.shadowRoot!.querySelector("button") as HTMLButtonElement).click(); await settle(view);
    expect(calls[2]!.after_sequence).toBe(0);
    expect(view.shadowRoot!.querySelectorAll("li")).toHaveLength(1);
  });
  it("never renders raw backend failures or malformed record content", async () => {
    const view = await mount(createFailingHass(new Error("PRIVATE_BACKEND_MESSAGE")));
    expect(text(view)).toContain("Audit history is unavailable");
    expect(text(view)).not.toContain("PRIVATE");
    view.hass = createFakeHass({ ...PAGE, records: [{ ...ROW, operation: "PRIVATE_OPERATION" }] }); await settle(view);
    expect(text(view)).not.toContain("PRIVATE");
  });
  it("bounds explicit pagination at 4096 records", async () => {
    const requests: Record<string, unknown>[] = [];
    const hass: HomeAssistantLike = { callWS: async <T>(request: Record<string, unknown>) => {
      requests.push(request);
      const start = request.after_sequence as number;
      const count = request.limit as number;
      return { ...PAGE, next_cursor: start + count, records: Array.from({ length: count }, (_, index) => ({
        ...ROW, sequence: start + index + 1,
        audit_id: `00000000-0000-4000-8000-${(start + index + 1).toString(16).padStart(12, "0")}`,
      })) } as T;
    } };
    const view = await mount(hass);
    for (let page = 0; page < 40; page++) {
      (view.shadowRoot!.querySelectorAll("button")[1] as HTMLButtonElement).click(); await settle(view);
    }
    expect(view.shadowRoot!.querySelectorAll("li")).toHaveLength(4096);
    expect(requests).toHaveLength(41);
    expect(requests.at(-1)!.limit).toBe(96);
    expect(view.shadowRoot!.querySelectorAll("button")).toHaveLength(1);
    expect(text(view)).toContain("Display limit reached");
  });
  it("ignores late responses after identity changes", async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise(r => { resolve = r; });
    const view = await mount({ callWS: async <T>() => await pending as T, user: { id: "old" } });
    view.hass = { ...createFakeHass({ ...PAGE, records: [] }), user: { id: "new" } }; await settle(view);
    resolve(PAGE); await settle(view);
    expect(text(view)).toContain("No retained action history");
    expect(text(view)).not.toContain("Turn light on");
  });
  it("clears on disconnect and cleans listeners on removal", async () => {
    const listeners = new Map<string, () => void>();
    const connection = { connected: true, addEventListener: (event: "ready" | "disconnected", cb: () => void) => { listeners.set(event, cb); }, removeEventListener: (event: "ready" | "disconnected") => { listeners.delete(event); } };
    const view = await mount({ ...createFakeHass(PAGE), connection });
    connection.connected = false; listeners.get("disconnected")!(); await settle(view);
    expect(text(view)).not.toContain("Turn light on");
    connection.connected = true; listeners.get("ready")!(); await settle(view);
    expect(text(view)).toContain("Turn light on");
    view.remove(); expect(listeners.size).toBe(0);
  });
  it("fits a 390px host with accessible refresh and status", async () => {
    const view = await mount(createFakeHass(PAGE)); view.style.width = "390px"; await settle(view);
    expect(view.scrollWidth).toBeLessThanOrEqual(390);
    expect(view.shadowRoot!.querySelector("[role=status][aria-live=polite]")).not.toBeNull();
    const button = view.shadowRoot!.querySelector("button")!;
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    button.focus(); expect(view.shadowRoot!.activeElement).toBe(button);
  });
});
