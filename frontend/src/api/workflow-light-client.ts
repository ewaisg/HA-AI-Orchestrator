import type { HomeAssistantLike } from "../ha/hass-contract";
import {parseStoredWorkflow,type StoredWorkflow} from "./workflow-client";

export interface WorkflowLightTarget { registry_id: string; entity_id: string; name: string; device_name: string }
export interface WorkflowLightReview { workflow_id:string; workflow:StoredWorkflow; document_version:string; revision:number; target:WorkflowLightTarget; operation:"turn_on"|"turn_off"; authorized:boolean; authorization_token:string; expires_in:300 }
export interface WorkflowLightAuthorization { workflow_id:string; document_version:string; revision:number; authorized:boolean }
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const VERSION=/^[a-f0-9]{64}$/;
function record(value:unknown,keys:string[]):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));}
function text(value:unknown,max:number):value is string{return typeof value==="string"&&!!value.trim()&&value.length<=max;}
function revision(value:unknown):value is number{return typeof value==="number"&&Number.isSafeInteger(value)&&value>=0;}
function target(value:unknown):WorkflowLightTarget {
  if(!record(value,["registry_id","entity_id","name","device_name"])||!text(value.registry_id,64)||!text(value.entity_id,255)||!/^light\.[a-z0-9_]+$/.test(value.entity_id)||!text(value.name,255)||!text(value.device_name,255))throw new Error("Invalid light target");
  return {registry_id:value.registry_id,entity_id:value.entity_id,name:value.name,device_name:value.device_name};
}
export async function fetchWorkflowLightTargets(hass:HomeAssistantLike):Promise<WorkflowLightTarget[]> {
  const value=await hass.callWS<unknown>({type:"ai_orchestrator/workflows/light_actions/catalog"});
  if(!record(value,["schema_version","targets"])||value.schema_version!==1||!Array.isArray(value.targets)||value.targets.length>500)throw new Error("Invalid light catalog");
  const targets=value.targets.map(target);if(new Set(targets.map(item=>item.registry_id)).size!==targets.length||new Set(targets.map(item=>item.entity_id)).size!==targets.length)throw new Error("Duplicate light target");return targets;
}
export async function previewWorkflowLight(hass:HomeAssistantLike,workflowId:string):Promise<WorkflowLightReview> {
  if(!UUID.test(workflowId))throw new Error("Invalid workflow");
  const value=await hass.callWS<unknown>({type:"ai_orchestrator/workflows/light_actions/preview",workflow_id:workflowId});
  if(!record(value,["schema_version","workflow_id","workflow","document_version","revision","target","operation","authorized","authorization_token","expires_in"])||value.schema_version!==1||value.workflow_id!==workflowId||!text(value.document_version,64)||!VERSION.test(value.document_version)||!revision(value.revision)||!["turn_on","turn_off"].includes(value.operation as string)||typeof value.authorized!=="boolean"||!text(value.authorization_token,128)||value.expires_in!==300)throw new Error("Invalid light authorization review");
  const workflow=parseStoredWorkflow(value.workflow),lightTarget=target(value.target);
  if(workflow.workflow_id!==workflowId||workflow.steps.length!==1||workflow.steps[0]?.kind!=="light_control"||workflow.steps[0]?.target_registry_id!==lightTarget.registry_id||workflow.steps[0]?.operation!==value.operation)throw new Error("Mismatched light workflow");
  return {workflow_id:workflowId,workflow,document_version:value.document_version,revision:value.revision,target:lightTarget,operation:value.operation as "turn_on"|"turn_off",authorized:value.authorized,authorization_token:value.authorization_token,expires_in:300};
}
export async function updateWorkflowLightAuthorization(hass:HomeAssistantLike,review:WorkflowLightReview,authorize:boolean):Promise<WorkflowLightAuthorization> {
  const value=await hass.callWS<unknown>({type:`ai_orchestrator/workflows/light_actions/${authorize?"authorize":"revoke"}`,workflow_id:review.workflow_id,revision:review.revision,...(authorize?{document_version:review.document_version,authorization_token:review.authorization_token,attestations:{ordinary_lighting:true,allow_unattended:true}}:{})});
  if(!record(value,["schema_version","workflow_id","document_version","revision","authorized"])||value.schema_version!==1||value.workflow_id!==review.workflow_id||value.document_version!==review.document_version||value.revision!==review.revision+1||value.authorized!==authorize)throw new Error("Changed light authorization");
  return {workflow_id:review.workflow_id,document_version:review.document_version,revision:value.revision as number,authorized:authorize};
}
