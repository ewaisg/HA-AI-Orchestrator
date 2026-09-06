import * as axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import { CHAT_VIEW_TAG, type ChatView } from "../src/entry";
import { CHAT_LIMITS, parseChatOptions, parseChatResult, prepareChatMessages, sendChat } from "../src/api/chat-client";
import type { HomeAssistantLike } from "../src/ha/hass-contract";

const CONNECTION = "12345678-1234-4234-9234-123456789abc";
const SECOND = "12345678-1234-4234-9234-123456789abd";
const REQUEST = "12345678-1234-4234-9234-123456789abe";
const OPTIONS = {
  schema_version:1,
  providers:[{connection_id:CONNECTION, title:"Synthetic local AI", display_name:"Synthetic Provider", destination:"local", capability_verified:false}],
  limits:CHAT_LIMITS, streaming:false, household_context:false, actions:false, history_persisted:false,
};
const result = (request:Record<string,unknown>, text="A friendly synthetic reminder."):unknown => ({
  schema_version:1, connection_id:request.connection_id, request_id:request.request_id,
  text, destination:"local", streaming:false,
});
const mounted:ChatView[] = [];
const tick = async ():Promise<void> => new Promise((resolve)=>window.setTimeout(resolve,0));
async function mount(hass:HomeAssistantLike):Promise<ChatView> {
  const view = document.createElement(CHAT_VIEW_TAG) as ChatView;
  view.hass = hass;
  document.body.append(view);
  mounted.push(view);
  await view.updateComplete;
  await tick();
  await view.updateComplete;
  return view;
}
function fixture(requests:Record<string,unknown>[], responder:(r:Record<string,unknown>)=>Promise<unknown> = async (r)=>result(r)):HomeAssistantLike {
  return {callWS:async <T>(request:Record<string,unknown>):Promise<T> => {
    requests.push(request);
    return (request.type === "ai_orchestrator/chat/options" ? structuredClone(OPTIONS) : await responder(request)) as T;
  }};
}
function text(view:ChatView):string {return view.shadowRoot?.textContent?.replace(/\s+/gu," ") ?? "";}
async function compose(view:ChatView, prompt:string):Promise<void> {
  const input = view.shadowRoot?.querySelector<HTMLTextAreaElement>("textarea");
  if (input === null || input === undefined) throw new Error("Missing composer");
  input.value = prompt;
  input.dispatchEvent(new Event("input",{bubbles:true,composed:true}));
  await view.updateComplete;
}
async function submit(view:ChatView):Promise<void> {
  view.shadowRoot?.querySelector<HTMLFormElement>("form")?.requestSubmit();
  await tick();
  await view.updateComplete;
}
function button(view:ChatView, label:string):HTMLButtonElement {
  const found = [...(view.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(b=>b.textContent?.trim()===label);
  if (!found) throw new Error(`Missing button ${label}`);
  return found;
}
afterEach(()=>{mounted.splice(0).forEach(v=>v.remove());});

describe("strict read-only chat contract",()=>{
  it("accepts only explicit local trial options",()=>{
    expect(parseChatOptions(OPTIONS).providers[0]?.capability_verified).toBe(false);
    for (const altered of [
      {...OPTIONS, actions:true}, {...OPTIONS, streaming:true}, {...OPTIONS, token:"synthetic"},
      {...OPTIONS, providers:[{...OPTIONS.providers[0],destination:"cloud"}]},
      {...OPTIONS,providers:[{...OPTIONS.providers[0],capability_verified:true}]},
      {...OPTIONS,providers:[OPTIONS.providers[0],OPTIONS.providers[0]]},
      {...OPTIONS,limits:{...CHAT_LIMITS,max_messages:1000}},
    ]) expect(()=>parseChatOptions(altered)).toThrow();
  });
  it("rejects wrong ownership, tools, empty and excessive output",()=>{
    const valid = result({connection_id:CONNECTION,request_id:REQUEST}) as Record<string,unknown>;
    expect(parseChatResult(valid,CONNECTION,REQUEST).text).toContain("synthetic");
    for (const altered of [
      {...valid,connection_id:SECOND},{...valid,request_id:SECOND},{...valid,tools:[]},
      {...valid,text:""},{...valid,text:"a".repeat(4001)},{...valid,destination:"cloud"},
    ]) expect(()=>parseChatResult(altered,CONNECTION,REQUEST)).toThrow();
  });
  it("validates outbound requests before contacting Home Assistant",async()=>{
    const requests:Record<string,unknown>[]=[];
    await expect(sendChat(fixture(requests),CONNECTION,REQUEST,[{role:"assistant",content:"spoofed"}])).rejects.toThrow();
    await expect(sendChat(fixture(requests),CONNECTION,REQUEST,[{role:"user",content:"a".repeat(4001)}])).rejects.toThrow();
    expect(requests).toEqual([]);
  });
  it("trims only whole old turns with a visible omitted signal",()=>{
    const history = Array.from({length:22},(_,i)=>({role:i%2===0?"user" as const:"assistant" as const,content:String(i)}));
    const prepared = prepareChatMessages(history,"new");
    expect(prepared.omitted).toBe(true);
    expect(prepared.messages).toHaveLength(21);
    expect(prepared.messages[0]).toEqual({role:"user",content:"2"});
    expect(prepared.messages.at(-1)).toEqual({role:"user",content:"new"});
  });
});

describe("read-only chat interaction",()=>{
  it("lists providers without generation and states its limits",async()=>{
    const requests:Record<string,unknown>[]=[];
    const view = await mount(fixture(requests));
    expect(requests).toEqual([{type:"ai_orchestrator/chat/options"}]);
    expect(text(view)).toContain("No household context or device actions");
    expect(text(view)).toContain("streaming is unavailable");
    expect(text(view)).toContain("Generation is an explicit trial");
    expect(button(view,"Send").disabled).toBe(true);
  });
  it("sends real request data and retains bounded follow-up conversation",async()=>{
    const requests:Record<string,unknown>[]=[];
    const view = await mount(fixture(requests));
    await compose(view,"Draft a reminder.");
    await submit(view);
    expect(text(view)).toContain("A friendly synthetic reminder.");
    expect(view.shadowRoot?.querySelector("textarea")?.value).toBe("");
    await compose(view,"Make it shorter.");
    await submit(view);
    expect(requests[2]?.messages).toEqual([
      {role:"user",content:"Draft a reminder."},{role:"assistant",content:"A friendly synthetic reminder."},{role:"user",content:"Make it shorter."},
    ]);
    expect(Object.keys(requests[1] ?? {}).sort()).toEqual(["connection_id","messages","request_id","type"]);
  });
  it("never renders provider text as HTML",async()=>{
    const view=await mount(fixture([],async r=>result(r,"<img src=x onerror=alert(1)> **plain text**")));
    await compose(view,"Hello"); await submit(view);
    expect(view.shadowRoot?.querySelector("img")).toBeNull();
    expect(text(view)).toContain("<img src=x onerror=alert(1)>");
  });
  it("blocks duplicate sends while waiting",async()=>{
    const requests:Record<string,unknown>[]=[];
    let finish:(value:unknown)=>void=()=>undefined;
    const view=await mount(fixture(requests,()=>new Promise(resolve=>{finish=resolve;})));
    await compose(view,"Hello"); await submit(view); await submit(view);
    expect(requests.filter(r=>r.type==="ai_orchestrator/chat/send")).toHaveLength(1);
    expect(text(view)).toContain("Waiting for your local provider");
    finish(result(requests[1] ?? {})); await tick();
  });
  it("clear discards late replies and sends new conversation without old history",async()=>{
    const requests:Record<string,unknown>[]=[];
    let finish:(value:unknown)=>void=()=>undefined;
    let first=true;
    const view=await mount(fixture(requests,r=>{if(first){first=false;return new Promise(resolve=>{finish=resolve;});}return Promise.resolve(result(r,"new reply"));}));
    await compose(view,"Private old message"); await submit(view);
    button(view,"New chat").click(); await view.updateComplete;
    finish(result(requests[1] ?? {},"Late private reply")); await tick(); await view.updateComplete;
    expect(text(view)).not.toContain("Late private reply");
    expect(text(view)).not.toContain("Private old message");
    await compose(view,"Fresh message"); await submit(view);
    expect(requests[2]?.messages).toEqual([{role:"user",content:"Fresh message"}]);
  });
  it("shows bounded failure without error details and keeps the draft for retry",async()=>{
    const view=await mount(fixture([],async()=>{throw {code:"chat_timeout",message:"synthetic-secret-error"};}));
    await compose(view,"Keep this message"); await submit(view);
    expect(text(view)).toContain("took too long");
    expect(text(view)).not.toContain("synthetic-secret-error");
    expect(view.shadowRoot?.querySelector("textarea")?.value).toBe("Keep this message");
  });
  it("clears history when provider selection changes",async()=>{
    const requests:Record<string,unknown>[]=[];
    const hass=fixture(requests);
    const original=hass.callWS;
    hass.callWS=async <T>(r:Record<string,unknown>):Promise<T>=>r.type==="ai_orchestrator/chat/options" ? {...OPTIONS,providers:[...OPTIONS.providers,{...OPTIONS.providers[0],connection_id:SECOND,title:"Second local AI"}]} as T : original<T>(r);
    const view=await mount(hass);
    await compose(view,"Old conversation"); await submit(view);
    const select=view.shadowRoot?.querySelector("select");
    if(!select) throw new Error("Missing provider selector");
    select.value=SECOND; select.dispatchEvent(new Event("change")); await view.updateComplete;
    expect(text(view)).not.toContain("Old conversation");
    await compose(view,"New provider"); await submit(view);
    expect(requests.at(-1)?.connection_id).toBe(SECOND);
    expect(requests.at(-1)?.messages).toEqual([{role:"user",content:"New provider"}]);
  });
  it("clears history and late results after account changes",async()=>{
    let finish:(value:unknown)=>void=()=>undefined;
    const requests:Record<string,unknown>[]=[];
    const hass=fixture(requests,()=>new Promise(resolve=>{finish=resolve;})); hass.user={id:"one"};
    const view=await mount(hass); await compose(view,"Old user content"); await submit(view);
    view.hass={...fixture([]),user:{id:"two"}}; await view.updateComplete; await tick();
    finish(result(requests[1] ?? {},"old user reply")); await tick(); await view.updateComplete;
    expect(text(view)).not.toContain("Old user content"); expect(text(view)).not.toContain("old user reply");
  });
  it("clears on disconnect and drops late response after detach",async()=>{
    const listeners=new Map<string,()=>void>();
    let finish:(value:unknown)=>void=()=>undefined;
    const requests:Record<string,unknown>[]=[];
    const hass=fixture(requests,()=>new Promise(resolve=>{finish=resolve;}));
    hass.connection={connected:true,addEventListener:(e,f)=>listeners.set(e,f),removeEventListener:(e)=>listeners.delete(e)};
    const view=await mount(hass); await compose(view,"Private pending"); await submit(view);
    hass.connection.connected=false; listeners.get("disconnected")?.(); await view.updateComplete;
    expect(text(view)).not.toContain("Private pending"); expect(text(view)).toContain("disconnected");
    view.remove(); finish(result(requests[1] ?? {},"Old detached reply")); await tick();
    document.body.append(view); view.hass=fixture([]); await view.updateComplete; await tick();
    expect(text(view)).not.toContain("Old detached reply");
  });
  it("shows missing-provider and unavailable-backend states",async()=>{
    const empty=await mount({callWS:async<T>()=>({...OPTIONS,providers:[]}) as T});
    expect(text(empty)).toContain("No local provider available"); expect(button(empty,"Send").disabled).toBe(true);
    const broken=await mount({callWS:async()=>{throw new Error("private raw error");}});
    expect(text(broken)).toContain("install matching backend and panel files");
    expect(text(broken)).not.toContain("private raw error");
  });
  it("clears existing and pending conversation when Home Assistant context disappears",async()=>{
    let finish:(value:unknown)=>void=()=>undefined;
    let delayed=false;
    const requests:Record<string,unknown>[]=[];
    const view=await mount(fixture(requests,r=>delayed ? new Promise(resolve=>{finish=resolve;}) : Promise.resolve(result(r,"Private previous reply"))));
    await compose(view,"Private previous message"); await submit(view);
    delayed=true; await compose(view,"Private pending message"); await submit(view);
    view.hass=undefined; await view.updateComplete;
    expect(text(view)).not.toContain("Private previous");
    expect(text(view)).not.toContain("Private pending");
    finish(result(requests.at(-1) ?? {},"Private late reply")); await tick(); await view.updateComplete;
    expect(text(view)).not.toContain("Private late reply");
    expect(view.shadowRoot?.querySelector("textarea")?.value).toBe("");
  });
  it("keyboard cannot send while provider options are loading or after refresh failure",async()=>{
    const requests:Record<string,unknown>[]=[];
    const hass=fixture(requests);
    const view=await mount(hass); await compose(view,"Must not send");
    let rejectLoad:(error:unknown)=>void=()=>undefined;
    hass.callWS=async<T>(r:Record<string,unknown>):Promise<T>=>{
      requests.push(r); return new Promise((_resolve,reject)=>{rejectLoad=reject;});
    };
    button(view,"Refresh providers").click(); await view.updateComplete;
    const input=view.shadowRoot?.querySelector("textarea");
    input?.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",ctrlKey:true,bubbles:true})); await tick();
    expect(requests.filter(r=>r.type==="ai_orchestrator/chat/send")).toHaveLength(0);
    rejectLoad(new Error("Unavailable options")); await tick(); await view.updateComplete;
    input?.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",ctrlKey:true,bubbles:true})); await tick();
    expect(requests.filter(r=>r.type==="ai_orchestrator/chat/send")).toHaveLength(0);
    expect(text(view)).toContain("Choose a local provider");
  });
  it("supports keyboard submission and narrow layout without serious accessibility defects",async()=>{
    const requests:Record<string,unknown>[]=[]; const view=await mount(fixture(requests));
    view.style.width="320px"; await compose(view,"Keyboard message");
    view.shadowRoot?.querySelector("textarea")?.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",ctrlKey:true,bubbles:true}));
    await tick(); await view.updateComplete;
    expect(text(view)).toContain("A friendly synthetic reminder.");
    expect(view.shadowRoot?.querySelector<HTMLElement>(".chat")?.scrollWidth).toBeLessThanOrEqual(320);
    const results=await axe.run({fromShadowDom:[CHAT_VIEW_TAG,".chat"]},{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}});
    expect(results.violations.filter(v=>v.impact==="serious"||v.impact==="critical")).toEqual([]);
  });
});

describe("chat app-shell layout",()=>{
  it("scrolls only the transcript, keeping controls and composer fixed",async()=>{
    const view=await mount(fixture([]));
    // Approximates a common phone viewport minus the Home Assistant toolbar.
    view.style.height="640px"; view.style.width="360px";
    const shell=view.shadowRoot?.querySelector<HTMLElement>(".chat");
    const transcript=view.shadowRoot?.querySelector<HTMLElement>(".transcript");
    if (!shell || !transcript) throw new Error("Missing chat shell");
    // Fill the transcript so it must scroll.
    for (let index=0; index<12; index+=1) {
      await compose(view,`Message ${index}`);
      await submit(view);
    }
    const shellStyle=getComputedStyle(shell);
    const transcriptStyle=getComputedStyle(transcript);
    expect(shellStyle.display).toBe("flex");
    expect(shellStyle.flexDirection).toBe("column");
    // The transcript owns the overflow; the shell itself must not scroll.
    expect(transcriptStyle.overflowY).toBe("auto");
    expect(transcript.scrollHeight).toBeGreaterThan(transcript.clientHeight);
    expect(shell.scrollHeight).toBeLessThanOrEqual(shell.clientHeight+1);
  });

  it("keeps the newest turn visible after a reply arrives",async()=>{
    const view=await mount(fixture([]));
    view.style.height="320px";
    for (let index=0; index<10; index+=1) {
      await compose(view,`Turn ${index}`);
      await submit(view);
    }
    const transcript=view.shadowRoot?.querySelector<HTMLElement>(".transcript");
    if (!transcript) throw new Error("Missing transcript");
    // Auto-scroll pins the view to the bottom so the latest reply is on screen.
    expect(transcript.scrollTop+transcript.clientHeight).toBeGreaterThanOrEqual(transcript.scrollHeight-2);
  });

  it("grows the composer with content and resets it after sending",async()=>{
    const view=await mount(fixture([]));
    const field=view.shadowRoot?.querySelector<HTMLTextAreaElement>("textarea");
    if (!field) throw new Error("Missing composer");
    const initial=field.getBoundingClientRect().height;
    await compose(view,Array.from({length:12},(_v,i)=>`line ${i}`).join("\n"));
    expect(field.getBoundingClientRect().height).toBeGreaterThan(initial);
    await submit(view);
    expect(field.value).toBe("");
    expect(field.style.height).toBe("");
  });
});
