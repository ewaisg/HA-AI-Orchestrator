import type { HomeAssistantLike } from "../ha/hass-contract";
import { PREVIEW_INPUT_LIMIT, previewChecks, type PreviewCheck } from "./workflow-preview-client";

export const DRY_RUN_MAX_TEXT_CHARS = 2000;
export const DRY_RUN_MAX_STEPS = 25;
export const DRY_RUN_STATUSES = ["ok", "planned", "failed", "skipped", "taken", "not_taken"] as const;
export const DRY_RUN_STEP_KINDS = ["ai_compose", "ai_classify", "ai_extract", "branch", "notify"] as const;
export const DRY_RUN_MAX_VALUE_CHARS = 500;
export const DRY_RUN_ERRORS = {
  invalid_output: "The model reply did not match the required shape",
  timeout: "The provider took too long to reply",
  provider_failed: "The provider request failed",
} as const;

export type DryRunStatus = (typeof DRY_RUN_STATUSES)[number];
export type DryRunStepKind = (typeof DRY_RUN_STEP_KINDS)[number];
export const DRY_RUN_TARGETS = ["entity", "service", "missing"] as const;
export interface DryRunStep {
  index: number; step_id: string; kind: DryRunStepKind; executed: boolean; status: DryRunStatus;
  text?: string; category?: string; values?: Record<string, string | number | boolean>; error?: string; message_step_id?: string | null; target?: (typeof DRY_RUN_TARGETS)[number];
}
export interface DryRunResult {
  schema_version: 1; mode: "dry_run"; workflow_id: string; destination: "local";
  triggered: boolean; conditions_passed: boolean; eligible: boolean;
  trigger_results: PreviewCheck[]; condition_results: PreviewCheck[];
  steps: DryRunStep[]; provider_calls: number; actions_executed: 0; completed: boolean;
}
export class DryRunContractError extends Error {
  public constructor() { super("Workflow dry-run response is unsupported."); }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const STEP_ID = /^[a-z][a-z0-9_]{0,63}$/u;
const RESULT_KEYS = ["schema_version", "mode", "workflow_id", "destination", "triggered", "conditions_passed", "eligible", "trigger_results", "condition_results", "steps", "provider_calls", "actions_executed", "completed"];
const TRIGGER_REASONS = ["matched", "event_kind_mismatch", "state_unchanged", "entity_not_selected", "target_state_mismatch", "time_mismatch"];
const CONDITION_REASONS = ["matched", "outside_time_window", "state_unavailable", "state_mismatch", "state_not_numeric", "outside_numeric_bounds"];

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, names: readonly string[]): boolean {
  return Object.keys(value).length === names.length && names.every((name) => Object.hasOwn(value, name));
}
function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function step(value: unknown, index: number): value is DryRunStep {
  if (!record(value) || value.index !== index || !text(value.step_id, 64) || !STEP_ID.test(value.step_id as string) ||
      !DRY_RUN_STEP_KINDS.includes(value.kind as DryRunStepKind) || typeof value.executed !== "boolean" ||
      !DRY_RUN_STATUSES.includes(value.status as DryRunStatus)) return false;
  const base = ["index", "step_id", "kind", "executed", "status"];
  const ai = value.kind === "ai_compose" || value.kind === "ai_classify" || value.kind === "ai_extract";
  switch (value.status) {
    case "ok":
      if (!ai || value.executed !== true) return false;
      if (value.kind === "ai_compose") return keys(value, [...base, "text"]) && text(value.text, DRY_RUN_MAX_TEXT_CHARS);
      if (value.kind === "ai_classify") return keys(value, [...base, "category"]) && text(value.category, 64);
      return keys(value, [...base, "values"]) && record(value.values) && Object.keys(value.values).length <= 10 &&
        Object.entries(value.values).every(([name, item]) => STEP_ID.test(name) && ((typeof item === "string" && item.length <= DRY_RUN_MAX_VALUE_CHARS) || (typeof item === "number" && Number.isFinite(item)) || typeof item === "boolean"));
    case "taken":
    case "not_taken":
      return value.kind === "branch" && value.executed === false && keys(value, base);
    case "planned":
      return !ai && value.executed === false && (keys(value, [...base, "message_step_id"]) || (keys(value, [...base, "message_step_id", "target"]) && DRY_RUN_TARGETS.includes(value.target as never))) &&
        (value.message_step_id === null || (text(value.message_step_id, 64) && STEP_ID.test(value.message_step_id as string)));
    case "failed":
      return ai && value.executed === false && keys(value, [...base, "error"]) && text(value.error, 64);
    default:
      return value.executed === false && keys(value, base);
  }
}

export function parseDryRun(value: unknown, workflowId: string): DryRunResult {
  if (!record(value) || !keys(value, RESULT_KEYS) || value.schema_version !== 1 || value.mode !== "dry_run" ||
      value.workflow_id !== workflowId || value.destination !== "local" || typeof value.triggered !== "boolean" ||
      typeof value.conditions_passed !== "boolean" || typeof value.eligible !== "boolean" || typeof value.completed !== "boolean" ||
      value.actions_executed !== 0 || !Number.isInteger(value.provider_calls) || (value.provider_calls as number) < 0 ||
      !previewChecks(value.trigger_results, 10, TRIGGER_REASONS) || !previewChecks(value.condition_results, 20, CONDITION_REASONS) ||
      !Array.isArray(value.steps) || value.steps.length > DRY_RUN_MAX_STEPS ||
      !value.steps.every((item: unknown, index) => step(item, index)) ||
      value.triggered !== value.trigger_results.some((item) => item.passed) ||
      value.conditions_passed !== value.condition_results.every((item) => item.passed)) throw new DryRunContractError();
  const steps = value.steps as DryRunStep[];
  const calls = steps.filter((item) => item.kind !== "notify" && (item.status === "ok" || item.status === "failed")).length;
  const eligible = value.eligible as boolean;
  if (!eligible && (steps.length > 0 || value.provider_calls !== 0 || value.completed !== false)) throw new DryRunContractError();
  if (eligible && (!(value.triggered && value.conditions_passed) || steps.length === 0 || value.provider_calls !== calls ||
      value.completed !== !steps.some((item) => item.status === "failed"))) throw new DryRunContractError();
  const stopAt = steps.findIndex((item) => item.status === "failed" || item.status === "not_taken");
  if (steps.some((item, index) => (item.status === "skipped") !== (stopAt !== -1 && index > stopAt))) throw new DryRunContractError();
  if (steps.some((item) => item.kind === "branch" && item.status !== "taken" && item.status !== "not_taken" && item.status !== "skipped")) throw new DryRunContractError();
  return value as unknown as DryRunResult;
}

export async function dryRunWorkflow(hass: HomeAssistantLike, workflowId: string, connectionId: string, snapshot: string): Promise<DryRunResult> {
  if (!UUID.test(workflowId) || !UUID.test(connectionId) || !snapshot.trim() || snapshot.length > PREVIEW_INPUT_LIMIT) throw new DryRunContractError();
  return parseDryRun(await hass.callWS<unknown>({ type: "ai_orchestrator/workflows/dry_run", workflow_id: workflowId, connection_id: connectionId, snapshot_json: snapshot }), workflowId);
}
