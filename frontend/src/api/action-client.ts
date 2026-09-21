import type { HomeAssistantLike } from "../ha/hass-contract";
import { newRequestId } from "./chat-client";

export const ACTION_LABELS = {
  light_turn_on_v1: "Turn light on", light_turn_off_v1: "Turn light off",
  switch_turn_on_v1: "Turn switch on", switch_turn_off_v1: "Turn switch off",
  media_play_v1: "Play media", media_pause_v1: "Pause media", media_volume_v1: "Set media volume",
} as const;
export type ActionTool = keyof typeof ACTION_LABELS;
export interface ActionScope { tool_id: ActionTool; registry_ids: string[] }
export interface SwitchReview { registry_id: string; classification: "ordinary_noncritical"; review_id: string; reviewed_at: string }
export interface SwitchCandidate extends ActionTarget { device_name: string; status: "unreviewed" | "reviewed" | "stale" }
export interface SwitchPreview extends ActionTarget { revision: number; device_name: string; review_token: string; expires_in: 300 }
export interface ActionProfile { connection_id: string; revision: number; action_scopes: ActionScope[]; switch_reviews: SwitchReview[] }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function record(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function text(value: unknown, max = 256): value is string {
  return typeof value === "string" && !!value.trim() && value.length <= max;
}
function tool(value: unknown): value is ActionTool { return typeof value === "string" && Object.hasOwn(ACTION_LABELS, value); }
function revision(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }
function reviewTime(value: unknown): value is string {
  return typeof value === "string" && !value.startsWith("0000") && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{6})?\+00:00$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}
export function parseActionProfile(value: unknown): ActionProfile {
  if (!record(value, ["connection_id", "revision", "action_scopes", "switch_reviews"]) || !text(value.connection_id) ||
    !UUID.test(value.connection_id) || !revision(value.revision) || !Array.isArray(value.action_scopes) || value.action_scopes.length > 7) throw new Error("Unsupported action policy");
  const scopes: ActionScope[] = value.action_scopes.map((item: unknown) => {
    if (!record(item, ["tool_id", "registry_ids"]) || !tool(item.tool_id) || !Array.isArray(item.registry_ids) ||
      !item.registry_ids.length || item.registry_ids.length > 64 || item.registry_ids.some((id: unknown) => !text(id, 64)) ||
      new Set(item.registry_ids).size !== item.registry_ids.length) throw new Error("Unsupported action grant");
    return { tool_id: item.tool_id, registry_ids: [...item.registry_ids] as string[] };
  });
  if (new Set(scopes.map((scope) => scope.tool_id)).size !== scopes.length || scopes.reduce((sum, scope) => sum + scope.registry_ids.length, 0) > 64) throw new Error("Unsupported action grants");
  if (!Array.isArray(value.switch_reviews) || value.switch_reviews.length > 64) throw new Error("Unsupported switch reviews");
  const reviews = value.switch_reviews.map((review: unknown): SwitchReview => {
    if (!record(review, ["registry_id", "classification", "review_id", "reviewed_at"]) || !text(review.registry_id, 64) || review.classification !== "ordinary_noncritical" || !text(review.review_id) || !UUID.test(review.review_id) || review.review_id[14] !== "4" || !reviewTime(review.reviewed_at)) throw new Error("Unsupported switch review");
    return { registry_id: review.registry_id, classification: review.classification, review_id: review.review_id, reviewed_at: review.reviewed_at };
  });
  if (new Set(reviews.map(review => review.registry_id)).size !== reviews.length || new Set(reviews.map(review => review.review_id)).size !== reviews.length || scopes.some(scope => scope.tool_id.startsWith("switch_") && scope.registry_ids.some(id => !reviews.some(review => review.registry_id === id)))) throw new Error("Unreviewed switch grant");
  return { connection_id: value.connection_id, revision: value.revision, action_scopes: scopes, switch_reviews: reviews };
}

export interface ActionTarget { registry_id: string; entity_id: string; name: string }
export interface ActionCatalogTool { tool_id: ActionTool; label: string; risk: "medium" | "high"; arguments: "none" | "volume"; targets: ActionTarget[] }
export interface ActionCatalog { profile: ActionProfile; tools: ActionCatalogTool[]; switch_candidates: SwitchCandidate[] }
export interface ActionProposal {
  connection_id: string; request_id: string; token: string; expires_in: number;
  tool_id: ActionTool; entity_id: string; risk: "medium" | "high"; arguments: Record<string, number>; state: string;
}
function args(value: unknown, id: ActionTool): value is Record<string, number> {
  return id === "media_volume_v1" ? record(value, ["volume_level"]) && typeof value.volume_level === "number" &&
    Number.isFinite(value.volume_level) && value.volume_level >= 0 && value.volume_level <= 1 : record(value, []);
}
export async function fetchActionCatalog(hass: HomeAssistantLike, connection: string): Promise<ActionCatalog> {
  if (!UUID.test(connection)) throw new Error("Invalid provider");
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/actions/catalog", connection_id: connection });
  if (!record(value, ["schema_version", "profile", "tools", "switch_candidates"]) || value.schema_version !== 2 || !Array.isArray(value.tools) || value.tools.length > 7) throw new Error("Unsupported action catalog");
  const profile = parseActionProfile(value.profile);
  if (profile.connection_id !== connection) throw new Error("Mismatched action policy");
  const tools = value.tools.map((item: unknown): ActionCatalogTool => {
    if (!record(item, ["tool_id", "label", "risk", "arguments", "targets"]) || !tool(item.tool_id) || !text(item.label) ||
      item.risk !== (item.tool_id.startsWith("switch_") ? "high" : "medium") || item.arguments !== (item.tool_id === "media_volume_v1" ? "volume" : "none") ||
      !Array.isArray(item.targets) || item.targets.length > 10000) throw new Error("Unsupported action tool");
    const targets = item.targets.map((target: unknown): ActionTarget => {
      if (!record(target, ["registry_id", "entity_id", "name"]) || !text(target.registry_id, 64) || !text(target.entity_id) || !text(target.name, 1000)) throw new Error("Unsupported action target");
      return { registry_id: target.registry_id, entity_id: target.entity_id, name: target.name };
    });
    if (new Set(targets.map((target) => target.registry_id)).size !== targets.length) throw new Error("Duplicate action target");
    return { tool_id: item.tool_id, label: item.label, risk: item.risk as "medium" | "high", arguments: item.tool_id === "media_volume_v1" ? "volume" : "none", targets };
  });
  if (new Set(tools.map((item) => item.tool_id)).size !== tools.length) throw new Error("Duplicate action tool");
  if (!Array.isArray(value.switch_candidates) || value.switch_candidates.length > 500) throw new Error("Unsupported switch candidates");
  const candidates = value.switch_candidates.map((item: unknown): SwitchCandidate => {
    if (!record(item, ["registry_id", "entity_id", "name", "device_name", "status"]) || !text(item.registry_id, 64) || !text(item.entity_id) || !/^switch\.[a-z0-9_]+$/.test(item.entity_id) || !text(item.name, 1000) || !text(item.device_name, 1000) || !["unreviewed", "reviewed", "stale"].includes(item.status as string)) throw new Error("Unsupported switch candidate");
    if ((item.status !== "unreviewed") !== profile.switch_reviews.some(review => review.registry_id === item.registry_id)) throw new Error("Mismatched switch review");
    return { registry_id: item.registry_id, entity_id: item.entity_id, name: item.name, device_name: item.device_name, status: item.status as SwitchCandidate["status"] };
  });
  if (new Set(candidates.map(item => item.registry_id)).size !== candidates.length || tools.some(item => item.tool_id.startsWith("switch_") && item.targets.some(target => !candidates.some(candidate => candidate.registry_id === target.registry_id && candidate.entity_id === target.entity_id && candidate.status === "reviewed")))) throw new Error("Unreviewed switch target");
  return { profile, tools, switch_candidates: candidates };
}
export async function saveActionProfile(hass: HomeAssistantLike, profile: ActionProfile): Promise<ActionProfile> {
  const valid = parseActionProfile(profile);
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/actions/save", connection_id: valid.connection_id, expected_revision: valid.revision, action_scopes: valid.action_scopes });
  if (!record(value, ["schema_version", "profile"]) || value.schema_version !== 2) throw new Error("Unsupported action save");
  const saved = parseActionProfile(value.profile);
  const canonical = (scopes: ActionScope[]) => JSON.stringify(scopes.map((scope) => ({ tool_id: scope.tool_id, registry_ids: [...scope.registry_ids].sort() })).sort((a, b) => a.tool_id.localeCompare(b.tool_id)));
  if (saved.connection_id !== valid.connection_id || saved.revision !== valid.revision + 1 || canonical(saved.action_scopes) !== canonical(valid.action_scopes) || JSON.stringify(saved.switch_reviews) !== JSON.stringify(valid.switch_reviews)) throw new Error("Mismatched action save");
  return saved;
}
export async function previewSwitchReview(hass: HomeAssistantLike, profile: ActionProfile, target: SwitchCandidate): Promise<SwitchPreview> {
  parseActionProfile(profile);
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/actions/switch_review/preview", connection_id: profile.connection_id, expected_revision: profile.revision, registry_id: target.registry_id });
  if (!record(value, ["schema_version", "revision", "registry_id", "entity_id", "name", "device_name", "review_token", "expires_in"]) || value.schema_version !== 2 || value.revision !== profile.revision || value.registry_id !== target.registry_id || value.entity_id !== target.entity_id || value.name !== target.name || value.device_name !== target.device_name || !text(value.review_token, 128) || value.expires_in !== 300) throw new Error("Changed switch review target");
  return { revision: profile.revision, registry_id: target.registry_id, entity_id: target.entity_id, name: target.name, device_name: target.device_name, review_token: value.review_token, expires_in: 300 };
}
export async function updateSwitchReview(hass: HomeAssistantLike, profile: ActionProfile, registryId: string, preview?: SwitchPreview): Promise<ActionProfile> {
  parseActionProfile(profile);
  if (!text(registryId, 64) || (preview && (preview.registry_id !== registryId || preview.revision !== profile.revision))) throw new Error("Changed switch review");
  const value = await hass.callWS<unknown>({
    type: `ai_orchestrator/actions/switch_review/${preview ? "save" : "revoke"}`,
    connection_id: profile.connection_id, expected_revision: profile.revision, registry_id: registryId,
    ...(preview ? { review_token: preview.review_token, classification: "ordinary_noncritical", attestations: { physical_target_verified: true, single_device: true, not_security_or_life_safety: true } } : {}),
  });
  if (!record(value, ["schema_version", "profile"]) || value.schema_version !== 2) throw new Error("Unsupported switch review save");
  const saved = parseActionProfile(value.profile);
  const scopes = profile.action_scopes.map(scope => ({ ...scope, registry_ids: scope.registry_ids.filter(id => !scope.tool_id.startsWith("switch_") || id !== registryId) })).filter(scope => scope.registry_ids.length);
  const otherReviews = (reviews: SwitchReview[]) => JSON.stringify(reviews.filter(review => review.registry_id !== registryId).sort((a, b) => a.registry_id.localeCompare(b.registry_id)));
  if (saved.connection_id !== profile.connection_id || saved.revision !== profile.revision + 1 || JSON.stringify(saved.action_scopes) !== JSON.stringify(scopes) || otherReviews(saved.switch_reviews) !== otherReviews(profile.switch_reviews) || saved.switch_reviews.some(review => review.registry_id === registryId) !== !!preview) throw new Error("Mismatched switch review save");
  return saved;
}
export async function proposeAction(hass: HomeAssistantLike, profile: ActionProfile, selected: ActionCatalogTool, target: ActionTarget, argumentsValue: Record<string, number>): Promise<ActionProposal> {
  parseActionProfile(profile);
  if (!args(argumentsValue, selected.tool_id) || !selected.targets.some((item) => item.registry_id === target.registry_id && item.entity_id === target.entity_id) ||
    !profile.action_scopes.some((scope) => scope.tool_id === selected.tool_id && scope.registry_ids.includes(target.registry_id))) throw new Error("Action is not granted");
  const requestId = newRequestId();
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/actions/propose", connection_id: profile.connection_id, expected_revision: profile.revision, request_id: requestId, tool_id: selected.tool_id, registry_id: target.registry_id, arguments: argumentsValue });
  const proposal = parseProposal(value, profile.connection_id, requestId, selected, target);
  if (JSON.stringify(proposal.arguments) !== JSON.stringify(argumentsValue)) throw new Error("Mismatched action arguments");
  return proposal;
}
function parseProposal(value: unknown, connectionId: string, requestId: string, selected: ActionCatalogTool, target: ActionTarget): ActionProposal {
  if (!record(value, ["schema_version", "connection_id", "request_id", "token", "expires_in", "tool_id", "entity_id", "risk", "arguments", "state"]) ||
    value.schema_version !== 1 || value.connection_id !== connectionId || value.request_id !== requestId || !text(value.token, 128) || value.expires_in !== 300 ||
    value.tool_id !== selected.tool_id || value.entity_id !== target.entity_id || value.risk !== selected.risk || !args(value.arguments, selected.tool_id) ||
    !text(value.state, 1000)) throw new Error("Unsupported action proposal");
  return { connection_id: connectionId, request_id: requestId, token: value.token, expires_in: 300, tool_id: selected.tool_id, entity_id: target.entity_id, risk: selected.risk, arguments: { ...value.arguments }, state: value.state };
}
export async function interpretAction(hass: HomeAssistantLike, catalog: ActionCatalog, prompt: string): Promise<ActionProposal> {
  const profile = parseActionProfile(catalog.profile);
  if (!text(prompt, 4000)) throw new Error("Invalid action request");
  const requestId = newRequestId();
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/actions/interpret", connection_id: profile.connection_id, expected_revision: profile.revision, request_id: requestId, prompt });
  if (typeof value !== "object" || value === null || !("tool_id" in value) || !("entity_id" in value)) throw new Error("Unsupported AI proposal");
  const selected = catalog.tools.find((item) => item.tool_id === value.tool_id);
  const target = selected?.targets.find((item) => item.entity_id === value.entity_id);
  if (!selected || !target || !profile.action_scopes.some((scope) => scope.tool_id === selected.tool_id && scope.registry_ids.includes(target.registry_id))) throw new Error("AI proposal is outside granted scope");
  return parseProposal(value, profile.connection_id, requestId, selected, target);
}
export async function confirmAction(hass: HomeAssistantLike, proposal: ActionProposal): Promise<"completed" | "unknown"> {
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/actions/confirm", connection_id: proposal.connection_id, request_id: proposal.request_id, token: proposal.token });
  if (!record(value, ["schema_version", "connection_id", "request_id", "status", "actions_executed"]) || value.schema_version !== 1 ||
    value.connection_id !== proposal.connection_id || value.request_id !== proposal.request_id ||
    !((value.status === "completed" && value.actions_executed === 1) || (value.status === "unknown" && value.actions_executed === 0))) throw new Error("Unsupported action outcome");
  return value.status;
}
