import type { HomeAssistantLike } from "../ha/hass-contract";

export const NOTIFY_TARGET_KINDS = ["entity", "service"] as const;
export const NOTIFY_TARGET_LIMIT = 500;
export type NotifyTargetKind = (typeof NOTIFY_TARGET_KINDS)[number];
export interface NotifyTarget { reference: string; kind: NotifyTargetKind; name: string }

export class NotifyContractError extends Error {
  public constructor() { super("Notification target response is unsupported."); }
}
const REFERENCE = /^notify\.[a-z0-9_]{1,250}$/u;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseNotifyTargets(value: unknown): NotifyTarget[] {
  if (!record(value) || Object.keys(value).length !== 2 || value.schema_version !== 1 || !Array.isArray(value.targets) || value.targets.length > NOTIFY_TARGET_LIMIT) throw new NotifyContractError();
  const seen = new Set<string>();
  return value.targets.map((item: unknown) => {
    if (!record(item) || Object.keys(item).length !== 3 || typeof item.reference !== "string" || !REFERENCE.test(item.reference) ||
        !NOTIFY_TARGET_KINDS.includes(item.kind as NotifyTargetKind) || typeof item.name !== "string" || item.name.trim() === "" || item.name.length > 255 || seen.has(item.reference)) throw new NotifyContractError();
    seen.add(item.reference);
    return { reference: item.reference, kind: item.kind as NotifyTargetKind, name: item.name };
  });
}

export async function fetchNotifyTargets(hass: HomeAssistantLike): Promise<NotifyTarget[]> {
  return parseNotifyTargets(await hass.callWS<unknown>({ type: "ai_orchestrator/notify/targets" }));
}
