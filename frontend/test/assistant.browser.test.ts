import { afterEach, describe, expect, it } from "vitest";
import * as axe from "axe-core";
import { AssistantView } from "../src/panel/assistant-view";
import type { HomeAssistantLike } from "../src/ha/hass-contract";
import { CHAT_OPTIONS, NOTIFY_TARGETS, STORED_WORKFLOW, WORKFLOW_LIST } from "./fixtures/workflows";
import { VALID_CATALOG } from "./catalog-client.browser.test";

const ID="12345678-1234-4234-9234-123456789abc";
const SOURCE_ID="12345678-1234-4234-9234-123456789abd";
const TARGET={registry_id:"light-id",entity_id:"light.synthetic",name:"Synthetic light"};
const PROFILE={connection_id:ID,revision:1,action_scopes:[{tool_id:"light_turn_on_v1",registry_ids:[TARGET.registry_id]}],switch_reviews:[]};
const ACTIONS={schema_version:2,profile:PROFILE,tools:[{tool_id:"light_turn_on_v1",label:"Turn light on",risk:"medium",arguments:"none",targets:[TARGET]}],switch_candidates:[]};
const DRAFT={...STORED_WORKFLOW,enabled:false,run_mode:"execute",provider_connection_id:ID,triggers:[{kind:"state",entity_ids:["binary_sensor.kitchen_window"],to_state:"on"}],conditions:[],steps:[{step_id:"compose",kind:"ai_compose",prompt:"Synthetic compose"},{step_id:"send",kind:"notify",notify_service:"notify.kitchen_speaker"}]};
const SOURCE={workflow_id:SOURCE_ID,version:"a".repeat(64),workflow:{...DRAFT,workflow_id:SOURCE_ID},entity_ids:["binary_sensor.kitchen_window"],notify_targets:["notify.kitchen_speaker"]};
const mounted:AssistantView[]=[];
const containers:HTMLElement[]=[];
async function settle(view:AssistantView){await view.updateComplete;await new Promise(resolve=>setTimeout(resolve,0));await view.updateComplete;}
async function mount(hass:HomeAssistantLike,height?:number){const view=document.createElement("ai-orchestrator-assistant") as AssistantView;view.hass=hass;
  if(height){const outer=document.createElement("div");outer.style.cssText=`display:flex;flex-direction:column;overflow:hidden;width:390px;height:${height}px;min-height:0`;const workspace=document.createElement("div");workspace.style.cssText="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden";outer.append(workspace);workspace.append(view);document.body.append(outer);containers.push(outer);}else document.body.append(view);
  mounted.push(view);await settle(view);return view;}
function button(view:AssistantView,label:string){return [...view.shadowRoot!.querySelectorAll("button")].find(item=>item.textContent?.trim()===label)!;}
async function choose(view:AssistantView,label:string,value:string){const select=[...view.shadowRoot!.querySelectorAll("label")].find(item=>item.textContent?.startsWith(label))!.querySelector("select")!;select.value=value;select.dispatchEvent(new Event("change"));await settle(view);}
async function prompt(view:AssistantView,value:string){const input=view.shadowRoot!.querySelector("textarea")!;input.value=value;input.dispatchEvent(new Event("input"));await settle(view);}
async function send(view:AssistantView,value:string){await prompt(view,value);button(view,"Send request").click();await settle(view);}
function text(view:AssistantView){return view.shadowRoot!.textContent!;}
function fake(requests:Record<string,unknown>[],override?:(request:Record<string,unknown>)=>unknown):HomeAssistantLike{
  return {user:{id:"admin"},callWS:async<T>(request:Record<string,unknown>)=>{
    requests.push(request);const custom=override?.(request);if(custom!==undefined)return await custom as T;
    const common={schema_version:1,connection_id:request.connection_id,request_id:request.request_id};
    if(request.type==="ai_orchestrator/chat/options")return CHAT_OPTIONS as T;
    if(request.type==="ai_orchestrator/chat/send")return {...common,text:"GENERAL_REPLY",destination:"local",streaming:false} as T;
    if(request.type==="ai_orchestrator/agents/list")return {schema_version:1,profiles:[{connection_id:ID,revision:3,observe_registry_ids:["synthetic-state"],action_scopes:[]}]} as T;
    if(request.type==="ai_orchestrator/agents/chat")return {...common,text:"SCOPED_STATE_ONLY",destination:"local",actions_executed:0,provider_calls:2,tool_calls:1,trace:["provider_response","state_read","provider_response"]} as T;
    if(request.type==="ai_orchestrator/agents/probe_tools")return {schema_version:1,connection_id:ID,supported:true,error_code:null} as T;
    if(request.type==="ai_orchestrator/actions/catalog")return ACTIONS as T;
    if(request.type==="ai_orchestrator/actions/interpret")return {...common,token:"synthetic-token",expires_in:300,tool_id:"light_turn_on_v1",entity_id:TARGET.entity_id,risk:"medium",arguments:{},state:"off"} as T;
    if(request.type==="ai_orchestrator/actions/confirm")return {...common,status:"completed",actions_executed:1} as T;
    if(request.type==="ai_orchestrator/catalog/list")return VALID_CATALOG as T;
    if(request.type==="ai_orchestrator/notify/targets")return NOTIFY_TARGETS as T;
    if(request.type==="ai_orchestrator/workflows/list")return {...WORKFLOW_LIST,workflows:[{...(WORKFLOW_LIST.workflows as object[])[0],workflow:SOURCE.workflow}]} as T;
    if(request.type==="ai_orchestrator/workflows/draft_source")return {schema_version:1,source:SOURCE} as T;
    if(request.type==="ai_orchestrator/workflows/generate_draft")return {schema_version:1,destination:"local",provider_calls:1,actions_executed:0,saved:false,workflow:DRAFT,...(request.source_workflow_id?{source:{workflow_id:SOURCE_ID,version:SOURCE.version}}:{})} as T;
    throw new Error("Unexpected request");
  }};
}
afterEach(()=>{mounted.splice(0).forEach(view=>view.remove());containers.splice(0).forEach(item=>item.remove());});
describe("unified assistant with explicit intent",()=>{
  it("uses a single composer and keeps scoped answers out of general context",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests));
    await send(view,"General greeting");
    await choose(view,"Request type","observe");await send(view,"Private state question");
    expect(text(view)).toContain("SCOPED_STATE_ONLY");
    expect([...view.shadowRoot!.querySelectorAll("ol[aria-label='Observation trace'] li")].map(item=>item.textContent)).toEqual(["Local provider returned a response","Read permitted entity state","Local provider returned a response"]);
    expect(requests.find(item=>item.type==="ai_orchestrator/agents/chat")).toMatchObject({expected_revision:3,prompt:"Private state question"});
    await choose(view,"Request type","chat");await send(view,"Another general question");
    const chat=requests.filter(item=>item.type==="ai_orchestrator/chat/send");
    expect(chat[1]!.messages).toEqual([{role:"user",content:"General greeting"},{role:"assistant",content:"GENERAL_REPLY"},{role:"user",content:"Another general question"}]);
    expect(view.shadowRoot!.querySelectorAll("textarea")).toHaveLength(1);
    expect(JSON.stringify(chat)).not.toContain("SCOPED_STATE_ONLY");expect(JSON.stringify(chat)).not.toContain("Private state question");
  });
  it("only probes when explicitly requested and blocks missing observation grants",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests,request=>request.type==="ai_orchestrator/agents/list"?{schema_version:1,profiles:[]}:undefined));
    await choose(view,"Request type","observe");await send(view,"Read state");
    expect(requests.some(item=>item.type==="ai_orchestrator/agents/chat")).toBe(false);
    expect(requests.some(item=>item.type==="ai_orchestrator/agents/probe_tools")).toBe(false);
    button(view,"Test state-tool support").click();await settle(view);
    expect(text(view)).toContain("does not verify device actions or automation generation");
  });
  it("requires explicit confirmation once and isolates proposals from chat",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests));
    await choose(view,"Request type","action");await send(view,"Switch my permitted light on");
    expect(text(view)).toContain(TARGET.entity_id);expect(text(view)).toContain("medium");
    expect(requests.some(item=>item.type==="ai_orchestrator/actions/confirm")).toBe(false);
    button(view,"Confirm this action").click();button(view,"Confirm this action").click();await settle(view);
    expect(requests.filter(item=>item.type==="ai_orchestrator/actions/confirm")).toHaveLength(1);
    expect(text(view)).toContain("Check the physical device");
    await choose(view,"Request type","chat");await send(view,"Hello");
    expect(requests.find(item=>item.type==="ai_orchestrator/chat/send")!.messages).toEqual([{role:"user",content:"Hello"}]);
  });
  it("does not send AI action request when no grant exists",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests,request=>request.type==="ai_orchestrator/actions/catalog"?{...ACTIONS,profile:{...PROFILE,action_scopes:[]}}:undefined));
    await choose(view,"Request type","action");await send(view,"Act");
    expect(requests.some(item=>item.type==="ai_orchestrator/actions/interpret")).toBe(false);
    expect(text(view)).toContain("Request failed");
  });
  it("consumes unknown confirmation without retry or a physical-success claim",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests,request=>request.type==="ai_orchestrator/actions/confirm"?{schema_version:1,connection_id:ID,request_id:request.request_id,status:"unknown",actions_executed:0}:undefined));
    await choose(view,"Request type","action");await send(view,"Act");button(view,"Confirm this action").click();await settle(view);
    expect(text(view)).toContain("outcome is unknown");expect(button(view,"Confirm this action")).toBeUndefined();
    expect(requests.filter(item=>item.type==="ai_orchestrator/actions/confirm")).toHaveLength(1);
  });
  it("selects explicit draft references and emits handoff only on review",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests));let handoff:unknown;
    view.addEventListener("assistant-workflow-review",event=>{handoff=(event as CustomEvent).detail;});
    await choose(view,"Request type","draft");
    for(const checkbox of view.shadowRoot!.querySelectorAll<HTMLInputElement>(".choices input")){
      if(checkbox.parentElement!.textContent!.includes("binary_sensor.kitchen_window")||checkbox.parentElement!.textContent!.includes("notify.kitchen_speaker")){checkbox.checked=true;checkbox.dispatchEvent(new Event("change"));await settle(view);}
    }
    await send(view,"Notify for this window");
    expect(requests.find(item=>item.type==="ai_orchestrator/workflows/generate_draft")).toMatchObject({entity_ids:["binary_sensor.kitchen_window"],notify_targets:["notify.kitchen_speaker"]});
    expect(handoff).toBeUndefined();expect(text(view)).toContain("New disabled, unsaved draft");
    button(view,"Review in workflow editor").click();
    expect(JSON.parse((handoff as {json:string}).json).enabled).toBe(false);
    expect(requests.some(item=>String(item.type).includes("/save")||String(item.type).includes("/enable"))).toBe(false);
  });
  it("discloses selected source and sends only server-bound source id/version",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests));await choose(view,"Request type","draft");await choose(view,"Starting workflow",SOURCE_ID);
    expect(text(view)).toContain("Source fields sent to the model");expect(text(view)).toContain("Synthetic compose");
    await send(view,"Refine source");
    expect(requests.find(item=>item.type==="ai_orchestrator/workflows/generate_draft")).toEqual({type:"ai_orchestrator/workflows/generate_draft",connection_id:ID,prompt:"Refine source",entity_ids:SOURCE.entity_ids,notify_targets:SOURCE.notify_targets,source_workflow_id:SOURCE_ID,source_version:SOURCE.version});
    expect(button(view,"Review in workflow editor")).toBeDefined();
  });
  it("rejects an enabled draft and preserves the request with a static error",async()=>{
    const view=await mount(fake([],request=>request.type==="ai_orchestrator/workflows/generate_draft"?{schema_version:1,destination:"local",provider_calls:1,actions_executed:0,saved:false,workflow:{...DRAFT,enabled:true}}:undefined));
    await choose(view,"Request type","draft");await send(view,"PRIVATE_REQUEST");
    expect(button(view,"Review in workflow editor")).toBeUndefined();expect(view.shadowRoot!.querySelector("textarea")!.value).toBe("PRIVATE_REQUEST");
    expect(text(view)).toContain("Request failed");
  });
  it("bounds each draft selector to eight and clears source context on new conversation",async()=>{
    const view=await mount(fake([],request=>request.type==="ai_orchestrator/catalog/list"?{...VALID_CATALOG,entities:Array.from({length:9},(_,index)=>({...VALID_CATALOG.entities[0],registry_id:`synthetic-${index}`,entity_id:`binary_sensor.synthetic_${index}`}))}:undefined));
    await choose(view,"Request type","draft");
    for(let index=0;index<8;index++){const checkbox=view.shadowRoot!.querySelectorAll<HTMLInputElement>("[aria-label='Draft entities'] input")[index]!;checkbox.checked=true;checkbox.dispatchEvent(new Event("change"));await settle(view);}
    expect(view.shadowRoot!.querySelectorAll<HTMLInputElement>("[aria-label='Draft entities'] input")[8]!.disabled).toBe(true);
    button(view,"New conversation").click();await settle(view);await choose(view,"Request type","draft");
    expect(text(view)).toContain("Selected entities: none");
  });
  it("never echoes provider exceptions and never repeats a busy request",async()=>{
    const requests:Record<string,unknown>[]=[];let reject!:(error:unknown)=>void;
    const pending=new Promise((_,fail)=>{reject=fail;});
    const view=await mount(fake(requests,request=>request.type==="ai_orchestrator/chat/send"?pending:undefined));
    await send(view,"Keep this prompt");button(view,"Send request").click();
    reject(new Error("PRIVATE_PROVIDER_ERROR"));await settle(view);
    expect(requests.filter(item=>item.type==="ai_orchestrator/chat/send")).toHaveLength(1);
    expect(text(view)).not.toContain("PRIVATE_PROVIDER_ERROR");expect(view.shadowRoot!.querySelector("textarea")!.value).toBe("Keep this prompt");
  });
  it("rejects late draft handoff after provider transport changes",async()=>{
    let resolve!:(value:unknown)=>void;const pending=new Promise(r=>{resolve=r;});
    const view=await mount(fake([],request=>request.type==="ai_orchestrator/workflows/generate_draft"?pending:undefined));
    await choose(view,"Request type","draft");await choose(view,"Starting workflow",SOURCE_ID);await send(view,"Old source request");
    view.hass=fake([]);await settle(view);
    resolve({schema_version:1,destination:"local",provider_calls:1,actions_executed:0,saved:false,workflow:DRAFT,source:{workflow_id:SOURCE_ID,version:SOURCE.version}});await settle(view);
    expect(button(view,"Review in workflow editor")).toBeUndefined();expect(text(view)).not.toContain("Old source request");
  });
  it("drops old-session action proposals without clearing a newer proposal",async()=>{
    let resolve!:(value:unknown)=>void;let oldRequest:Record<string,unknown>={};const pending=new Promise(r=>{resolve=r;});
    const view=await mount(fake([],request=>{if(request.type==="ai_orchestrator/actions/interpret"){oldRequest=request;return pending;}return undefined;}));
    await choose(view,"Request type","action");await send(view,"Old request");
    view.hass={...fake([]),user:{id:"new"}};await settle(view);await choose(view,"Request type","action");await send(view,"New request");
    resolve({schema_version:1,connection_id:ID,request_id:oldRequest.request_id,token:"oldtoken",expires_in:300,tool_id:"light_turn_on_v1",entity_id:TARGET.entity_id,risk:"medium",arguments:{},state:"OLD_PRIVATE_STATE"});await settle(view);
    expect(button(view,"Confirm this action")).toBeDefined();expect(text(view)).not.toContain("OLD_PRIVATE_STATE");
  });
  it("does not advance a pending permission read after user changes",async()=>{
    let resolve!:(value:unknown)=>void;const pending=new Promise(r=>{resolve=r;});const requests:Record<string,unknown>[]=[];
    const view=await mount(fake(requests,request=>request.type==="ai_orchestrator/agents/list"?pending:undefined));await choose(view,"Request type","observe");await send(view,"Old state request");
    view.hass={...fake([]),user:{id:"new"}};await settle(view);resolve({schema_version:1,profiles:[{connection_id:ID,revision:1,observe_registry_ids:["old"],action_scopes:[]}]});await settle(view);
    expect(requests.some(item=>item.type==="ai_orchestrator/agents/chat")).toBe(false);
  });
  it("clears on disconnect and ignores a late chat result",async()=>{
    const listeners=new Map<string,()=>void>();const connection={connected:true,addEventListener:(event:"ready"|"disconnected",cb:()=>void)=>{listeners.set(event,cb);},removeEventListener:(event:"ready"|"disconnected")=>{listeners.delete(event);}};
    let resolve!:(value:unknown)=>void;let requestId:unknown;const pending=new Promise(r=>{resolve=r;});
    const view=await mount({...fake([],request=>{if(request.type==="ai_orchestrator/chat/send"){requestId=request.request_id;return pending;}return undefined;}),connection});await send(view,"Old chat");
    connection.connected=false;listeners.get("disconnected")!();await settle(view);resolve({schema_version:1,connection_id:ID,request_id:requestId,text:"PRIVATE_LATE",destination:"local",streaming:false});await settle(view);
    expect(text(view)).not.toContain("PRIVATE_LATE");view.remove();expect(listeners.size).toBe(0);
  });
  it("supports keyboard submission and 390px accessible controls",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests));view.style.width="390px";await prompt(view,"Keyboard greeting");
    view.shadowRoot!.querySelector("textarea")!.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",ctrlKey:true}));await settle(view);
    expect(requests.filter(item=>item.type==="ai_orchestrator/chat/send")).toHaveLength(1);
    expect(view.scrollWidth).toBeLessThanOrEqual(390);
    expect((await axe.run(view,{rules:{"color-contrast":{enabled:false},region:{enabled:false}}})).violations).toEqual([]);
  });
  it.each([320,420])("keeps draft review and composer reachable in a clipped 390px panel with %ipx height",async height=>{
    const view=await mount(fake([]),height);await choose(view,"Request type","draft");await choose(view,"Starting workflow",SOURCE_ID);await send(view,"Create draft");
    const outer=containers.at(-1)!,body=view.shadowRoot!.querySelector<HTMLElement>(".body")!,footer=view.shadowRoot!.querySelector<HTMLElement>("footer")!;
    expect(outer.scrollHeight).toBeLessThanOrEqual(height);
    expect(body.clientHeight).toBeGreaterThan(30);expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    body.scrollTop=body.scrollHeight;await settle(view);
    const review=button(view,"Review in workflow editor");const bounds=body.getBoundingClientRect();
    expect(review.getBoundingClientRect().top).toBeGreaterThanOrEqual(bounds.top);expect(review.getBoundingClientRect().bottom).toBeLessThanOrEqual(bounds.bottom+1);
    const textarea=view.shadowRoot!.querySelector("textarea")!;
    expect(textarea.getBoundingClientRect().top).toBeGreaterThanOrEqual(footer.getBoundingClientRect().top);expect(textarea.getBoundingClientRect().bottom).toBeLessThanOrEqual(outer.getBoundingClientRect().bottom);
    review.focus();expect(view.shadowRoot!.activeElement).toBe(review);
    footer.scrollTop=footer.scrollHeight;await settle(view);
    expect(button(view,"Send request").getBoundingClientRect().bottom).toBeLessThanOrEqual(outer.getBoundingClientRect().bottom+1);
    expect(view.scrollWidth).toBeLessThanOrEqual(390);
  });
  it("keeps confirmation reachable below long content in a short panel",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(fake(requests),320);
    await send(view,"Long conversation".repeat(150));await choose(view,"Request type","action");await send(view,"Turn permitted light on");
    const body=view.shadowRoot!.querySelector<HTMLElement>(".body")!;body.scrollTop=body.scrollHeight;await settle(view);
    const confirm=button(view,"Confirm this action"),bounds=body.getBoundingClientRect();
    expect(confirm.getBoundingClientRect().top).toBeGreaterThanOrEqual(bounds.top);expect(confirm.getBoundingClientRect().bottom).toBeLessThanOrEqual(bounds.bottom+1);
    confirm.focus();expect(view.shadowRoot!.activeElement).toBe(confirm);confirm.click();await settle(view);
    expect(requests.filter(item=>item.type==="ai_orchestrator/actions/confirm")).toHaveLength(1);
  });
});
