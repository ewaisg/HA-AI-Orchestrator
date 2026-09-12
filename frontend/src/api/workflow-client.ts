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
export const RUN_MODES = ["observe", "execute"] as const;
export const EXECUTION_STEP_STATUSES = ["ok", "planned", "failed", "skipped", "delivered", "taken", "not_taken"] as const;
export type RunMode = (typeof RUN_MODES)[number];
export interface ExecutionStep { index: number; step_id: string; kind: string; executed: boolean; status: (typeof EXECUTION_STEP_STATUSES)[number]; error?: string; category?: string; target?: string }
export interface ExecutionRecord { started_at: string; finished_at?: string; steps: ExecutionStep[]; provider_calls: number; actions_executed: number; completed: boolean; error: string | null }

export type StoreState = (typeof STORE_STATES)[number];
export type WorkflowStatusError = (typeof STATUS_ERRORS)[number];

export interface StoredWorkflow {
  schema_version: 1;
  workflow_id: string;
  name: string;
  description: string;
  enabled: boolean;
  run_mode: RunMode;
  provider_connection_id: string | null;
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
  executions: number;
  execution_failures: number;
  skipped_busy: number;
  execution_running: boolean;
  last_execution: ExecutionRecord | null;
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
const CONNECTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const STEP_ID = /^[a-z][a-z0-9_]{0,63}$/u;

function parseExecutionRecord(value: unknown): ExecutionRecord {
  const keys = ["started_at", "steps", "provider_calls", "actions_executed", "completed", "error"];
  if (!record(value) || !(exactKeys(value, keys) || exactKeys(value, [...keys, "finished_at"])) ||
      typeof value.started_at !== "string" || value.started_at.length > 40 ||
      ("finished_at" in value && (typeof value.finished_at !== "string" || value.finished_at.length > 40)) ||
      !Array.isArray(value.steps) || value.steps.length > 25 || !counter(value.provider_calls) || !counter(value.actions_executed) ||
      typeof value.completed !== "boolean" || (value.error !== null && (typeof value.error !== "string" || value.error.length > 64))) {
    throw new WorkflowContractError();
  }
  const steps = value.steps.map((item: unknown, index): ExecutionStep => {
    if (!record(item) || item.index !== index || typeof item.step_id !== "string" || !STEP_ID.test(item.step_id) || typeof item.kind !== "string" ||
        typeof item.executed !== "boolean" || !(EXECUTION_STEP_STATUSES as readonly unknown[]).includes(item.status) ||
        Object.keys(item).some((key) => !["index", "step_id", "kind", "executed", "status", "error", "category", "target"].includes(key)) ||
        ("error" in item && (typeof item.error !== "string" || item.error.length > 64)) || ("category" in item && (typeof item.category !== "string" || item.category.length > 64)) ||
        ("target" in item && !["entity", "service", "missing"].includes(item.target as string))) {
      throw new WorkflowContractError();
    }
    return item as unknown as ExecutionStep;
  });
  // A run is completed exactly when it carries no error; a failed step always
  // means an error, and steps after a not-taken branch (or after the failure,
  // or when no provider was available) are skipped.
  if (value.completed !== (value.error === null) || (value.completed && steps.some((step) => step.status === "failed"))) throw new WorkflowContractError();
  const stopAt = steps.findIndex((step) => step.status === "failed" || step.status === "not_taken");
  if (steps.some((step, index) => step.status === "skipped" && !(stopAt !== -1 && index > stopAt) && !(value.error === "provider_unavailable"))) throw new WorkflowContractError();
  if (value.actions_executed !== steps.filter((step) => step.status === "delivered").length) throw new WorkflowContractError();
  return { ...(value as unknown as ExecutionRecord), steps };
}

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
      "run_mode",
      "provider_connection_id",
      "triggers",
      "conditions",
      "steps",
    ]) ||
    value.schema_version !== 1 ||
    !(RUN_MODES as readonly unknown[]).includes(value.run_mode) ||
    (value.provider_connection_id !== null && (typeof value.provider_connection_id !== "string" || !CONNECTION_ID.test(value.provider_connection_id))) ||
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
    run_mode: value.run_mode as RunMode,
    provider_connection_id: value.provider_connection_id as string | null,
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
      "executions",
      "execution_failures",
      "skipped_busy",
      "execution_running",
      "last_execution",
    ]) ||
    typeof value.active !== "boolean" ||
    !counter(value.executions) || !counter(value.execution_failures) || !counter(value.skipped_busy) || typeof value.execution_running !== "boolean" ||
    (value.execution_failures as number) > (value.executions as number) ||
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
  let lastExecution: ExecutionRecord | null = null;
  if (value.last_execution !== null) lastExecution = parseExecutionRecord(value.last_execution);
  return {
    active: value.active,
    observations: value.observations,
    ignored_events: value.ignored_events,
    registrations: value.registrations,
    latest,
    error: value.error as WorkflowStatusError | null,
    executions: value.executions as number,
    execution_failures: value.execution_failures as number,
    skipped_busy: value.skipped_busy as number,
    execution_running: value.execution_running as boolean,
    last_execution: lastExecution,
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
