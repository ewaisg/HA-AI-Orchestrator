import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { fetchChatOptions, newRequestId, prepareChatMessages, sendChat, type ChatMessage, type ChatProvider } from "../api/chat-client";
import { askScopedAgent, fetchAgentProfiles, probeAgentTools } from "../api/agent-client";
import { ACTION_LABELS, confirmAction, fetchActionCatalog, interpretAction, type ActionProposal } from "../api/action-client";
import { fetchCatalog, type CatalogEntity } from "../api/catalog-client";
import { fetchNotifyTargets, type NotifyTarget } from "../api/notify-client";
import { fetchWorkflows, type StoredWorkflow } from "../api/workflow-client";
import { fetchWorkflowDraftSource, generateWorkflowDraft, type WorkflowDraftSource } from "../api/workflow-draft-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

type Intent = "chat" | "observe" | "action" | "draft";
const INTENTS: Record<Intent, string> = { chat: "Conversation", observe: "Read permitted states", action: "Propose device action", draft: "Draft automation" };
interface Turn { intent: Intent; prompt: string; text: string; trace?: string[] }

export class AssistantView extends LitElement {
  static override properties = {
    hass: { attribute: false }, _providers: { state: true }, _provider: { state: true }, _intent: { state: true },
    _prompt: { state: true }, _busy: { state: true }, _message: { state: true }, _turns: { state: true },
    _proposal: { state: true }, _draft: { state: true }, _entities: { state: true }, _targets: { state: true },
    _selectedEntities: { state: true }, _selectedTargets: { state: true }, _sources: { state: true },
    _sourceId: { state: true }, _source: { state: true }, _draftReady: { state: true },
    _entityQuery: { state: true }, _targetQuery: { state: true },
  };
  static override styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; min-width:0; overflow:hidden; color:var(--primary-text-color,#233642); }
    * { box-sizing:border-box; }
    header { flex:0 0 auto; max-height:34%; overflow:auto; }
    .header-controls { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    header label { margin:4px 0; font-size:.8rem; }
    .body { flex:1 1 auto; min-height:0; overflow:auto; overscroll-behavior:contain; padding:0 3px; }
    footer { flex:0 0 auto; max-height:48%; min-height:0; overflow:auto; border-top:1px solid var(--divider-color,#ccd); padding:4px 0; }
    footer label { margin:2px 0; font-size:.8rem; } footer p { margin:2px 0; }
    .footer-controls { display:flex; flex-wrap:wrap; gap:4px; } .footer-controls button { margin:2px 0; font-size:.85rem; }
    h1 { font-size:1.2rem; margin:0 0 4px; } h2 { font-size:1.1rem; }
    p,li,dd { line-height:1.5; overflow-wrap:anywhere; } dd { margin:0 0 8px; }
    label { display:block; margin:10px 0; } select,textarea { display:block; width:100%; min-width:0; font:inherit; color:inherit; background:var(--card-background-color,white); }
    select,button,input { min-height:44px; max-width:100%; } button { font:inherit; padding:8px 12px; margin:4px; cursor:pointer; } button:disabled { opacity:.6; cursor:default; }
    button:focus-visible,select:focus-visible,textarea:focus-visible,input:focus-visible { outline:3px solid var(--primary-color,#007a78); outline-offset:2px; }
    textarea { height:54px; min-height:44px; resize:vertical; max-height:100px; }
    .transcript { list-style:none; padding:0; }
    .transcript li,section { border:1px solid var(--divider-color,#ccd); border-radius:10px; padding:12px; margin:10px 0; }
    .choices { max-height:180px; overflow:auto; }
    pre { white-space:pre-wrap; overflow-wrap:anywhere; max-height:240px; overflow:auto; }
    .turn-text { white-space:pre-wrap; }
  `;
  declare hass?: HomeAssistantLike;
  private declare _providers: ChatProvider[];
  private declare _provider: string;
  private declare _intent: Intent;
  private declare _prompt: string;
  private declare _busy: boolean;
  private declare _message: string;
  private declare _turns: Turn[];
  private declare _proposal?: ActionProposal;
  private declare _draft?: StoredWorkflow;
  private declare _entities: CatalogEntity[];
  private declare _targets: NotifyTarget[];
  private declare _selectedEntities: string[];
  private declare _selectedTargets: string[];
  private declare _sources: StoredWorkflow[];
  private declare _sourceId: string;
  private declare _source?: WorkflowDraftSource;
  private declare _draftReady: boolean;
  private declare _entityQuery: string;
  private declare _targetQuery: string;
  private _chatContext: ChatMessage[] = [];
  private _epoch = 0;
  private _socket?: HomeAssistantLike["connection"];
  private _call?: HomeAssistantLike["callWS"];
  private _user?: string;
  private _expiry?: ReturnType<typeof setTimeout>;
  constructor() {
    super(); this._providers=[]; this._provider=""; this._intent="chat"; this._prompt="";
    this._busy=false; this._message=""; this._turns=[]; this._entities=[]; this._targets=[];
    this._selectedEntities=[]; this._selectedTargets=[]; this._sources=[]; this._sourceId=""; this._draftReady=false; this._entityQuery=""; this._targetQuery="";
  }
  private _clearCards(): void { clearTimeout(this._expiry); this._expiry=undefined; this._proposal=undefined; this._draft=undefined; }
  private readonly _reset = (): void => {
    this._epoch++; this._clearCards(); this._providers=[]; this._provider=""; this._intent="chat";
    this._prompt=""; this._busy=false; this._message=""; this._turns=[]; this._chatContext=[];
    this._entities=[]; this._targets=[]; this._selectedEntities=[]; this._selectedTargets=[];
    this._sources=[]; this._sourceId=""; this._source=undefined; this._draftReady=false; this._entityQuery=""; this._targetQuery="";
  };
  private readonly _ready = (): void => { void this._load(); };
  override disconnectedCallback(): void {
    this._socket?.removeEventListener("disconnected",this._reset); this._socket?.removeEventListener("ready",this._ready);
    this._reset(); this._call=undefined; super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("hass") && (this._socket!==this.hass?.connection || this._call!==this.hass?.callWS || this._user!==this.hass?.user?.id)) {
      this._socket?.removeEventListener("disconnected",this._reset); this._socket?.removeEventListener("ready",this._ready);
      this._reset(); this._socket=this.hass?.connection; this._call=this.hass?.callWS; this._user=this.hass?.user?.id;
      this._socket?.addEventListener("disconnected",this._reset); this._socket?.addEventListener("ready",this._ready);
      queueMicrotask(this._ready);
    }
  }
  private _online(): boolean { return !!this.hass && this.isConnected && this.hass.connection?.connected!==false; }
  private _current(epoch: number, hass: HomeAssistantLike, provider: string, user = this._user): boolean {
    return this._online() && epoch===this._epoch && this._provider===provider && this.hass?.callWS===hass.callWS && this.hass?.connection===hass.connection && this.hass?.user?.id===user;
  }
  private async _load(): Promise<void> {
    if (!this._online()) return;
    this._reset(); const epoch=this._epoch; const hass=this.hass!; this._busy=true;
    try { const options=await fetchChatOptions(hass); if (!this._current(epoch,hass,"")) return; this._providers=options.providers; this._provider=options.providers[0]?.connection_id??""; }
    catch { if(epoch===this._epoch) this._message="Providers could not load. Check administrator access and reload."; }
    finally { if(epoch===this._epoch) this._busy=false; }
  }
  private _chooseProvider(provider: string): void {
    if(this._busy || !this._providers.some(item=>item.connection_id===provider)) return;
    this._epoch++; this._clearCards(); this._provider=provider; this._prompt=""; this._turns=[]; this._chatContext=[];
    this._selectedEntities=[]; this._selectedTargets=[]; this._sourceId=""; this._source=undefined; this._message="";
  }
  private async _chooseIntent(intent: Intent): Promise<void> {
    if(this._busy || !Object.hasOwn(INTENTS,intent)) return;
    this._epoch++; this._clearCards(); this._intent=intent; this._message="";
    if(intent!=="draft" || this._draftReady || !this._online()) return;
    const epoch=this._epoch, hass=this.hass!, provider=this._provider; this._busy=true;
    try {
      const [catalog,targets,workflows]=await Promise.all([fetchCatalog(hass),fetchNotifyTargets(hass),fetchWorkflows(hass)]);
      if(!this._current(epoch,hass,provider)) return;
      this._entities=catalog.entities.filter(item=>!item.disabled); this._targets=targets;
      this._sources=workflows.store==="ready"?workflows.workflows.map(item=>item.workflow):[]; this._draftReady=true;
    } catch { if(epoch===this._epoch) this._message="Draft choices could not load. Reload the assistant and try again."; }
    finally { if(epoch===this._epoch) this._busy=false; }
  }
  private async _chooseSource(id: string): Promise<void> {
    if(this._busy || !this._online()) return;
    this._epoch++; this._clearCards(); this._sourceId=id; this._source=undefined; this._selectedEntities=[]; this._selectedTargets=[];
    if(!id) return;
    const epoch=this._epoch,hass=this.hass!,provider=this._provider; this._busy=true;
    try { const source=await fetchWorkflowDraftSource(hass,id); if(!this._current(epoch,hass,provider)) return; this._source=source; this._selectedEntities=[...source.entity_ids]; this._selectedTargets=[...source.notify_targets]; }
    catch { if(epoch===this._epoch) this._message="The source could not be loaded. Select it again or start a new draft."; }
    finally { if(epoch===this._epoch) this._busy=false; }
  }
  private _validDraft(): boolean {
    return this._draftReady && (!this._sourceId || !!this._source) && this._selectedEntities.length<=8 && this._selectedTargets.length<=8 &&
      this._selectedEntities.every(id=>this._entities.some(item=>item.entity_id===id)) && this._selectedTargets.every(id=>this._targets.some(item=>item.reference===id)) &&
      (this._source?.entity_ids.every(id=>this._selectedEntities.includes(id))??true) && (this._source?.notify_targets.every(id=>this._selectedTargets.includes(id))??true);
  }
  private async _probe(): Promise<void> {
    if(!this._online() || this._busy || !this._provider) return;
    const epoch=++this._epoch,hass=this.hass!,provider=this._provider; this._clearCards(); this._busy=true;
    try { const supported=await probeAgentTools(hass,provider); if(this._current(epoch,hass,provider)) this._message=supported?"Synthetic state-tool test passed for this loaded provider. This does not verify device actions or automation generation.":"State-tool support was not verified. Check the local provider."; }
    catch { if(epoch===this._epoch) this._message="Tool support could not be verified."; }
    finally { if(epoch===this._epoch) this._busy=false; }
  }
  private async _send(): Promise<void> {
    if(!this._online() || this._busy || !this._provider || !this._prompt.trim() || this._prompt.length>4000 || (this._intent==="draft"&&!this._validDraft())) return;
    const epoch=++this._epoch,hass=this.hass!,provider=this._provider,prompt=this._prompt,intent=this._intent;
    this._clearCards(); this._busy=true; this._message="";
    const current=()=>this._current(epoch,hass,provider);
    try {
      let text=""; let trace: string[]|undefined;
      if(intent==="chat") {
        const prepared=prepareChatMessages(this._chatContext,prompt);
        const result=await sendChat(hass,provider,newRequestId(),prepared.messages); if(!current()) return;
        text=result.text; this._chatContext=[...prepared.messages,{role:"assistant",content:text}];
        if(prepared.omitted) this._message="Older conversation turns were omitted from model context.";
      } else if(intent==="observe") {
        const profiles=await fetchAgentProfiles(hass); if(!current()) return;
        const profile=profiles.find(item=>item.connection_id===provider);
        if(!profile?.observe_registry_ids.length) throw new Error("No observation scope");
        const result=await askScopedAgent(hass,profile,prompt); if(!current()) return;
        text=result.text; trace=result.trace.map(item=>item==="state_read"?"Read permitted entity state":"Local provider returned a response");
      } else if(intent==="action") {
        const catalog=await fetchActionCatalog(hass,provider); if(!current()) return;
        if(!catalog.profile.action_scopes.length) throw new Error("No action scope");
        const proposal=await interpretAction(hass,catalog,prompt); if(!current()) return;
        this._proposal=proposal;
        text="A permitted action proposal is ready. Review the exact target and confirm separately.";
        this._expiry=setTimeout(()=>{ this._proposal=undefined; this._message="Action confirmation expired. Submit a new request to review again."; },this._proposal.expires_in*1000);
      } else {
        const draft=await generateWorkflowDraft(hass,provider,prompt,[...this._selectedEntities],[...this._selectedTargets],this._source); if(!current()) return;
        this._draft=draft; text="New disabled, unsaved draft ready. Review in the editor, then save, dry run and enable separately.";
      }
      this._turns=[...this._turns,{intent,prompt,text,...(trace?{trace}: {})}].slice(-20); this._prompt="";
    } catch { if(current()) this._message="Request failed. Check the selected provider and permissions, then review your request. No confirmation, workflow save or enable was sent."; }
    finally { if(epoch===this._epoch) this._busy=false; }
  }
  private async _confirm(): Promise<void> {
    if(!this._online() || this._busy || !this._proposal) return;
    const proposal=this._proposal,epoch=++this._epoch,hass=this.hass!,provider=this._provider; this._clearCards(); this._busy=true;
    try { const outcome=await confirmAction(hass,proposal); if(this._current(epoch,hass,provider)) this._message=outcome==="completed"?"Home Assistant accepted the action. Check the physical device to verify the result.":"Action outcome is unknown. Check the device before requesting another action."; }
    catch { if(epoch===this._epoch) this._message="Action confirmation failed or the outcome is unknown. Check the device before trying again."; }
    finally { if(epoch===this._epoch) this._busy=false; }
  }
  protected override render() {
    const entities=this._entities.filter(item=>`${item.name??""} ${item.entity_id}`.toLowerCase().includes(this._entityQuery.toLowerCase()));
    const targets=this._targets.filter(item=>`${item.name} ${item.reference}`.toLowerCase().includes(this._targetQuery.toLowerCase()));
    return html`<header><h1>Assistant</h1><div class="header-controls">
      <label>Local provider<select .value=${this._provider} ?disabled=${this._busy} @change=${(event:Event)=>this._chooseProvider((event.target as HTMLSelectElement).value)}>${this._providers.map(item=>html`<option value=${item.connection_id}>${item.title}</option>`)}</select></label>
      <label>Request type<select .value=${this._intent} ?disabled=${this._busy} @change=${(event:Event)=>{void this._chooseIntent((event.target as HTMLSelectElement).value as Intent);}}>${Object.entries(INTENTS).map(([value,label])=>html`<option value=${value}>${label}</option>`)}</select></label>
      </div></header><div class="body" role="region" aria-label="Assistant content" tabindex="0">
      <p>Choose how to handle each message. Only conversation turns enter conversation context; permitted-state answers, device proposals and drafts are kept separate. This view is temporary and clears on session or provider changes.</p>
      ${this._intent==="observe"?html`<p>Uses saved observation permissions. Configure those in Entities & Permissions first.</p><button ?disabled=${this._busy||!this._provider} @click=${()=>{void this._probe();}}>Test state-tool support</button>`:nothing}
      ${this._intent==="action"?html`<p>Your request and granted target names/IDs go to the local model. Current device states are not sent. Saved grants are required; the model cannot confirm.</p>`:nothing}
      ${this._intent==="draft"?html`<section aria-label="Draft context"><p>Only this request, selected identifiers and any explicitly selected source drafting fields go to the local model. No household states are included.</p>
        <label>Starting workflow<select .value=${this._sourceId} ?disabled=${this._busy||!this._draftReady} @change=${(event:Event)=>{void this._chooseSource((event.target as HTMLSelectElement).value);}}><option value="">New draft</option>${this._sources.map(item=>html`<option value=${item.workflow_id}>${item.name}</option>`)}</select></label>
        ${this._source?html`<details><summary>Source fields sent to the model</summary><pre>${JSON.stringify({name:this._source.workflow.name,description:this._source.workflow.description,triggers:this._source.workflow.triggers,conditions:this._source.workflow.conditions,steps:this._source.workflow.steps},null,2)}</pre></details>`:nothing}
        <p>Select up to eight entities and eight notification targets. Source references must remain selected.</p>
        <p>Selected entities: ${this._selectedEntities.join(", ")||"none"}. Selected notification targets: ${this._selectedTargets.join(", ")||"none"}.</p>
        <label>Find draft entity<input type="search" .value=${this._entityQuery} @input=${(event:Event)=>{this._entityQuery=(event.target as HTMLInputElement).value;}}></label>
        <div class="choices" aria-label="Draft entities">${entities.slice(0,100).map(item=>html`<label><input type="checkbox" .checked=${this._selectedEntities.includes(item.entity_id)} ?disabled=${this._busy||(!this._selectedEntities.includes(item.entity_id)&&this._selectedEntities.length>=8)} @change=${(event:Event)=>{this._clearCards();this._selectedEntities=(event.target as HTMLInputElement).checked?[...this._selectedEntities,item.entity_id]:this._selectedEntities.filter(id=>id!==item.entity_id);}}>${item.name??item.entity_id} (${item.entity_id})</label>`)}</div>
        ${entities.length>100?html`<p>Showing the first 100 matching entities. Refine your search.</p>`:nothing}
        <label>Find notification target<input type="search" .value=${this._targetQuery} @input=${(event:Event)=>{this._targetQuery=(event.target as HTMLInputElement).value;}}></label>
        <div class="choices" aria-label="Notification targets">${targets.slice(0,100).map(item=>html`<label><input type="checkbox" .checked=${this._selectedTargets.includes(item.reference)} ?disabled=${this._busy||(!this._selectedTargets.includes(item.reference)&&this._selectedTargets.length>=8)} @change=${(event:Event)=>{this._clearCards();this._selectedTargets=(event.target as HTMLInputElement).checked?[...this._selectedTargets,item.reference]:this._selectedTargets.filter(id=>id!==item.reference);}}>${item.name} (${item.reference})</label>`)}</div>
        ${targets.length>100?html`<p>Showing the first 100 matching targets. Refine your search.</p>`:nothing}
      </section>`:nothing}
      <ol class="transcript" aria-label="Assistant conversation">${this._turns.map(turn=>html`<li><strong>${INTENTS[turn.intent]}</strong><p class="turn-text">You: ${turn.prompt}</p><p class="turn-text">${turn.text}</p>${turn.trace?html`<ol aria-label="Observation trace">${turn.trace.map(item=>html`<li>${item}</li>`)}</ol>`:nothing}</li>`)}</ol>
      ${this._proposal?html`<section aria-label="Action confirmation"><h2>Review before confirming</h2><dl><dt>Action</dt><dd>${ACTION_LABELS[this._proposal.tool_id]}</dd><dt>Exact entity</dt><dd>${this._proposal.entity_id}</dd><dt>Current state</dt><dd>${this._proposal.state}</dd><dt>Arguments</dt><dd>${JSON.stringify(this._proposal.arguments)}</dd><dt>Risk</dt><dd>${this._proposal.risk}</dd></dl><p>Expires in five minutes. Changed state or permissions require a new proposal.</p><button ?disabled=${this._busy} @click=${()=>{void this._confirm();}}>Confirm this action</button><button @click=${()=>this._clearCards()}>Cancel proposal</button></section>`:nothing}
      ${this._draft?html`<section aria-label="Unsaved workflow draft"><h2>Review disabled draft</h2><pre>${JSON.stringify(this._draft,null,2)}</pre><button ?disabled=${this._busy} @click=${()=>{if(this._draft&&this._online())this.dispatchEvent(new CustomEvent("assistant-workflow-review",{bubbles:true,composed:true,detail:{json:JSON.stringify(this._draft)}}));}}>Review in workflow editor</button></section>`:nothing}
      </div><footer>
      <label>Your message<textarea maxlength="4000" .value=${this._prompt} ?disabled=${this._busy} @input=${(event:Event)=>{this._clearCards();this._prompt=(event.target as HTMLTextAreaElement).value;}} @keydown=${(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();void this._send();}}}></textarea></label>
      <div class="footer-controls"><button ?disabled=${this._busy||!this._provider||!this._prompt.trim()||(this._intent==="draft"&&!this._validDraft())} @click=${()=>{void this._send();}}>Send request</button>
      <button ?disabled=${this._busy} @click=${()=>{this._epoch++;this._clearCards();this._chatContext=[];this._turns=[];this._prompt="";this._message="";this._source=undefined;this._sourceId="";this._selectedEntities=[];this._selectedTargets=[];this._entityQuery="";this._targetQuery="";this._intent="chat";}}>New conversation</button>
      <button ?disabled=${this._busy} @click=${this._ready}>Reload assistant</button></div>
      <p role="status" aria-live="polite">${this._busy?"Working…":this._message}</p></footer>`;
  }
}
if(!customElements.get("ai-orchestrator-assistant"))customElements.define("ai-orchestrator-assistant",AssistantView);
