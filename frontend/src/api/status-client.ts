import type { HomeAssistantLike } from "../ha/hass-contract";

export const STATUS_REQUEST = Object.freeze({
  type: "ai_orchestrator/status",
});

export const STATUS_SCHEMA_VERSION = 1 as const;

export const STATUS_FEATURE_KEYS = [
  "providers",
  "workflows",
  "conversation",
  "ai_task",
] as const;

export type StatusFeature = (typeof STATUS_FEATURE_KEYS)[number];

export interface OrchestratorStatus {
  schema_version: typeof STATUS_SCHEMA_VERSION;
  phase: "foundation";
  configured: boolean;
  features: Record<StatusFeature, boolean>;
}

export class StatusContractError extends Error {
  public constructor() {
    super("The status response does not match the supported foundation contract.");
    this.name = "StatusContractError";
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

export function parseOrchestratorStatus(value: unknown): OrchestratorStatus {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "phase", "configured", "features"]) ||
    !isRecord(value.features) ||
    !hasExactKeys(value.features, STATUS_FEATURE_KEYS)
  ) {
    throw new StatusContractError();
  }
  const features = value.features;

  if (
    value.schema_version !== STATUS_SCHEMA_VERSION ||
    value.phase !== "foundation" ||
    typeof value.configured !== "boolean" ||
    STATUS_FEATURE_KEYS.some((key) => features[key] !== false)
  ) {
    throw new StatusContractError();
  }

  return {
    schema_version: STATUS_SCHEMA_VERSION,
    phase: "foundation",
    configured: value.configured,
    features: {
      providers: features.providers as boolean,
      workflows: features.workflows as boolean,
      conversation: features.conversation as boolean,
      ai_task: features.ai_task as boolean,
    },
  };
}

export async function fetchOrchestratorStatus(
  hass: HomeAssistantLike,
): Promise<OrchestratorStatus> {
  const response = await hass.callWS<unknown>({ ...STATUS_REQUEST });
  return parseOrchestratorStatus(response);
}

export function isAccessDeniedFailure(error: unknown): boolean {
  return isRecord(error) && error.code === "unauthorized";
}
