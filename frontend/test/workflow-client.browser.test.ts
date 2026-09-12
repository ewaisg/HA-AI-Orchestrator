import { describe, expect, it } from "vitest";

import {
  deleteWorkflow,
  fetchWorkflows,
  observeWorkflow,
  parseWorkflowList,
  saveWorkflow,
  setWorkflowEnabled,
  WorkflowContractError,
} from "../src/api/workflow-client";
import { PREVIEW_INPUT_LIMIT } from "../src/api/workflow-preview-client";
import { createRoutedFakeHass } from "./fixtures/fake-hass";
import {
  ACTIVE_STATUS,
  EMPTY_LIST,
  INACTIVE_STATUS,
  OBSERVATION,
  STORED_WORKFLOW,
  STORED_WORKFLOW_ID,
  WORKFLOW_LIST,
} from "./fixtures/workflows";

const entry = (workflow = STORED_WORKFLOW, status = ACTIVE_STATUS) => ({ workflow, status });

describe("stored workflow client", () => {
  it("accepts the exact list contract", () => {
    const list = parseWorkflowList(structuredClone(WORKFLOW_LIST));
    expect(list.store).toBe("ready");
    expect(list.workflows[0]?.workflow.workflow_id).toBe(STORED_WORKFLOW_ID);
    expect(list.workflows[0]?.status.latest?.mode).toBe("observation_only");
    expect(parseWorkflowList({ schema_version: 1, store: "unreadable", workflows: [] }).store).toBe(
      "unreadable",
    );
  });

  it.each<[string, unknown]>([
    ["extra key", { ...WORKFLOW_LIST, extra: 1 }],
    ["schema", { ...WORKFLOW_LIST, schema_version: 2 }],
    ["store", { ...WORKFLOW_LIST, store: "ok" }],
    ["unreadable with entries", { ...WORKFLOW_LIST, store: "unreadable" }],
    ["duplicate ids", { ...WORKFLOW_LIST, workflows: [entry(), entry()] }],
    ["entry shape", { ...WORKFLOW_LIST, workflows: [{ workflow: STORED_WORKFLOW }] }],
    ["bad id", { ...WORKFLOW_LIST, workflows: [entry({ ...STORED_WORKFLOW, workflow_id: "x" })] }],
    ["workflow extra", { ...WORKFLOW_LIST, workflows: [entry({ ...STORED_WORKFLOW, secret: 1 })] }],
    ["empty name", { ...WORKFLOW_LIST, workflows: [entry({ ...STORED_WORKFLOW, name: " " })] }],
    ["active with error", { ...WORKFLOW_LIST, workflows: [entry(STORED_WORKFLOW, { ...ACTIVE_STATUS, error: "cleanup_failed" })] }],
    ["unknown error", { ...WORKFLOW_LIST, workflows: [entry(STORED_WORKFLOW, { ...INACTIVE_STATUS, error: "raw text" })] }],
    ["negative counter", { ...WORKFLOW_LIST, workflows: [entry(STORED_WORKFLOW, { ...ACTIVE_STATUS, observations: -1 })] }],
    ["latest mode", { ...WORKFLOW_LIST, workflows: [entry(STORED_WORKFLOW, { ...ACTIVE_STATUS, latest: { ...OBSERVATION, mode: "offline" } })] }],
    ["latest side effect", { ...WORKFLOW_LIST, workflows: [entry(STORED_WORKFLOW, { ...ACTIVE_STATUS, latest: { ...OBSERVATION, actions_executed: 1 } })] }],
    ["too many", { ...WORKFLOW_LIST, workflows: Array.from({ length: 51 }, (_, i) => entry({ ...STORED_WORKFLOW, workflow_id: `12345678-1234-4123-8123-${String(i).padStart(12, "0")}` })) }],
  ])("rejects %s", (_label, value) => {
    expect(() => parseWorkflowList(structuredClone(value))).toThrow(WorkflowContractError);
  });

  it("bounds save input before any request", async () => {
    let calls = 0;
    const hass = { callWS: async <T>(): Promise<T> => { calls++; return {} as T; } };
    await expect(saveWorkflow(hass, "   ")).rejects.toThrow(WorkflowContractError);
    await expect(saveWorkflow(hass, "x".repeat(PREVIEW_INPUT_LIMIT + 1))).rejects.toThrow(WorkflowContractError);
    expect(calls).toBe(0);
  });

  it("requires mutation responses to carry the affected document consistently", async () => {
    const good = { ...WORKFLOW_LIST, workflow: STORED_WORKFLOW };
    const requests: Record<string, unknown>[] = [];
    const hass = createRoutedFakeHass(
      {
        "ai_orchestrator/workflows/list": WORKFLOW_LIST,
        "ai_orchestrator/workflows/save": good,
        "ai_orchestrator/workflows/set_enabled": good,
        "ai_orchestrator/workflows/delete": EMPTY_LIST,
      },
      (message) => requests.push(message),
    );
    expect((await fetchWorkflows(hass)).workflows).toHaveLength(1);
    expect((await saveWorkflow(hass, JSON.stringify(STORED_WORKFLOW))).workflow.enabled).toBe(true);
    expect((await setWorkflowEnabled(hass, STORED_WORKFLOW_ID, true)).workflow.enabled).toBe(true);
    await expect(setWorkflowEnabled(hass, STORED_WORKFLOW_ID, false)).rejects.toThrow(WorkflowContractError);
    await expect(setWorkflowEnabled(hass, "00000000-0000-4000-8000-000000000000", true)).rejects.toThrow(WorkflowContractError);
    expect((await deleteWorkflow(hass, STORED_WORKFLOW_ID)).workflows).toEqual([]);
    expect(requests.map((message) => message.type)).toEqual([
      "ai_orchestrator/workflows/list",
      "ai_orchestrator/workflows/save",
      "ai_orchestrator/workflows/set_enabled",
      "ai_orchestrator/workflows/set_enabled",
      "ai_orchestrator/workflows/set_enabled",
      "ai_orchestrator/workflows/delete",
    ]);

    const missing = createRoutedFakeHass({ "ai_orchestrator/workflows/save": { ...EMPTY_LIST, workflow: STORED_WORKFLOW } });
    await expect(saveWorkflow(missing, "{}")).rejects.toThrow(WorkflowContractError);
    const stillThere = createRoutedFakeHass({ "ai_orchestrator/workflows/delete": WORKFLOW_LIST });
    await expect(deleteWorkflow(stillThere, STORED_WORKFLOW_ID)).rejects.toThrow(WorkflowContractError);
  });

  it("parses manual observations and rejects unexpected shapes", async () => {
    const good = createRoutedFakeHass({ "ai_orchestrator/workflows/run_manual": { schema_version: 1, ...OBSERVATION } });
    expect((await observeWorkflow(good, STORED_WORKFLOW_ID)).eligible).toBe(true);
    const badSchema = createRoutedFakeHass({ "ai_orchestrator/workflows/run_manual": { schema_version: 2, ...OBSERVATION } });
    await expect(observeWorkflow(badSchema, STORED_WORKFLOW_ID)).rejects.toThrow(WorkflowContractError);
    const executed = createRoutedFakeHass({ "ai_orchestrator/workflows/run_manual": { schema_version: 1, ...OBSERVATION, provider_calls: 1 } });
    await expect(observeWorkflow(executed, STORED_WORKFLOW_ID)).rejects.toThrow(WorkflowContractError);
  });
});
