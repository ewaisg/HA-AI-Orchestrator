import type { HomeAssistantLike } from "../ha/hass-contract";

export const WORKFLOW_PROBE_REQUEST = Object.freeze({
  type: "ai_orchestrator/workflow/probe/run",
});

export const WORKFLOW_PROBE_SCHEMA_VERSION = 1 as const;

export interface WorkflowProbeResult {
  schema_version: typeof WORKFLOW_PROBE_SCHEMA_VERSION;
  workflow_id: "foundation_lifecycle_probe";
  trigger_type: "integration_event";
  execution_count: number;
  executions_for_trigger: 1;
  registration_count: number;
  provider_contacted: false;
  home_assistant_action_called: false;
}

export class WorkflowProbeContractError extends Error {
  public constructor() {
    super("The workflow lifecycle probe response does not match the supported contract.");
    this.name = "WorkflowProbeContractError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function parseWorkflowProbeResult(value: unknown): WorkflowProbeResult {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schema_version",
      "workflow_id",
      "trigger_type",
      "execution_count",
      "executions_for_trigger",
      "registration_count",
      "provider_contacted",
      "home_assistant_action_called",
    ]) ||
    value.schema_version !== WORKFLOW_PROBE_SCHEMA_VERSION ||
    value.workflow_id !== "foundation_lifecycle_probe" ||
    value.trigger_type !== "integration_event" ||
    !isPositiveInteger(value.execution_count) ||
    value.executions_for_trigger !== 1 ||
    !isPositiveInteger(value.registration_count) ||
    value.provider_contacted !== false ||
    value.home_assistant_action_called !== false
  ) {
    throw new WorkflowProbeContractError();
  }

  return value as unknown as WorkflowProbeResult;
}

export async function runWorkflowProbe(
  hass: HomeAssistantLike,
): Promise<WorkflowProbeResult> {
  const response = await hass.callWS<unknown>({ ...WORKFLOW_PROBE_REQUEST });
  return parseWorkflowProbeResult(response);
}
