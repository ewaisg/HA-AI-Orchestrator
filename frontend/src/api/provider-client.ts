import type { HomeAssistantLike } from "../ha/hass-contract";

export const PROVIDER_LIST_REQUEST = Object.freeze({
  type: "ai_orchestrator/providers/list",
});

export const PROVIDER_RESPONSE_SCHEMA_VERSION = 1;

export const PROVIDER_HEALTH_STATES = [
  "healthy",
  "degraded",
  "unavailable",
  "authentication_required",
  "not_tested",
] as const;

export type ProviderHealth = (typeof PROVIDER_HEALTH_STATES)[number];

export const PROVIDER_ERROR_CODES = [
  "authentication",
  "authorization",
  "not_found",
  "rate_limited",
  "context_overflow",
  "safety_refusal",
  "provider_unavailable",
  "invalid_response",
  "timeout",
  "connection",
  "tls",
  "dns",
  "cancelled",
  "unsupported",
  "unknown",
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

export interface ProviderConnection {
  connection_id: string;
  provider_type: string;
  display_name: string;
  title: string;
  health: ProviderHealth;
}

export interface ProviderListResponse {
  schema_version: 1;
  providers: ProviderConnection[];
}

export interface ProviderTestResult {
  schema_version: 1;
  connection_id: string;
  health: ProviderHealth;
  error_code: ProviderErrorCode | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isCanonicalConnectionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      value,
    )
  );
}

function isProviderHealth(value: unknown): value is ProviderHealth {
  return (
    typeof value === "string" &&
    (PROVIDER_HEALTH_STATES as readonly string[]).includes(value)
  );
}

function isProviderErrorCode(value: unknown): value is ProviderErrorCode {
  return (
    typeof value === "string" &&
    (PROVIDER_ERROR_CODES as readonly string[]).includes(value)
  );
}

export function parseProviderList(value: unknown): ProviderListResponse {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "providers"]) ||
    value.schema_version !== PROVIDER_RESPONSE_SCHEMA_VERSION ||
    !Array.isArray(value.providers)
  ) {
    throw new Error("Invalid provider list response");
  }
  const providers: ProviderConnection[] = [];
  for (const item of value.providers) {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, [
        "connection_id",
        "provider_type",
        "display_name",
        "title",
        "health",
      ]) ||
      !isCanonicalConnectionId(item.connection_id) ||
      typeof item.provider_type !== "string" ||
      !/^[a-z][a-z0-9_]{0,63}$/u.test(item.provider_type) ||
      typeof item.display_name !== "string" ||
      item.display_name.trim() === "" ||
      typeof item.title !== "string" ||
      item.title.trim() === "" ||
      !isProviderHealth(item.health)
    ) {
      throw new Error("Invalid provider entry in list");
    }
    providers.push({
      connection_id: item.connection_id,
      provider_type: item.provider_type,
      display_name: item.display_name,
      title: item.title,
      health: item.health,
    });
  }
  return { schema_version: PROVIDER_RESPONSE_SCHEMA_VERSION, providers };
}

export function parseProviderTestResult(
  value: unknown,
  expectedConnectionId?: string,
): ProviderTestResult {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "connection_id", "health", "error_code"]) ||
    value.schema_version !== PROVIDER_RESPONSE_SCHEMA_VERSION ||
    !isCanonicalConnectionId(value.connection_id) ||
    (expectedConnectionId !== undefined && value.connection_id !== expectedConnectionId) ||
    !isProviderHealth(value.health) ||
    (value.error_code !== null && !isProviderErrorCode(value.error_code)) ||
    (value.health === "healthy" && value.error_code !== null) ||
    (value.health !== "healthy" && value.error_code === null)
  ) {
    throw new Error("Invalid provider test response");
  }
  return {
    schema_version: PROVIDER_RESPONSE_SCHEMA_VERSION,
    connection_id: value.connection_id,
    health: value.health,
    error_code: value.error_code,
  };
}

export async function fetchProviderList(
  hass: HomeAssistantLike,
): Promise<ProviderListResponse> {
  const response = await hass.callWS<unknown>({ ...PROVIDER_LIST_REQUEST });
  return parseProviderList(response);
}

export async function testProviderConnection(
  hass: HomeAssistantLike,
  connectionId: string,
): Promise<ProviderTestResult> {
  const response = await hass.callWS<unknown>({
    type: "ai_orchestrator/providers/test",
    connection_id: connectionId,
  });
  return parseProviderTestResult(response, connectionId);
}
