import type { HomeAssistantLike } from "../ha/hass-contract";

export const PREVIEW_INPUT_LIMIT = 131072;
export const PREVIEW_REASONS = {
  matched: "Matched", event_kind_mismatch: "Event type did not match",
  state_unchanged: "State did not change", entity_not_selected: "Entity was not selected",
  target_state_mismatch: "Target state did not match", time_mismatch: "Time did not match",
  outside_time_window: "Outside the time window", state_unavailable: "State unavailable",
  state_mismatch: "State did not match", state_not_numeric: "State is not numeric",
  outside_numeric_bounds: "Outside numeric bounds",
} as const;
export interface PreviewCheck { index: number; passed: boolean; reason: keyof typeof PREVIEW_REASONS }
export interface WorkflowPreview {
  schema_version: 1; mode: "offline"; enabled: boolean; triggered: boolean;
  conditions_passed: boolean; eligible: boolean; trigger_results: PreviewCheck[];
  condition_results: PreviewCheck[]; planned_steps: { index: number; kind: "ai_compose" | "ai_classify" | "notify" }[];
  provider_calls: 0; actions_executed: 0;
}
export class PreviewContractError extends Error {
  public constructor() { super("Workflow preview response is unsupported."); }
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, names: string[]): boolean {
  return Object.keys(value).length === names.length && names.every((name) => Object.hasOwn(value, name));
}
function checks(value: unknown, max: number, reasons: string[]): value is PreviewCheck[] {
  return Array.isArray(value) && value.length <= max && value.every((item: unknown, index) =>
    record(item) && keys(item, ["index", "passed", "reason"]) && item.index === index &&
    typeof item.passed === "boolean" && typeof item.reason === "string" && reasons.includes(item.reason) &&
    item.passed === (item.reason === "matched"));
}
export type WorkflowObservation = Omit<WorkflowPreview, "schema_version" | "mode"> & { mode: "observation_only" };
const EVALUATION_KEYS = ["mode", "enabled", "triggered", "conditions_passed", "eligible", "trigger_results", "condition_results", "planned_steps", "provider_calls", "actions_executed"];
function evaluation(value: unknown, mode: string, withSchema: boolean): value is Record<string, unknown> {
  return record(value) && keys(value, withSchema ? ["schema_version", ...EVALUATION_KEYS] : EVALUATION_KEYS) &&
    (!withSchema || value.schema_version === 1) && value.mode === mode;
}
/** Live observation recorded by an active stored workflow; same closed shape, no schema_version. */
export function parseWorkflowObservation(value: unknown): WorkflowObservation {
  if (!evaluation(value, "observation_only", false)) throw new PreviewContractError();
  return parseEvaluation(value) as unknown as WorkflowObservation;
}
export function parseWorkflowPreview(value: unknown): WorkflowPreview {
  if (!evaluation(value, "offline", true)) throw new PreviewContractError();
  return parseEvaluation(value) as unknown as WorkflowPreview;
}
function parseEvaluation(value: Record<string, unknown>): Record<string, unknown> {
  if (typeof value.enabled !== "boolean" ||
    typeof value.triggered !== "boolean" || typeof value.conditions_passed !== "boolean" || typeof value.eligible !== "boolean" ||
    value.provider_calls !== 0 || value.actions_executed !== 0 ||
    !checks(value.trigger_results, 10, ["matched", "event_kind_mismatch", "state_unchanged", "entity_not_selected", "target_state_mismatch", "time_mismatch"]) ||
    !checks(value.condition_results, 20, ["matched", "outside_time_window", "state_unavailable", "state_mismatch", "state_not_numeric", "outside_numeric_bounds"]) ||
    !Array.isArray(value.planned_steps) || value.planned_steps.length > 25 ||
    !value.planned_steps.every((step: unknown, index) => record(step) && keys(step, ["index", "kind"]) && step.index === index && ["ai_compose", "ai_classify", "notify"].includes(step.kind as string)) ||
    value.triggered !== value.trigger_results.some((item) => item.passed) ||
    value.conditions_passed !== value.condition_results.every((item) => item.passed) ||
    value.eligible !== (value.planned_steps.length > 0) ||
    (value.eligible && (!value.triggered || !value.conditions_passed))) throw new PreviewContractError();
  return value;
}
export async function previewWorkflow(hass: HomeAssistantLike, workflow: string, snapshot: string): Promise<WorkflowPreview> {
  if (!workflow.trim() || !snapshot.trim() || workflow.length > PREVIEW_INPUT_LIMIT || snapshot.length > PREVIEW_INPUT_LIMIT) throw new PreviewContractError();
  return parseWorkflowPreview(await hass.callWS<unknown>({ type: "ai_orchestrator/workflow/preview", workflow_json: workflow, snapshot_json: snapshot }));
}
