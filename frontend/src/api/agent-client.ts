import type { HomeAssistantLike } from "../ha/hass-contract";
import { newRequestId } from "./chat-client";

export interface AgentProfile {
  connection_id: string;
  revision: number;
  observe_registry_ids: string[];
  action_scopes: never[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function record(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
export function parseAgentProfile(value: unknown): AgentProfile {
  if (!record(value, ["connection_id", "revision", "observe_registry_ids", "action_scopes"]) ||
      typeof value.connection_id !== "string" || !UUID.test(value.connection_id) ||
      !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 ||
      !Array.isArray(value.observe_registry_ids) || value.observe_registry_ids.length > 64 ||
      value.observe_registry_ids.some((id: unknown) => typeof id !== "string" || !id.trim() || id.length > 64) ||
      new Set(value.observe_registry_ids).size !== value.observe_registry_ids.length ||
      !Array.isArray(value.action_scopes) || value.action_scopes.length !== 0) {
    throw new Error("Unsupported agent policy");
  }
  return { connection_id: value.connection_id, revision: value.revision as number,
    observe_registry_ids: [...value.observe_registry_ids] as string[], action_scopes: [] };
}
export async function fetchAgentProfiles(hass: HomeAssistantLike): Promise<AgentProfile[]> {
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/agents/list" });
  if (!record(value, ["schema_version", "profiles"]) || value.schema_version !== 1 || !Array.isArray(value.profiles) || value.profiles.length > 32) {
    throw new Error("Unsupported agent policies");
  }
  const profiles = value.profiles.map(parseAgentProfile);
  if (new Set(profiles.map((profile) => profile.connection_id)).size !== profiles.length) throw new Error("Duplicate policy");
  return profiles;
}
export async function saveAgentProfile(hass: HomeAssistantLike, profile: AgentProfile): Promise<AgentProfile> {
  const valid = parseAgentProfile(profile);
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/agents/save", connection_id: valid.connection_id,
    expected_revision: valid.revision, observe_registry_ids: valid.observe_registry_ids });
  if (!record(value, ["schema_version", "profile"]) || value.schema_version !== 1) throw new Error("Unsupported policy response");
  const saved = parseAgentProfile(value.profile);
  if (saved.connection_id !== valid.connection_id || saved.revision !== valid.revision + 1 ||
      [...saved.observe_registry_ids].sort().join("\n") !== [...valid.observe_registry_ids].sort().join("\n")) throw new Error("Policy response mismatch");
  return saved;
}

const TOOL_ERRORS = ["busy", "not_verified", "not_authorized", "invalid_request", "invalid_response", "provider_failed", "provider_unavailable", "failed", "limit_exceeded", "timeout"];
export async function probeAgentTools(hass: HomeAssistantLike, connectionId: string): Promise<boolean> {
  if (!UUID.test(connectionId)) throw new Error("Invalid agent");
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/agents/probe_tools", connection_id: connectionId });
  if (!record(value, ["schema_version", "connection_id", "supported", "error_code"]) || value.schema_version !== 1 ||
      value.connection_id !== connectionId || typeof value.supported !== "boolean" ||
      (value.supported ? value.error_code !== null : typeof value.error_code !== "string" || !TOOL_ERRORS.includes(value.error_code))) throw new Error("Unsupported probe result");
  return value.supported;
}
export interface ScopedAnswer { text: string; provider_calls: number; tool_calls: number; trace: ("provider_response" | "state_read")[] }
export async function askScopedAgent(hass: HomeAssistantLike, profile: AgentProfile, prompt: string): Promise<ScopedAnswer> {
  parseAgentProfile(profile);
  if (!prompt.trim() || prompt.length > 4000) throw new Error("Invalid question");
  const requestId = newRequestId();
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/agents/chat", connection_id: profile.connection_id,
    expected_revision: profile.revision, request_id: requestId, prompt });
  if (!record(value, ["schema_version", "connection_id", "request_id", "text", "provider_calls", "tool_calls", "trace", "destination", "actions_executed"]) ||
      value.schema_version !== 1 || value.connection_id !== profile.connection_id || value.request_id !== requestId ||
      value.destination !== "local" || value.actions_executed !== 0 || typeof value.text !== "string" || !value.text.trim() || value.text.length > 2000 ||
      !Number.isInteger(value.provider_calls) || (value.provider_calls as number) < 1 || (value.provider_calls as number) > 4 ||
      !Number.isInteger(value.tool_calls) || (value.tool_calls as number) < 0 || (value.tool_calls as number) > 4 ||
      !Array.isArray(value.trace) || value.trace.length > 8 || value.trace.some((item: unknown) => item !== "provider_response" && item !== "state_read") ||
      value.trace.filter((item: unknown) => item === "provider_response").length !== value.provider_calls ||
      value.trace.filter((item: unknown) => item === "state_read").length !== value.tool_calls) throw new Error("Unsupported agent answer");
  return { text: value.text, provider_calls: value.provider_calls as number, tool_calls: value.tool_calls as number, trace: [...value.trace] as ScopedAnswer["trace"] };
}
