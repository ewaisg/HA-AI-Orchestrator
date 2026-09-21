import {afterEach,describe,expect,it} from "vitest";
import * as axe from "axe-core";
import type {LitElement} from "lit";
import {parseStoredWorkflow} from "../src/api/workflow-client";
import {dryRunWorkflow,parseDryRun} from "../src/api/workflow-dry-run-client";
import {fetchWorkflowLightTargets,previewWorkflowLight,updateWorkflowLightAuthorization} from "../src/api/workflow-light-client";
import {generateWorkflowDraft,fetchWorkflowDraftSource} from "../src/api/workflow-draft-client";
import {WorkflowLightReviewView} from "../src/panel/workflow-light-review";
import {WorkflowBuilderView} from "../src/panel/workflow-builder-view";
import {WorkflowPreviewView} from "../src/panel/workflow-preview-view";
import {VALID_CATALOG} from "./catalog-client.browser.test";
import {CHAT_OPTIONS,STORED_WORKFLOW,STORED_WORKFLOW_ID,WORKFLOW_LIST} from "./fixtures/workflows";
import {createFakeHass} from "./fixtures/fake-hass";
import type {HomeAssistantLike} from "../src/ha/hass-contract";

const PROVIDER="12345678-1234-4234-9234-123456789abc";
const TARGET={registry_id:"light-id",entity_id:"light.synthetic",name:"Synthetic light",device_name:"Synthetic physical light"};
const LIGHT=parseStoredWorkflow({...STORED_WORKFLOW,enabled:false,run_mode:"execute",provider_connection_id:null,triggers:[{kind:"manual"}],conditions:[],steps:[{step_id:"light",kind:"light_control",target_registry_id:TARGET.registry_id,operation:"turn_on"}]});
const REVIEW={schema_version:1,workflow_id:LIGHT.workflow_id,workflow:LIGHT,document_version:"a".repeat(64),revision:2,target:TARGET,operation:"turn_on",authorized:false,authorization_token:"synthetic-review-token",expires_in:300};
const DRY={schema_version:1,mode:"dry_run",workflow_id:LIGHT.workflow_id,destination:"local",triggered:true,conditions_passed:true,eligible:true,trigger_results:[{index:0,passed:true,reason:"matched"}],condition_results:[],steps:[{index:0,step_id:"light",kind:"light_control",executed:false,status:"planned",target_registry_id:TARGET.registry_id,operation:"turn_on",target:"entity"}],provider_calls:0,actions_executed:0,completed:true};
const CATALOG={...VALID_CATALOG,entities:[{...VALID_CATALOG.entities[0],registry_id:TARGET.registry_id,entity_id:TARGET.entity_id,domain:"light",name:TARGET.name}]};
const views:LitElement[]=[];
async function settle(view:LitElement){await view.updateComplete;await new Promise(resolve=>setTimeout(resolve,0));await view.updateComplete;}
function button(view:LitElement,label:string){return [...view.shadowRoot!.querySelectorAll("button")].find(item=>item.textContent?.trim()===label)!;}
function fake(requests:Record<string,unknown>[],override?:(request:Record<string,unknown>)=>unknown):HomeAssistantLike{return {user:{id:"admin"},callWS:async<T>(request:Record<string,unknown>)=>{
  requests.push(request);const custom=override?.(request);if(custom!==undefined)return await custom as T;
  if(request.type==="ai_orchestrator/workflows/light_actions/catalog")return {schema_version:1,targets:[TARGET]} as T;
  if(request.type==="ai_orchestrator/workflows/light_actions/preview")return REVIEW as T;
  if(request.type==="ai_orchestrator/workflows/light_actions/authorize"||request.type==="ai_orchestrator/workflows/light_actions/revoke")return {schema_version:1,workflow_id:LIGHT.workflow_id,document_version:REVIEW.document_version,revision:3,authorized:String(request.type).endsWith("authorize")} as T;
  if(request.type==="ai_orchestrator/catalog/list")return CATALOG as T;
  if(request.type==="ai_orchestrator/chat/options")return {...CHAT_OPTIONS,providers:[]} as T;
  if(request.type==="ai_orchestrator/notify/targets")return {schema_version:1,targets:[]} as T;
  if(request.type==="ai_orchestrator/workflows/dry_run")return DRY as T;
  if(request.type==="ai_orchestrator/workflows/save")return {...WORKFLOW_LIST,workflow:JSON.parse(request.workflow_json as string)} as T;
  if(request.type==="ai_orchestrator/workflows/generate_draft")return {schema_version:1,destination:"local",provider_calls:1,actions_executed:0,saved:false,workflow:LIGHT} as T;
  throw new Error("Unexpected request");
}};}
async function reviewView(hass:HomeAssistantLike,workflow=LIGHT){const view=document.createElement("ai-orchestrator-workflow-light-review") as WorkflowLightReviewView;view.hass=hass;view.workflow=workflow;document.body.append(view);views.push(view);await settle(view);return view;}
afterEach(()=>views.splice(0).forEach(view=>view.remove()));
describe("deterministic light workflows",()=>{
  it.each([
    {...LIGHT,provider_connection_id:PROVIDER},
    {...LIGHT,steps:[...LIGHT.steps,{step_id:"compose",kind:"ai_compose",prompt:"No mixing"}]},
    {...LIGHT,steps:[{...LIGHT.steps[0],operation:"toggle"}]},
    {...LIGHT,steps:[{...LIGHT.steps[0],service:"switch.turn_on"}]},
    {...LIGHT,steps:[{...LIGHT.steps[0],target_registry_id:""}]},
  ])("rejects widened light workflow shape",workflow=>{expect(()=>parseStoredWorkflow(workflow)).toThrow();});
  it("discovers bounded light-only targets and rejects switch masquerading",async()=>{
    expect(await fetchWorkflowLightTargets(fake([]))).toEqual([TARGET]);
    await expect(fetchWorkflowLightTargets(createFakeHass({schema_version:1,targets:[{...TARGET,entity_id:"switch.synthetic"}]}))).rejects.toThrow();
  });
  it("requires both explicit attestations and authorizes without saving, dry-running or enabling",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await reviewView(fake(requests));
    expect(requests).toEqual([]);button(view,"Review unattended light permission").click();await settle(view);
    expect(view.shadowRoot!.textContent).toContain(TARGET.device_name);
    const authorize=button(view,"Authorize unattended light operation");expect(authorize.disabled).toBe(true);
    const checks=view.shadowRoot!.querySelectorAll<HTMLInputElement>("input");checks[0]!.checked=true;checks[0]!.dispatchEvent(new Event("change"));await settle(view);expect(authorize.disabled).toBe(true);
    checks[1]!.checked=true;checks[1]!.dispatchEvent(new Event("change"));await settle(view);authorize.click();authorize.click();await settle(view);
    expect(requests.map(request=>request.type)).toEqual(["ai_orchestrator/workflows/light_actions/preview","ai_orchestrator/workflows/light_actions/authorize"]);
    expect(requests[1]).toEqual({type:"ai_orchestrator/workflows/light_actions/authorize",workflow_id:LIGHT.workflow_id,document_version:REVIEW.document_version,revision:2,authorization_token:REVIEW.authorization_token,attestations:{ordinary_lighting:true,allow_unattended:true}});
    expect(view.shadowRoot!.textContent).toContain("then enable separately");
  });
  it("rejects changed saved triggers even if target and operation are unchanged",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await reviewView(fake(requests,request=>request.type==="ai_orchestrator/workflows/light_actions/preview"?{...REVIEW,workflow:{...LIGHT,triggers:[{kind:"time",at_time:"23:00"}]}}:undefined));
    button(view,"Review unattended light permission").click();await settle(view);
    expect(button(view,"Authorize unattended light operation")).toBeUndefined();expect(view.shadowRoot!.textContent).toContain("Review is unavailable");
  });
  it("rejects altered token response metadata and unexpected authorization grants",async()=>{
    for(const change of [{workflow_id:PROVIDER},{operation:"toggle"},{expires_in:600},{private:"payload"}])await expect(previewWorkflowLight(createFakeHass({...REVIEW,...change}),LIGHT.workflow_id)).rejects.toThrow();
    const review=await previewWorkflowLight(fake([]),LIGHT.workflow_id);
    await expect(updateWorkflowLightAuthorization(createFakeHass({schema_version:1,workflow_id:LIGHT.workflow_id,document_version:"b".repeat(64),revision:3,authorized:true}),review,true)).rejects.toThrow();
  });
  it("allows explicit revocation but cannot authorize an enabled workflow",async()=>{
    const requests:Record<string,unknown>[]=[];const enabled={...LIGHT,enabled:true};const view=await reviewView(fake(requests,request=>request.type==="ai_orchestrator/workflows/light_actions/preview"?{...REVIEW,workflow:enabled,authorized:true}:undefined),enabled);
    button(view,"Review unattended light permission").click();await settle(view);expect(button(view,"Authorize unattended light operation")).toBeUndefined();
    button(view,"Revoke unattended light permission").click();await settle(view);expect(requests.at(-1)).toEqual({type:"ai_orchestrator/workflows/light_actions/revoke",workflow_id:LIGHT.workflow_id,revision:2});
  });
  it("ignores another user's late review and clears checked attestations",async()=>{
    let resolve!:(value:unknown)=>void;const pending=new Promise(r=>{resolve=r;});const view=await reviewView(fake([],request=>request.type==="ai_orchestrator/workflows/light_actions/preview"?pending:undefined));
    button(view,"Review unattended light permission").click();await settle(view);view.hass={...fake([]),user:{id:"other"}};await settle(view);resolve(REVIEW);await settle(view);
    expect(button(view,"Authorize unattended light operation")).toBeUndefined();
  });
  it("dry-runs without a provider and rejects any nonzero side-effect claim",async()=>{
    const requests:Record<string,unknown>[]=[];
    expect(await dryRunWorkflow(fake(requests),LIGHT.workflow_id,null,'{"event":{"kind":"manual"}}')).toEqual(DRY);
    expect(requests[0]).not.toHaveProperty("connection_id");
    for(const change of [{provider_calls:1},{actions_executed:1},{steps:[{...DRY.steps[0],executed:true}]},{steps:[{...DRY.steps[0],operation:"toggle"}]}])expect(()=>parseDryRun({...DRY,...change},LIGHT.workflow_id)).toThrow();
  });
  it("builds a disabled provider-free action from actual eligible light candidates",async()=>{
    const requests:Record<string,unknown>[]=[];const view=document.createElement("ai-orchestrator-workflow-builder") as WorkflowBuilderView;view.hass=fake(requests);document.body.append(view);views.push(view);await settle(view);
    button(view,"Use one deterministic light action instead").click();await settle(view);
    const name=view.shadowRoot!.querySelector<HTMLInputElement>("#wb-name")!;name.value="Synthetic light timer";name.dispatchEvent(new Event("input"));
    for(const [id,value] of [["wb-trigger-kind","manual"],["wb-mode","execute"],["wb-s0-light",TARGET.registry_id]] as const){const select=view.shadowRoot!.querySelector<HTMLSelectElement>(`#${id}`)!;select.value=value;select.dispatchEvent(new Event("change"));await settle(view);}
    expect(view.document()).toMatchObject({enabled:false,provider_connection_id:null,steps:[{step_id:"light",kind:"light_control",target_registry_id:TARGET.registry_id,operation:"turn_on"}]});
    expect(view.shadowRoot!.querySelector<HTMLInputElement>("#wb-enabled")!.disabled).toBe(true);
    (view.shadowRoot!.querySelector("#wb-save") as HTMLButtonElement).click();await settle(view);
    expect(requests.filter(request=>request.type==="ai_orchestrator/workflows/save")).toHaveLength(1);
    expect(requests.some(request=>String(request.type).includes("authorize")||String(request.type).includes("enable"))).toBe(false);
  });
  it("enables the provider-free dry-run button in the JSON editor with no providers",async()=>{
    const requests:Record<string,unknown>[]=[];const view=document.createElement("ai-orchestrator-workflow-preview") as WorkflowPreviewView;view.hass=fake(requests);view.draft={json:JSON.stringify(LIGHT),sequence:1};document.body.append(view);views.push(view);await settle(view);
    const snapshot=view.shadowRoot!.querySelector<HTMLTextAreaElement>("#snapshot-json")??view.shadowRoot!.querySelectorAll("textarea")[1]!;snapshot.value='{"event":{"kind":"manual"}}';snapshot.dispatchEvent(new Event("input"));await settle(view);
    const dry=view.shadowRoot!.querySelector<HTMLButtonElement>("#dry-run")!;expect(dry.disabled).toBe(false);expect(dry.textContent).toContain("Dry run light workflow");dry.click();await settle(view);
    expect(requests.find(request=>request.type==="ai_orchestrator/workflows/dry_run")).not.toHaveProperty("connection_id");expect(view.shadowRoot!.textContent).toContain("Provider calls: 0");
  });
  it("accepts an AI light draft only if its stable target maps to an explicit selected entity",async()=>{
    const requests:Record<string,unknown>[]=[];expect(await generateWorkflowDraft(fake(requests),PROVIDER,"Draft light control",[TARGET.entity_id],[])).toEqual(LIGHT);
    await expect(generateWorkflowDraft(fake([]),PROVIDER,"Draft light control",[],[])).rejects.toThrow();
    expect(requests.some(request=>String(request.type).includes("authorize")||String(request.type).includes("/save"))).toBe(false);
  });
  it("validates light source reference disclosure against the actual registry mapping",async()=>{
    const source={workflow_id:STORED_WORKFLOW_ID,version:"a".repeat(64),workflow:LIGHT,entity_ids:[TARGET.entity_id],notify_targets:[]};
    const hass=fake([],request=>request.type==="ai_orchestrator/workflows/draft_source"?{schema_version:1,source}:undefined);
    expect((await fetchWorkflowDraftSource(hass,STORED_WORKFLOW_ID)).entity_ids).toEqual([TARGET.entity_id]);
    await expect(fetchWorkflowDraftSource(fake([],request=>request.type==="ai_orchestrator/workflows/draft_source"?{schema_version:1,source:{...source,entity_ids:[]}}:undefined),STORED_WORKFLOW_ID)).rejects.toThrow();
  });
  it("keeps explicit authorization controls accessible at390px",async()=>{
    const view=await reviewView(fake([]));view.style.width="390px";button(view,"Review unattended light permission").click();await settle(view);
    expect(view.scrollWidth).toBeLessThanOrEqual(390);expect((await axe.run(view,{rules:{"color-contrast":{enabled:false},region:{enabled:false}}})).violations).toEqual([]);
  });
});
