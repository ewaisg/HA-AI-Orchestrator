import type { HomeAssistantLike } from "../ha/hass-contract";

const OPERATIONS = {
  light_turn_on_v1: ["action", "medium"], light_turn_off_v1: ["action", "medium"],
  switch_turn_on_v1: ["action", "high"], switch_turn_off_v1: ["action", "high"],
  media_play_v1: ["action", "medium"], media_pause_v1: ["action", "medium"], media_volume_v1: ["action", "medium"],
  workflow_run: ["workflow", null], notify: ["notification", null],
} as const;
export type AuditOperation = keyof typeof OPERATIONS;
export type AuditPhase = "requested" | "authorized" | "started" | "committed" | "failed" | "unknown";
const ERRORS = new Set(["not_authorized", "invalid_request", "provider_unavailable", "provider_failed", "invalid_output", "target_unavailable", "cancelled", "timeout", "dispatch_unknown", "interrupted", "storage_failure"]);
const KEYS = ["sequence", "audit_id", "parent_id", "kind", "phase", "created_at", "updated_at", "operation", "risk", "step_index", "provider_calls", "actions_attempted", "service_returns", "error_code", "counts_final"];
export interface AuditRecord {
  sequence: number; audit_id: string; parent_id: string | null;
  kind: "action" | "workflow" | "notification"; phase: AuditPhase;
  created_at: string; updated_at: string; operation: AuditOperation; risk: "medium" | "high" | null;
  step_index: number | null; provider_calls: number; actions_attempted: number;
  service_returns: number; error_code: string | null; counts_final: boolean;
}
export interface AuditPage { records: AuditRecord[]; next_cursor: number | null }
function fail(): never { throw new Error("Invalid audit metadata"); }
function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail();
  return value as Record<string, unknown>;
}
function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}
function identity(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}
function timestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.startsWith("0000") || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{6})?\+00:00$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 19) === value.slice(0, 19);
}
function orderedTime(value: string): string { return value.length === 25 ? value.slice(0, 19) + ".000000" : value.slice(0, 26); }
export function parseAuditRecord(value: unknown): AuditRecord {
  const row = object(value, KEYS);
  if (!integer(row.sequence, 1, Number.MAX_SAFE_INTEGER) || !identity(row.audit_id) ||
      (row.parent_id !== null && !identity(row.parent_id)) || row.parent_id === row.audit_id ||
      typeof row.operation !== "string" || !Object.hasOwn(OPERATIONS, row.operation) ||
      typeof row.phase !== "string" || !["requested", "authorized", "started", "committed", "failed", "unknown"].includes(row.phase) ||
      !timestamp(row.created_at) || !timestamp(row.updated_at) || orderedTime(row.updated_at) < orderedTime(row.created_at) ||
      (row.step_index !== null && !integer(row.step_index, 0, 63)) ||
      !integer(row.provider_calls, 0, 64) || !integer(row.actions_attempted, 0, 64) || !integer(row.service_returns, 0, 64) || row.service_returns > row.actions_attempted ||
      typeof row.counts_final !== "boolean" || (row.error_code !== null && (typeof row.error_code !== "string" || !ERRORS.has(row.error_code)))) fail();
  const [kind, risk] = OPERATIONS[row.operation as AuditOperation];
  if (row.kind !== kind || row.risk !== risk || row.counts_final !== ["committed", "failed"].includes(row.phase) ||
      (row.error_code !== null) !== ["failed", "unknown"].includes(row.phase) ||
      (["requested", "authorized"].includes(row.phase) && (row.actions_attempted !== 0 || row.provider_calls !== 0)) ||
      (["committed", "failed"].includes(row.phase) && row.actions_attempted !== row.service_returns)) fail();
  return { ...row } as unknown as AuditRecord;
}
export async function fetchAudit(hass: HomeAssistantLike, afterSequence = 0, limit = 100): Promise<AuditPage> {
  if (!integer(afterSequence, 0, Number.MAX_SAFE_INTEGER) || !integer(limit, 1, 100)) fail();
  const raw = object(await hass.callWS({ type: "ai_orchestrator/audit/list", after_sequence: afterSequence, limit }), ["schema_version", "retention_days", "records", "next_cursor"]);
  if (raw.schema_version !== 1 || raw.retention_days !== 90 || !Array.isArray(raw.records) || raw.records.length > limit) fail();
  const records = raw.records.map(parseAuditRecord);
  let previous = afterSequence;
  const identities = new Set<string>();
  for (const row of records) {
    if (row.sequence <= previous || identities.has(row.audit_id)) fail();
    previous = row.sequence; identities.add(row.audit_id);
  }
  if (raw.next_cursor !== null && (!integer(raw.next_cursor, 1, Number.MAX_SAFE_INTEGER) || !records.length || raw.next_cursor !== previous)) fail();
  return { records, next_cursor: raw.next_cursor as number | null };
}
