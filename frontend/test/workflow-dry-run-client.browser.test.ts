import { describe, expect, it } from "vitest";
import { dryRunWorkflow, parseDryRun } from "../src/api/workflow-dry-run-client";
import { createFakeHass } from "./fixtures/fake-hass";
import { DRY_RUN, STORED_WORKFLOW_ID } from "./fixtures/workflows";

const CONNECTION = "12345678-1234-4234-9234-123456789abc";
const SNAPSHOT = JSON.stringify({ states: {}, time: "20:00", event: { kind: "manual" } });
const step = (index: number, overrides: Record<string, unknown>) => ({ index, step_id: `s${index}`, kind: "ai_compose", executed: false, ...overrides });

describe("dry-run client contract", () => {
  it("accepts the exact bounded result and sends only the documented fields", async () => {
    const requests: Record<string, unknown>[] = [];
    const result = await dryRunWorkflow(createFakeHass(DRY_RUN, (m) => requests.push(m)), STORED_WORKFLOW_ID, CONNECTION, SNAPSHOT);
    expect(result.steps[0]?.text).toBe("Please close the window.");
    expect(requests).toEqual([{ type: "ai_orchestrator/workflows/dry_run", workflow_id: STORED_WORKFLOW_ID, connection_id: CONNECTION, snapshot_json: SNAPSHOT }]);
  });
  it("accepts a blocked scenario, a failed run, and a classification", () => {
    expect(parseDryRun({ ...DRY_RUN, eligible: false, conditions_passed: false, condition_results: [{ index: 0, passed: false, reason: "outside_time_window" }], steps: [], provider_calls: 0, completed: false }, STORED_WORKFLOW_ID).steps).toEqual([]);
    const failed = parseDryRun({ ...DRY_RUN, steps: [step(0, { status: "failed", error: "invalid_output" }), step(1, { kind: "notify", status: "skipped" })], provider_calls: 1, completed: false }, STORED_WORKFLOW_ID);
    expect(failed.completed).toBe(false);
    const classified = parseDryRun({ ...DRY_RUN, steps: [step(0, { kind: "ai_classify", executed: true, status: "ok", category: "urgent" })], provider_calls: 1 }, STORED_WORKFLOW_ID);
    expect(classified.steps[0]?.category).toBe("urgent");
  });
  it.each<[string, Record<string, unknown>]>([
    ["wrong workflow", { workflow_id: "12345678-1234-4123-8123-000000000000" }],
    ["action executed", { actions_executed: 1 }],
    ["cloud destination", { destination: "cloud" }],
    ["extra key", { extra: true }],
    ["provider calls inconsistent", { provider_calls: 2 }],
    ["completed inconsistent", { completed: false }],
    ["steps while blocked", { eligible: false, completed: false, provider_calls: 0 }],
    ["compose without text", { steps: [step(0, { executed: true, status: "ok" })] }],
    ["text too long", { steps: [step(0, { executed: true, status: "ok", text: "x".repeat(2001) })] }],
    ["notify marked ok", { steps: [step(0, { kind: "notify", executed: true, status: "ok", text: "sent" })] }],
    ["executed but failed", { steps: [step(0, { executed: true, status: "failed", error: "timeout" })] }],
    ["skipped before failure", { steps: [step(0, { status: "skipped" }), step(1, { status: "failed", error: "timeout" })], completed: false }],
    ["tool payload smuggled", { steps: [step(0, { executed: true, status: "ok", text: "ok", tool_calls: [] })] }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => parseDryRun({ ...DRY_RUN, ...overrides }, STORED_WORKFLOW_ID)).toThrow("unsupported");
  });
  it("accepts extract values and branch outcomes with their invariants", () => {
    const extract = parseDryRun({ ...DRY_RUN, steps: [step(0, { kind: "ai_extract", executed: true, status: "ok", values: { room: "Office", minutes_open: 12, needs_action: true } })], provider_calls: 1 }, STORED_WORKFLOW_ID);
    expect(extract.steps[0]?.values?.minutes_open).toBe(12);
    const notTaken = parseDryRun({ ...DRY_RUN, steps: [step(0, { kind: "ai_classify", executed: true, status: "ok", category: "routine" }), step(1, { kind: "branch", status: "not_taken" }), step(2, { status: "skipped" }), step(3, { kind: "notify", status: "skipped" })], provider_calls: 1, completed: true }, STORED_WORKFLOW_ID);
    expect(notTaken.completed).toBe(true);
    for (const bad of [
      { steps: [step(0, { kind: "ai_extract", executed: true, status: "ok", values: { Room: "x" } })], provider_calls: 1 },
      { steps: [step(0, { kind: "ai_extract", executed: true, status: "ok", values: { room: { nested: true } } })], provider_calls: 1 },
      { steps: [step(0, { kind: "branch", status: "ok", text: "x" })], provider_calls: 0 },
      { steps: [step(0, { kind: "branch", status: "not_taken" }), step(1, { executed: true, status: "ok", text: "ran anyway" })], provider_calls: 1 },
    ]) expect(() => parseDryRun({ ...DRY_RUN, ...bad }, STORED_WORKFLOW_ID)).toThrow("unsupported");
  });
  it("validates outbound identifiers and snapshot before contacting Home Assistant", async () => {
    let calls = 0;
    const hass = createFakeHass(DRY_RUN, () => { calls++; });
    await expect(dryRunWorkflow(hass, "not-a-uuid", CONNECTION, SNAPSHOT)).rejects.toThrow();
    await expect(dryRunWorkflow(hass, STORED_WORKFLOW_ID, "nope", SNAPSHOT)).rejects.toThrow();
    await expect(dryRunWorkflow(hass, STORED_WORKFLOW_ID, CONNECTION, "   ")).rejects.toThrow();
    expect(calls).toBe(0);
  });
});
