import { afterEach, describe, expect, it } from "vitest";
import * as axe from "axe-core";
import { WorkflowDraftView } from "../src/panel/workflow-draft-view";
import { fetchWorkflowDraftSource, generateWorkflowDraft } from "../src/api/workflow-draft-client";
import { parseStoredWorkflow } from "../src/api/workflow-client";
import type { HomeAssistantLike } from "../src/ha/hass-contract";
import { VALID_CATALOG } from "./catalog-client.browser.test";
import { createFakeHass, createRoutedFakeHass } from "./fixtures/fake-hass";
import { CHAT_OPTIONS, NOTIFY_TARGETS, STORED_WORKFLOW, WORKFLOW_LIST } from "./fixtures/workflows";
const provider="12345678-1234-4234-9234-123456789abc";
const response={schema_version:1,destination:"local",provider_calls:1,actions_executed:0,saved:false,
  workflow:{...STORED_WORKFLOW,enabled:false,run_mode:"execute",provider_connection_id:provider,triggers:[{kind:"manual"}],conditions:[]}};
const routes={"ai_orchestrator/catalog/list":VALID_CATALOG,"ai_orchestrator/chat/options":CHAT_OPTIONS,
  "ai_orchestrator/notify/targets":NOTIFY_TARGETS,"ai_orchestrator/workflows/generate_draft":response,"ai_orchestrator/workflows/list":WORKFLOW_LIST};
const sourceId="12345678-1234-4123-8123-123456789abd";
const sourceWorkflow=parseStoredWorkflow({...STORED_WORKFLOW,workflow_id:sourceId,triggers:[{kind:"state",entity_ids:["binary_sensor.kitchen_window"],to_state:"on"}],steps:[{step_id:"compose",kind:"ai_compose",prompt:"Synthetic source prompt"},{step_id:"notify",kind:"notify",notify_service:"notify.kitchen_speaker"}]});
const source={workflow_id:sourceId,version:"a".repeat(64),workflow:sourceWorkflow,entity_ids:["binary_sensor.kitchen_window"],notify_targets:["notify.kitchen_speaker"]};
const refined={...response,workflow:{...sourceWorkflow,workflow_id:STORED_WORKFLOW.workflow_id as string,enabled:false,run_mode:"execute",provider_connection_id:provider},source:{workflow_id:sourceId,version:source.version}};
const refinementRoutes={...routes,"ai_orchestrator/workflows/list":{...WORKFLOW_LIST,workflows:[{workflow:sourceWorkflow,status:(WORKFLOW_LIST.workflows as {status:unknown}[])[0]!.status}]},"ai_orchestrator/workflows/draft_source":{schema_version:1,source},"ai_orchestrator/workflows/generate_draft":refined};
const mounted:WorkflowDraftView[]=[];
async function settle(view:WorkflowDraftView){await view.updateComplete;await new Promise(r=>setTimeout(r,0));await view.updateComplete;}
async function mount(hass:HomeAssistantLike){const view=document.createElement("ai-orchestrator-workflow-draft") as WorkflowDraftView;view.hass=hass;document.body.append(view);mounted.push(view);await settle(view);return view;}
function button(view:WorkflowDraftView,name:string){return [...view.shadowRoot!.querySelectorAll("button")].find(b=>b.textContent?.trim()===name)!;}
async function prompt(view:WorkflowDraftView){const input=view.shadowRoot!.querySelector("textarea")!;input.value="Make a daily reminder";input.dispatchEvent(new Event("input"));await settle(view);}
async function chooseSource(view:WorkflowDraftView,id=sourceId){const select=view.shadowRoot!.querySelector("select")!;select.value=id;select.dispatchEvent(new Event("change"));await settle(view);}
afterEach(()=>mounted.splice(0).forEach(view=>view.remove()));
describe("AI workflow drafts",()=>{
  it.each([
    ["draft_invalid_result", "unsupported or oversized result"],
    ["draft_invalid_json", "did not return valid JSON"],
    ["draft_invalid_fields", "missing or unsupported top-level fields"],
    ["draft_invalid_schema", "invalid trigger, condition or step"],
    ["draft_invalid_references", "outside your selection"],
    ["draft_invalid_notify_order", "notify before composing a message"],
    ["draft_timeout", "The local provider took too long"],
    ["draft_provider_unavailable", "The selected local provider is unavailable or changed"],
    ["draft_invalid_selection", "A selected entity or notification target is unavailable"],
    ["draft_invalid_response", "The local provider did not produce a valid workflow draft"],
    ["draft_provider_failed", "The local provider could not complete the request"],
    ["draft_source_changed", "The source workflow changed or its references are not selected"],
    ["draft_source_unavailable", "the draft size limit was exceeded"],
    ["draft_busy", "Another draft is still running"],
    ["draft_cancelled", "Draft generation was cancelled"],
    ["unauthorized", "Administrator access is required"],
    ["not_loaded", "AI Orchestrator is not loaded"],
  ])("explains %s using static text without exposing backend details",async(code,expected)=>{
    const lookups=createRoutedFakeHass(routes);
    const view=await mount({callWS:async<T>(request:Record<string,unknown>)=>{
      if(request.type==="ai_orchestrator/workflows/generate_draft")throw {code,message:"PRIVATE_ERROR",data:"PRIVATE_PAYLOAD"};
      return lookups.callWS<T>(request);
    }});
    await prompt(view);button(view,"Generate draft").click();await settle(view);
    expect(view.shadowRoot!.textContent).toContain(expected);
    expect(view.shadowRoot!.textContent).toContain("Nothing was saved or enabled");
    expect(view.shadowRoot!.textContent).not.toContain("PRIVATE_");
    expect(view.shadowRoot!.textContent).not.toContain(code);
    expect(view.shadowRoot!.querySelector("textarea")!.value).toBe("Make a daily reminder");
    expect(button(view,"Generate draft").disabled).toBe(false);
    expect(button(view,"Review in workflow editor")).toBeUndefined();
  });
  it("ignores unknown, inherited and accessor error codes without invoking getters",async()=>{
    let getterCalls=0;
    const accessor=Object.defineProperty({},"code",{get(){getterCalls++;return "draft_timeout";}});
    const failures=[{code:"PRIVATE_UNKNOWN",message:"PRIVATE_ERROR"},Object.create({code:"draft_timeout"}) as unknown,accessor,{code:"constructor"},{code:{toString(){throw new Error("PRIVATE_COERCION");}}}];
    for(const failure of failures){
      const lookups=createRoutedFakeHass(routes);
      const view=await mount({callWS:async<T>(request:Record<string,unknown>)=>{
        if(request.type==="ai_orchestrator/workflows/generate_draft")throw failure;
        return lookups.callWS<T>(request);
      }});
      await prompt(view);button(view,"Generate draft").click();await settle(view);
      expect(view.shadowRoot!.textContent).toContain("The draft request failed");
      expect(view.shadowRoot!.textContent).not.toContain("PRIVATE_");
      expect(view.shadowRoot!.textContent).not.toContain("The local provider took too long");
    }
    expect(getterCalls).toBe(0);
  });
  it("explains a source lookup failure without displaying backend text",async()=>{
    const lookups=createRoutedFakeHass(refinementRoutes);
    const view=await mount({callWS:async<T>(request:Record<string,unknown>)=>{
      if(request.type==="ai_orchestrator/workflows/draft_source")throw {code:"draft_source_unavailable",message:"PRIVATE_SOURCE"};
      return lookups.callWS<T>(request);
    }});
    await chooseSource(view);
    expect(view.shadowRoot!.textContent).toContain("The source workflow is unavailable");
    expect(view.shadowRoot!.textContent).not.toContain("PRIVATE_SOURCE");
    expect(button(view,"Generate draft").disabled).toBe(true);
  });
  it("does not display a previous session's late typed error",async()=>{
    let reject!:(reason:unknown)=>void;const pending=new Promise((_resolve,fail)=>{reject=fail;});
    const lookups=createRoutedFakeHass(routes);
    const view=await mount({callWS:async<T>(request:Record<string,unknown>)=>request.type==="ai_orchestrator/workflows/generate_draft"?await pending as T:lookups.callWS<T>(request)});
    await prompt(view);button(view,"Generate draft").click();await settle(view);
    view.hass={...lookups,user:{id:"replacement"}};await settle(view);
    reject({code:"draft_timeout",message:"PRIVATE_LATE"});await settle(view);
    expect(view.shadowRoot!.textContent).not.toContain("The local provider took too long");
    expect(view.shadowRoot!.textContent).not.toContain("PRIVATE_LATE");
  });
  it("requires explicit source selection, discloses source content and generates only a new disabled copy",async()=>{
    const requests:Record<string,unknown>[]=[];const view=await mount(createRoutedFakeHass(refinementRoutes,message=>requests.push(message)));
    expect(requests.some(request=>request.type==="ai_orchestrator/workflows/draft_source")).toBe(false);
    await chooseSource(view);
    expect(requests.at(-1)).toEqual({type:"ai_orchestrator/workflows/draft_source",source_workflow_id:sourceId});
    expect(view.shadowRoot!.textContent).toContain("Synthetic source prompt");
    expect(view.shadowRoot!.textContent).toContain("existing workflow remains unchanged");
    await prompt(view);button(view,"Generate refined copy").click();button(view,"Generate refined copy").click();await settle(view);
    expect(requests.filter(request=>request.type==="ai_orchestrator/workflows/generate_draft")).toHaveLength(1);
    expect(requests.at(-1)).toMatchObject({source_workflow_id:sourceId,source_version:source.version,entity_ids:source.entity_ids,notify_targets:source.notify_targets});
    expect(requests.at(-1)).not.toHaveProperty("workflow");
    let copy:unknown;view.addEventListener("generated-workflow",event=>{copy=JSON.parse((event as CustomEvent<{json:string}>).detail.json);});
    button(view,"Review in workflow editor").click();expect(copy).toEqual(refined.workflow);
    expect(requests.some(request=>/\/save|set_enabled/u.test(String(request.type)))).toBe(false);
    view.style.width="390px";await settle(view);expect(view.scrollWidth).toBeLessThanOrEqual(390);
    const result=await axe.run({fromShadowDom:["ai-orchestrator-workflow-draft","section"]},{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}});expect(result.violations).toEqual([]);
  });
  it("rejects incomplete source references and mismatched/overwriting refinement responses",async()=>{
    await expect(fetchWorkflowDraftSource(createFakeHass({schema_version:1,source:{...source,entity_ids:[]}}),sourceId)).rejects.toThrow();
    await expect(fetchWorkflowDraftSource(createFakeHass({schema_version:1,source:{...source,version:"bad"}}),sourceId)).rejects.toThrow();
    for(const invalid of [{...refined,source:{workflow_id:sourceId,version:"b".repeat(64)}},{...refined,workflow:{...refined.workflow,workflow_id:sourceId}},{...refined,workflow:{...refined.workflow,triggers:[{kind:"state",entity_ids:["sensor.unselected"]}]}}]){
      await expect(generateWorkflowDraft(createFakeHass(invalid),provider,"Refine",source.entity_ids,source.notify_targets,source)).rejects.toThrow();
    }
    const requests:Record<string,unknown>[]=[];
    await expect(generateWorkflowDraft(createFakeHass(refined,message=>requests.push(message)),provider,"Refine",[],source.notify_targets,source)).rejects.toThrow();expect(requests).toEqual([]);
  });
  it("disables refinement when a required source notification is deselected",async()=>{
    const view=await mount(createRoutedFakeHass(refinementRoutes));await chooseSource(view);await prompt(view);
    const check=view.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;expect(check.checked).toBe(true);check.click();await settle(view);
    expect(button(view,"Generate refined copy").disabled).toBe(true);
    await chooseSource(view,"");expect(view.shadowRoot!.textContent).not.toContain("Synthetic source prompt");expect(view.shadowRoot!.querySelector("textarea")!.value).toBe("");
  });
  it("does not expose a previous session's late source snapshot",async()=>{
    let resolve!:(value:unknown)=>void;const pending=new Promise(done=>{resolve=done;});const lookups=createRoutedFakeHass(refinementRoutes);
    const view=await mount({callWS:async<T>(request:Record<string,unknown>)=>request.type==="ai_orchestrator/workflows/draft_source"?await pending as T:lookups.callWS<T>(request)});
    await chooseSource(view);view.hass={...lookups,user:{id:"new-user"}};await settle(view);resolve({schema_version:1,source});await settle(view);
    expect(view.shadowRoot!.textContent).not.toContain("Synthetic source prompt");expect(button(view,"Generate refined copy")).toBeUndefined();
  });
  it("keeps the generated review accessible and within a 390px layout",async()=>{
    const view=await mount(createRoutedFakeHass(routes));view.style.width="390px";
    await prompt(view);button(view,"Generate draft").click();await settle(view);
    const details=view.shadowRoot!.querySelector("details")!;details.open=true;await settle(view);
    expect(view.scrollWidth).toBeLessThanOrEqual(390);
    const result=await axe.run({fromShadowDom:["ai-orchestrator-workflow-draft","section"]},{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}});
    expect(result.violations).toEqual([]);
  });
  it("clears a completed draft and all selected context on disconnect",async()=>{
    const callbacks=new Map<string,()=>void>();
    const connection={connected:true,addEventListener:(name:string,callback:()=>void)=>{callbacks.set(name,callback);},removeEventListener:(name:string)=>{callbacks.delete(name);}};
    const view=await mount({...createRoutedFakeHass(routes),connection});await prompt(view);button(view,"Generate draft").click();await settle(view);
    expect(button(view,"Review in workflow editor")).toBeDefined();
    connection.connected=false;callbacks.get("disconnected")!();await settle(view);
    expect(button(view,"Review in workflow editor")).toBeUndefined();
    expect(view.shadowRoot!.querySelector("textarea")!.value).toBe("");
    expect(button(view,"Generate draft").disabled).toBe(true);
    view.remove();expect(callbacks.size).toBe(0);
  });
  it("renders static failure text without provider exception content or editor handoff",async()=>{
    const lookups=createRoutedFakeHass(routes);
    const view=await mount({callWS:async<T>(message:Record<string,unknown>)=>{
      if(message.type==="ai_orchestrator/workflows/generate_draft")throw new Error("PRIVATE_PROVIDER_MARKER");
      return lookups.callWS<T>(message);
    }});
    await prompt(view);button(view,"Generate draft").click();await settle(view);
    expect(view.shadowRoot!.textContent).toContain("Nothing was saved or enabled");
    expect(view.shadowRoot!.textContent).not.toContain("PRIVATE_PROVIDER_MARKER");
    expect(button(view,"Review in workflow editor")).toBeUndefined();
  });
  it("only generates on request and hands off a disabled draft without saving",async()=>{
    const requests:Record<string,unknown>[]=[];
    const view=await mount(createRoutedFakeHass(routes,m=>requests.push(m)));
    await prompt(view);
    button(view,"Generate draft").click();button(view,"Generate draft").click();await settle(view);
    expect(requests.filter(m=>m.type==="ai_orchestrator/workflows/generate_draft")).toHaveLength(1);
    expect(requests.some(m=>String(m.type).endsWith("/save"))).toBe(false);
    let draft:unknown;
    view.addEventListener("generated-workflow",event=>{draft=JSON.parse((event as CustomEvent<{json:string}>).detail.json);});
    button(view,"Review in workflow editor").click();
    expect(draft).toEqual(response.workflow);
    expect(view.shadowRoot!.textContent).toContain("Draft ready");
  });
  it("refuses an unknown selected entity and clears a draft on edits",async()=>{
    const view=await mount(createRoutedFakeHass(routes));await prompt(view);
    const entity=view.shadowRoot!.querySelector<HTMLInputElement>("input[list]")!;
    entity.value="binary_sensor.invented";entity.dispatchEvent(new Event("input"));await settle(view);
    expect(button(view,"Generate draft").disabled).toBe(true);
    entity.value="";entity.dispatchEvent(new Event("input"));await settle(view);
    button(view,"Generate draft").click();await settle(view);
    expect(button(view,"Review in workflow editor")).toBeDefined();
    await prompt(view);expect(button(view,"Review in workflow editor")).toBeUndefined();
  });
  it("rejects activated, saved, cloud or mismatched drafts",async()=>{
    for(const bad of [{...response,saved:true},{...response,destination:"cloud"},{...response,workflow:{...response.workflow,enabled:true}},
      {...response,workflow:{...response.workflow,provider_connection_id:null}}]){
      await expect(generateWorkflowDraft(createFakeHass(bad),provider,"draft",[],[])).rejects.toThrow();
    }
  });
  it("discards a generated response after the Home Assistant session changes",async()=>{
    let resolve!:(value:unknown)=>void;const pending=new Promise(r=>{resolve=r;});
    const lookups=createRoutedFakeHass(routes);
    const view=await mount({callWS:async<T>(m:Record<string,unknown>)=>m.type==="ai_orchestrator/workflows/generate_draft"?await pending as T:lookups.callWS<T>(m)});
    await prompt(view);button(view,"Generate draft").click();await settle(view);
    view.hass=createRoutedFakeHass(routes);await settle(view);resolve(response);await settle(view);
    expect(button(view,"Review in workflow editor")).toBeUndefined();
    expect(view.shadowRoot!.textContent).not.toContain("Draft ready");
  });
});
