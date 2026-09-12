import type { HomeAssistantLike } from "../ha/hass-contract";
import {
  parseWorkflowObservation,
  PREVIEW_INPUT_LIMIT,
  type WorkflowObservation,
} from "./workflow-preview-client";

export const WORKFLOW_RESPONSE_SCHEMA_VERSION = 1;
export const WORKFLOW_LIMIT = 50;
export const STORE_STATES = ["ready", "unreadable", "not_loaded"] as const;
export const STATUS_ERRORS = ["activation_failed", "cleanup_failed"] as const;

export type StoreState = (typeof STORE_STATES)[number];
export type WorkflowStatusError = (typeof STATUS_ERRORS)[number];

export interface StoredWorkflow {
  schema_version: 1;
  workflow_id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: Record<string, unknown>[];
  conditions: Record<string, unknown>[];
  steps: Record<string, unknown>[];
}

export interface WorkflowStatus {
  active: boolean;
  observations: number;
  ignored_events: number;
  registrations: number;
  latest: WorkflowObservation | null;
  error: WorkflowStatusError | null;
}

export interface WorkflowEntry {
  workflow: StoredWorkflow;
  status: WorkflowStatus;
}

export interface WorkflowList {
  schema_version: 1;
  store: StoreState;
  workflows: WorkflowEntry[];
}

export class WorkflowContractError extends Error {
  public constructor() {
    super("The workflow response does not match the supported contract.");
    this.name = "WorkflowContractError";
  }
}

const WORKFLOW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, names: readonly string[]): boolean {
  return (
    Object.keys(value).length === names.length &&
    names.every((name) => Object.hasOwn(value, name))
  );
}

function boundedRecords(value: unknown, max: number): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length <= max && value.every(record);
}

function counter(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function parseStoredWorkflow(value: unknown): StoredWorkflow {
  if (
    !record(value) ||
    !exactKeys(value, [
      "schema_version",
      "workflow_id",
      "name",
      "description",
      "enabled",
      "triggers",
      "conditions",
      "steps",
    ]) ||
    value.schema_version !== 1 ||
    typeof value.workflow_id !== "string" ||
    !WORKFLOW_ID.test(value.workflow_id) ||
    typeof value.name !== "string" ||
    value.name.trim() === "" ||
    value.name.length > 128 ||
    typeof value.description !== "string" ||
    value.description.length > 512 ||
    typeof value.enabled !== "boolean" ||
    !boundedRecords(value.triggers, 10) ||
    !boundedRecords(value.conditions, 20) ||
    !boundedRecords(value.steps, 25)
  ) {
    throw new WorkflowContractError();
  }
  return {
    schema_version: 1,
    workflow_id: value.workflow_id,
    name: value.name,
    description: value.description,
    enabled: value.enabled,
    triggers: value.triggers,
    conditions: value.conditions,
    steps: value.steps,
  };
}

function parseStatus(value: unknown): WorkflowStatus {
  if (
    !record(value) ||
    !exactKeys(value, [
      "active",
      "observations",
      "ignored_events",
      "registrations",
      "latest",
      "error",
    ]) ||
    typeof value.active !== "boolean" ||
    !counter(value.observations) ||
    !counter(value.ignored_events) ||
    !counter(value.registrations) ||
    (value.error !== null && !(STATUS_ERRORS as readonly unknown[]).includes(value.error)) ||
    (value.active && value.error !== null)
  ) {
    throw new WorkflowContractError();
  }
  let latest: WorkflowObservation | null = null;
  if (value.latest !== null) {
    try {
      latest = parseWorkflowObservation(value.latest);
    } catch {
      throw new WorkflowContractError();
    }
  }
  return {
    active: value.active,
    observations: value.observations,
    ignored_events: value.ignored_events,
    registrations: value.registrations,
    latest,
    error: value.error as WorkflowStatusError | null,
  };
}

function parseEntries(value: unknown): WorkflowEntry[] {
  if (!Array.isArray(value) || value.length > WORKFLOW_LIMIT) {
    throw new WorkflowContractError();
  }
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    if (!record(item) || !exactKeys(item, ["workflow", "status"])) {
      throw new WorkflowContractError();
    }
    const workflow = parseStoredWorkflow(item.workflow);
    if (seen.has(workflow.workflow_id)) {
      throw new WorkflowContractError();
    }
    seen.add(workflow.workflow_id);
    return { workflow, status: parseStatus(item.status) };
  });
}

export function parseWorkflowList(value: unknown): WorkflowList {
  if (
    !record(value) ||
    !exactKeys(value, ["schema_version", "store", "workflows"]) ||
    value.schema_version !== WORKFLOW_RESPONSE_SCHEMA_VERSION ||
    !(STORE_STATES as readonly unknown[]).includes(value.store)
  ) {
    throw new WorkflowContractError();
  }
  const workflows = parseEntries(value.workflows);
  if (value.store !== "ready" && workflows.length > 0) {
    throw new WorkflowContractError();
  }
  return { schema_version: 1, store: value.store as StoreState, workflows };
}

/** Save/set_enabled responses carry the affected document plus the full list. */
function parseMutation(value: unknown, expectedId?: string): WorkflowList & { workflow: StoredWorkflow } {
  if (!record(value) || !Object.hasOwn(value, "workflow")) {
    throw new WorkflowContractError();
  }
  const { workflow: rawWorkflow, ...rest } = value;
  const workflow = parseStoredWorkflow(rawWorkflow);
  if (expectedId !== undefined && workflow.workflow_id !== expectedId) {
    throw new WorkflowContractError();
  }
  const list = parseWorkflowList(rest);
  if (!list.workflows.some((entry) => entry.workflow.workflow_id === workflow.workflow_id)) {
    throw new WorkflowContractError();
  }
  return { ...list, workflow };
}

export async function fetchWorkflows(hass: HomeAssistantLike): Promise<WorkflowList> {
  return parseWorkflowList(await hass.callWS<unknown>({ type: "ai_orchestrator/workflows/list" }));
}

export async function saveWorkflow(
  hass: HomeAssistantLike,
  workflowJson: string,
): Promise<WorkflowList & { workflow: StoredWorkflow }> {
  if (!workflowJson.trim() || workflowJson.length > PREVIEW_INPUT_LIMIT) {
    throw new WorkflowContractError();
  }
  return parseMutation(
    await hass.callWS<unknown>({
      type: "ai_orchestrator/workflows/save",
      workflow_json: workflowJson,
    }),
  );
}

export async function setWorkflowEnabled(
  hass: HomeAssistantLike,
  workflowId: string,
  enabled: boolean,
): Promise<WorkflowList & { workflow: StoredWorkflow }> {
  const result = parseMutation(
    await hass.callWS<unknown>({
      type: "ai_orchestrator/workflows/set_enabled",
      workflow_id: workflowId,
      enabled,
    }),
    workflowId,
  );
  if (result.workflow.enabled !== enabled) {
    throw new WorkflowContractError();
  }
  return result;
}

export async function deleteWorkflow(
  hass: HomeAssistantLike,
  workflowId: string,
): Promise<WorkflowList> {
  const list = parseWorkflowList(
    await hass.callWS<unknown>({
      type: "ai_orchestrator/workflows/delete",
      workflow_id: workflowId,
    }),
  );
  if (list.workflows.some((entry) => entry.workflow.workflow_id === workflowId)) {
    throw new WorkflowContractError();
  }
  return list;
}

export async function observeWorkflow(
  hass: HomeAssistantLike,
  workflowId: string,
): Promise<WorkflowObservation> {
  const value = await hass.callWS<unknown>({
    type: "ai_orchestrator/workflows/run_manual",
    workflow_id: workflowId,
  });
  if (!record(value) || value.schema_version !== WORKFLOW_RESPONSE_SCHEMA_VERSION) {
    throw new WorkflowContractError();
  }
  const observation = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "schema_version"),
  );
  try {
    return parseWorkflowObservation(observation);
  } catch {
    throw new WorkflowContractError();
  }
}
