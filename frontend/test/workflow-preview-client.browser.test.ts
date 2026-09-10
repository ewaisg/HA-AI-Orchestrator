import { describe, expect, it } from "vitest";
import { parseWorkflowPreview, previewWorkflow } from "../src/api/workflow-preview-client";
import { createRoutedFakeHass } from "./fixtures/fake-hass";

import { VALID_PREVIEW } from "./fixtures/workflow-preview";
describe("offline workflow preview contract", () => {
  it("submits only explicitly supplied JSON to the preview command", async () => {
    const calls: Record<string, unknown>[] = [];
    const result = await previewWorkflow(createRoutedFakeHass({ "ai_orchestrator/workflow/preview": VALID_PREVIEW }, (message) => calls.push(message)), "{}", "{}");
    expect(result).toEqual(VALID_PREVIEW);
    expect(calls).toEqual([{ type: "ai_orchestrator/workflow/preview", workflow_json: "{}", snapshot_json: "{}" }]);
  });
  it.each([
    null, [], {}, { ...VALID_PREVIEW, raw: "secret" }, { ...VALID_PREVIEW, mode: "live" },
    { ...VALID_PREVIEW, provider_calls: 1 }, { ...VALID_PREVIEW, actions_executed: 1 },
    { ...VALID_PREVIEW, enabled: "false" }, { ...VALID_PREVIEW, schema_version: 2 },
    { ...VALID_PREVIEW, trigger_results: [{ index: 0, passed: true, reason: "secret" }] },
    { ...VALID_PREVIEW, trigger_results: [{ index: 1, passed: true, reason: "matched" }] },
    { ...VALID_PREVIEW, trigger_results: [{ index: 0, passed: false, reason: "matched" }] },
    { ...VALID_PREVIEW, triggered: false }, { ...VALID_PREVIEW, conditions_passed: false },
    { ...VALID_PREVIEW, eligible: false }, { ...VALID_PREVIEW, planned_steps: [{ index: 0, kind: "generic_action" }] },
    { ...VALID_PREVIEW, planned_steps: [{ index: 0, kind: "notify", args: "secret" }] },
    { ...VALID_PREVIEW, condition_results: Array.from({ length: 21 }, (_, index) => ({ index, passed: true, reason: "matched" })) },
    { ...VALID_PREVIEW, planned_steps: Array.from({ length: 26 }, (_, index) => ({ index, kind: "notify" })) },
  ])("rejects malformed or unsafe response %#", (value) => { expect(() => parseWorkflowPreview(value)).toThrow(); });
  it.each(["", " ", "a".repeat(131073)])("rejects empty and oversized inputs before sending %#", async (value) => {
    const calls: unknown[] = [];
    await expect(previewWorkflow(createRoutedFakeHass({}, (message) => calls.push(message)), value, "{}")).rejects.toThrow();
    expect(calls).toEqual([]);
  });
  it("accepts a blocked scenario with no planned steps", () => {
    expect(parseWorkflowPreview({ ...VALID_PREVIEW, conditions_passed: false, eligible: false, condition_results: [{ index: 0, passed: false, reason: "outside_time_window" }], planned_steps: [] }).eligible).toBe(false);
  });
});

