import { describe, expect, it } from "vitest";
import { fetchNotifyTargets, parseNotifyTargets } from "../src/api/notify-client";
import { parseWorkflowList } from "../src/api/workflow-client";
import { createFakeHass } from "./fixtures/fake-hass";
import { EXECUTED_STATUS, NOTIFY_TARGETS, STORED_WORKFLOW } from "./fixtures/workflows";

describe("notification target and execution contracts", () => {
  it("accepts real notify entities and services only", async () => {
    const targets = await fetchNotifyTargets(createFakeHass(NOTIFY_TARGETS));
    expect(targets.map((t) => t.reference)).toEqual(["notify.kitchen_speaker", "notify.mobile_app_synthetic"]);
  });
  it.each<[string, unknown]>([
    ["foreign domain", { schema_version: 1, targets: [{ reference: "light.kitchen", kind: "entity", name: "x" }] }],
    ["unknown kind", { schema_version: 1, targets: [{ reference: "notify.a", kind: "webhook", name: "x" }] }],
    ["extra key", { schema_version: 1, targets: [{ reference: "notify.a", kind: "entity", name: "x", token: "y" }] }],
    ["duplicate", { schema_version: 1, targets: [{ reference: "notify.a", kind: "entity", name: "x" }, { reference: "notify.a", kind: "service", name: "x" }] }],
    ["wrong version", { schema_version: 2, targets: [] }],
  ])("rejects %s", (_label, value) => {
    expect(() => parseNotifyTargets(value)).toThrow("unsupported");
  });
  it("parses execution evidence and rejects inconsistent records", () => {
    const list = parseWorkflowList({ schema_version: 1, store: "ready", workflows: [{ workflow: { ...STORED_WORKFLOW, run_mode: "execute", provider_connection_id: "12345678-1234-4234-9234-123456789abc" }, status: EXECUTED_STATUS }] });
    const status = list.workflows[0]!.status;
    expect(status.executions).toBe(3);
    expect(status.last_execution?.steps[1]?.target).toBe("entity");
    const last = EXECUTED_STATUS.last_execution as Record<string, unknown>;
    for (const bad of [
      { ...EXECUTED_STATUS, last_execution: { ...last, actions_executed: 2 } },
      { ...EXECUTED_STATUS, last_execution: { ...last, completed: true, error: "delivery_failed" } },
      { ...EXECUTED_STATUS, last_execution: { ...last, steps: [{ ...(last.steps as Record<string, unknown>[])[0], text: "leak" }] } },
      { ...EXECUTED_STATUS, executions: 0, execution_failures: 1 },
    ]) {
      expect(() => parseWorkflowList({ schema_version: 1, store: "ready", workflows: [{ workflow: STORED_WORKFLOW, status: bad }] })).toThrow();
    }
    expect(() => parseWorkflowList({ schema_version: 1, store: "ready", workflows: [{ workflow: { ...STORED_WORKFLOW, run_mode: "always" }, status: EXECUTED_STATUS }] })).toThrow();
    const notTaken = { ...last, steps: [{ index: 0, step_id: "classify", kind: "ai_classify", executed: true, status: "ok", category: "routine" }, { index: 1, step_id: "gate", kind: "branch", executed: false, status: "not_taken" }, { index: 2, step_id: "compose", kind: "ai_compose", executed: false, status: "skipped" }, { index: 3, step_id: "notify", kind: "notify", executed: false, status: "skipped" }], provider_calls: 1, actions_executed: 0, completed: true, error: null };
    const parsed = parseWorkflowList({ schema_version: 1, store: "ready", workflows: [{ workflow: STORED_WORKFLOW, status: { ...EXECUTED_STATUS, last_execution: notTaken } }] });
    expect(parsed.workflows[0]!.status.last_execution?.completed).toBe(true);
    const noProvider = { ...last, steps: [{ index: 0, step_id: "compose", kind: "ai_compose", executed: false, status: "skipped" }], provider_calls: 0, actions_executed: 0, completed: false, error: "provider_unavailable" };
    expect(parseWorkflowList({ schema_version: 1, store: "ready", workflows: [{ workflow: STORED_WORKFLOW, status: { ...EXECUTED_STATUS, last_execution: noProvider } }] }).workflows[0]!.status.last_execution?.error).toBe("provider_unavailable");
  });
});
