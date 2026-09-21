import type { HomeAssistantLike } from "../ha/hass-contract";
import { parseStoredWorkflow, type StoredWorkflow } from "./workflow-client";
import { fetchCatalog } from "./catalog-client";

export interface WorkflowDraftSource { workflow_id: string; version: string; workflow: StoredWorkflow; entity_ids: string[]; notify_targets: string[] }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function record(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
}
function refs(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 8 && value.every(item => typeof item === "string" && item.length > 0 && item.length <= 255) && new Set(value).size === value.length;
}
function workflowRefs(workflow: StoredWorkflow): { entity_ids: string[]; notify_targets: string[] } {
  return {
    entity_ids: [...new Set([...workflow.triggers.flatMap(trigger=>Array.isArray(trigger.entity_ids)?trigger.entity_ids as string[]:[]), ...workflow.conditions.flatMap(condition=>typeof condition.entity_id==="string"?[condition.entity_id]:[])])].sort(),
    notify_targets: [...new Set(workflow.steps.flatMap(step=>typeof step.notify_service==="string"?[step.notify_service]:[]))].sort(),
  };
}
async function checkedWorkflowRefs(hass: HomeAssistantLike, workflow: StoredWorkflow): Promise<{entity_ids:string[];notify_targets:string[]}> {
  const used = workflowRefs(workflow);
  const light = workflow.steps.find(step => step.kind === "light_control");
  if (light) {
    const catalog = await fetchCatalog(hass);
    const target = catalog.entities.find(entity => entity.registry_id === light.target_registry_id && entity.domain === "light" && !entity.disabled);
    if (!target) throw new Error("Unavailable light draft target");
    used.entity_ids = [...new Set([...used.entity_ids, target.entity_id])].sort();
  }
  return used;
}
export async function fetchWorkflowDraftSource(hass: HomeAssistantLike, sourceId: string): Promise<WorkflowDraftSource> {
  if (!UUID.test(sourceId)) throw new Error("Invalid draft source");
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/workflows/draft_source", source_workflow_id: sourceId });
  if (!record(value,["schema_version","source"]) || value.schema_version !== 1 ||
    !record(value.source,["workflow_id","version","workflow","entity_ids","notify_targets"])) throw new Error("Unsupported draft source");
  const source = value.source;
  if (source.workflow_id !== sourceId || typeof source.version !== "string" || !/^[a-f0-9]{64}$/u.test(source.version) ||
    !refs(source.entity_ids) || !refs(source.notify_targets)) throw new Error("Unsupported draft source");
  const workflow = parseStoredWorkflow(source.workflow);
  if (workflow.workflow_id !== sourceId) throw new Error("Mismatched draft source");
  const used=await checkedWorkflowRefs(hass,workflow);
  if(JSON.stringify(used.entity_ids)!==JSON.stringify([...source.entity_ids].sort()) || JSON.stringify(used.notify_targets)!==JSON.stringify([...source.notify_targets].sort())) throw new Error("Mismatched source references");
  return { workflow_id: sourceId, version: source.version, workflow, entity_ids: [...source.entity_ids], notify_targets: [...source.notify_targets] };
}

export async function generateWorkflowDraft(hass: HomeAssistantLike, connectionId: string, prompt: string,
  entityIds: string[], notifyTargets: string[], source?: WorkflowDraftSource): Promise<StoredWorkflow> {
  if (!UUID.test(connectionId) || !prompt.trim() || prompt.length > 4000 || !refs(entityIds) || !refs(notifyTargets) ||
      (source && (!UUID.test(source.workflow_id) || !/^[a-f0-9]{64}$/u.test(source.version) || source.entity_ids.some(id => !entityIds.includes(id)) || source.notify_targets.some(id => !notifyTargets.includes(id))))) throw new Error("Invalid draft input");
  const value = await hass.callWS<unknown>({ type: "ai_orchestrator/workflows/generate_draft",
    connection_id: connectionId, prompt, entity_ids: entityIds, notify_targets: notifyTargets,
    ...(source ? { source_workflow_id: source.workflow_id, source_version: source.version } : {}) });
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Unsupported draft");
  const result = value as Record<string, unknown>;
  const keys = ["schema_version", "destination", "provider_calls", "actions_executed", "saved", "workflow"];
  if (source) keys.push("source");
  if (Object.keys(result).length !== keys.length || !keys.every(key => Object.hasOwn(result, key)) ||
      result.schema_version !== 1 || result.destination !== "local" || result.provider_calls !== 1 ||
      result.actions_executed !== 0 || result.saved !== false) throw new Error("Unsupported draft");
  const workflow = parseStoredWorkflow(result.workflow);
  const deterministic = workflow.steps.length === 1 && workflow.steps[0]?.kind === "light_control";
  if (workflow.enabled || workflow.run_mode !== "execute" || workflow.provider_connection_id !== (deterministic ? null : connectionId)) throw new Error("Unsafe draft");
  if (source && (!record(result.source,["workflow_id","version"]) || result.source.workflow_id !== source.workflow_id || result.source.version !== source.version || workflow.workflow_id === source.workflow_id)) throw new Error("Mismatched refinement");
  const used=await checkedWorkflowRefs(hass,workflow);
  if(used.entity_ids.some(id=>!entityIds.includes(id)) || used.notify_targets.some(id=>!notifyTargets.includes(id)))throw new Error("Unselected draft references");
  return workflow;
}
