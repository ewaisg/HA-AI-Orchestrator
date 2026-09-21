import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import type { HomeAssistantLike } from "../ha/hass-contract";
import { fetchCatalog, type CatalogEntity } from "../api/catalog-client";
import { fetchChatOptions, type ChatProvider } from "../api/chat-client";
import { fetchNotifyTargets, type NotifyTarget } from "../api/notify-client";
import { fetchWorkflowDraftSource, generateWorkflowDraft, type WorkflowDraftSource } from "../api/workflow-draft-client";
import { fetchWorkflows, type StoredWorkflow } from "../api/workflow-client";

const DRAFT_FAILURES: Readonly<Record<string, string>> = {
  draft_invalid_result: "The provider returned an unsupported or oversized result. Try a shorter draft request.",
  draft_invalid_json: "The provider did not return valid JSON. Ask for a simpler workflow or use the visual builder.",
  draft_invalid_fields: "The draft has missing or unsupported top-level fields. Retry with a simpler request or use the visual builder.",
  draft_invalid_schema: "The draft contains an invalid trigger, condition or step. Simplify the workflow or use the visual builder.",
  draft_invalid_references: "The draft refers to entities or notification targets outside your selection. Check your selections and retry.",
  draft_invalid_notify_order: "The draft tries to notify before composing a message. Ask it to compose the message before notification.",
  draft_provider_failed: "The local provider could not complete the request. Check its model and status, then simplify the request or use the visual builder.",
  draft_timeout: "The local provider took too long to create a draft. Try a shorter request or use the visual builder.",
  draft_provider_unavailable: "The selected local provider is unavailable or changed. Reload draft options and select an available provider.",
  draft_invalid_selection: "A selected entity or notification target is unavailable. Reload draft options and check your selections.",
  draft_invalid_response: "The local provider did not produce a valid workflow draft. Simplify the request or use the visual builder.",
  draft_source_changed: "The source workflow changed or its references are not selected. Reload draft options, reselect the source and review its targets.",
  draft_source_unavailable: "The source workflow is unavailable or the draft size limit was exceeded. Choose a smaller source or request, or use the visual builder.",
  draft_busy: "Another draft is still running. Wait for it to finish before trying again.",
  draft_cancelled: "Draft generation was cancelled. Reload draft options and submit again when ready.",
  unauthorized: "Administrator access is required. Reconnect with an administrator account.",
  not_loaded: "AI Orchestrator is not loaded. Check the integration, then reload draft options.",
};

function draftFailure(error: unknown, fallback: string): string {
  let code: unknown;
  try {
    if (typeof error === "object" && error !== null && !Array.isArray(error)) {
      // Read an own data property only; never invoke an error getter or display
      // backend messages, model text, stack traces or unknown codes.
      code = Object.getOwnPropertyDescriptor(error, "code")?.value;
    }
  } catch { return fallback; }
  return typeof code === "string" && code.length <= 64 && Object.hasOwn(DRAFT_FAILURES, code)
    ? DRAFT_FAILURES[code]!
    : fallback;
}

export class WorkflowDraftView extends LitElement {
  static override properties = { hass: {attribute: false}, _providers: {state: true}, _entities: {state: true},
    _targets: {state: true}, _provider: {state: true}, _entity: {state: true}, _selected: {state: true},
    _prompt: {state: true}, _busy: {state: true}, _message: {state: true}, _draft: {state: true},
    _sources: {state: true}, _sourceId: {state: true}, _source: {state: true} };
  static override styles = css`
    :host { display:block; margin-bottom:24px; color:var(--primary-text-color,#233642); }
    section { border:1px solid var(--divider-color,#ccd); border-radius:12px; padding:20px; }
    h2 { margin-top:0; } p { line-height:1.6; }
    label { display:block; margin:12px 0; overflow-wrap:anywhere; }
    input,select,textarea,button { box-sizing:border-box; font:inherit; color:inherit; }
    select,input[list],textarea { width:100%; background:var(--card-background-color,white); min-height:44px; }
    textarea { min-height:90px; } button { min-height:44px; margin:8px 8px 0 0; }
    .targets { max-height:240px; overflow:auto; } pre { white-space:pre-wrap; overflow-wrap:anywhere; }
  `;
  declare hass?: HomeAssistantLike;
  private declare _providers: ChatProvider[];
  private declare _entities: CatalogEntity[];
  private declare _targets: NotifyTarget[];
  private declare _provider: string;
  private declare _entity: string;
  private declare _selected: string[];
  private declare _prompt: string;
  private declare _busy: boolean;
  private declare _message: string;
  private declare _draft?: StoredWorkflow;
  private declare _sources: StoredWorkflow[];
  private declare _sourceId: string;
  private declare _source?: WorkflowDraftSource;
  private _sequence = 0;
  private _socket?: HomeAssistantLike["connection"];
  private _user?: string;
  private _call?: HomeAssistantLike["callWS"];
  constructor() {
    super(); this._providers=[]; this._entities=[]; this._targets=[]; this._provider="";
    this._entity=""; this._selected=[]; this._prompt=""; this._busy=false; this._message=""; this._sources=[]; this._sourceId="";
  }
  private readonly _reset = (): void => {
    this._sequence++; this._providers=[]; this._entities=[]; this._targets=[]; this._provider="";
    this._entity=""; this._selected=[]; this._prompt=""; this._busy=false; this._message=""; this._draft=undefined;
    this._sources=[]; this._sourceId=""; this._source=undefined;
  };
  private readonly _ready = (): void => { void this._load(); };
  override disconnectedCallback(): void {
    this._socket?.removeEventListener("disconnected",this._reset);
    this._socket?.removeEventListener("ready",this._ready);
    this._reset(); this._call=undefined; super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("hass") && (this._socket!==this.hass?.connection || this._user!==this.hass?.user?.id || this._call!==this.hass?.callWS)) {
      this._socket?.removeEventListener("disconnected",this._reset);
      this._socket?.removeEventListener("ready",this._ready);
      this._reset(); this._socket=this.hass?.connection; this._user=this.hass?.user?.id; this._call=this.hass?.callWS;
      this._socket?.addEventListener("disconnected",this._reset);
      this._socket?.addEventListener("ready",this._ready); queueMicrotask(this._ready);
    }
  }
  private async _load(): Promise<void> {
    if (!this.hass || this.hass.connection?.connected===false) return;
    this._reset(); const sequence=++this._sequence; this._busy=true;
    try {
      const [options,catalog,targets,workflows]=await Promise.all([fetchChatOptions(this.hass),fetchCatalog(this.hass),fetchNotifyTargets(this.hass),fetchWorkflows(this.hass)]);
      if (sequence!==this._sequence || !this.isConnected) return;
      this._providers=options.providers; this._provider=options.providers[0]?.connection_id??"";
      this._entities=catalog.entities.filter(entity=>!entity.disabled); this._targets=targets;
      this._sources=workflows.store==="ready"?workflows.workflows.map(item=>item.workflow):[];
    } catch { if(sequence===this._sequence) this._message="Draft setup could not load. Check administrator access and reload."; }
    finally { if(sequence===this._sequence) this._busy=false; }
  }
  private async _generate(): Promise<void> {
    if (!this.hass || this._busy || !this._valid()) return;
    const sequence=++this._sequence; this._busy=true; this._draft=undefined; this._message="";
    try {
      const draft=await generateWorkflowDraft(this.hass,this._provider,this._prompt,this._entityIds(),this._selected,this._source);
      if(sequence!==this._sequence || !this.isConnected) return;
      this._draft=draft; this._message=this._source?"Refined copy ready. The source workflow is unchanged. Review the new draft, save disabled, then dry run before enabling.":"Draft ready. Review it, save disabled, then dry run before enabling.";
    } catch (error) {
      if(sequence===this._sequence) this._message=`${draftFailure(error, "The draft request failed. Check your Home Assistant and local provider connections, then retry or use the visual builder.")} Nothing was saved or enabled.`;
    }
    finally { if(sequence===this._sequence) this._busy=false; }
  }
  private _valid(): boolean {
    return !!this._provider && !!this._prompt.trim() && (!this._sourceId || !!this._source) && this._entityIds().length<=8 &&
      this._entityIds().every(id=>this._entities.some(entity=>entity.entity_id===id)) && this._selected.length<=8 &&
      this._selected.every(id=>this._targets.some(target=>target.reference===id)) &&
      (this._source?.notify_targets.every(id=>this._selected.includes(id))??true);
  }
  private _entityIds(): string[] { return [...new Set([...(this._source?.entity_ids??[]),...(this._entity?[this._entity]:[])])]; }
  private async _chooseSource(id:string):Promise<void> {
    if(!this.hass || this._busy || this.hass.connection?.connected===false) return;
    const sequence=++this._sequence;this._draft=undefined;this._source=undefined;this._sourceId=id;this._entity="";this._selected=[];this._prompt="";this._message="";
    if(!id)return;
    if(!this._sources.some(source=>source.workflow_id===id))return;
    this._busy=true;
    try {
      const source=await fetchWorkflowDraftSource(this.hass,id);
      if(sequence!==this._sequence || !this.isConnected)return;
      this._source=source;this._selected=[...source.notify_targets];
    } catch (error) {if(sequence===this._sequence)this._message=draftFailure(error,"This source cannot be refined. Reload workflows or choose another source.");}
    finally {if(sequence===this._sequence)this._busy=false;}
  }
  protected override render() {
    return html`<section aria-label="Create a workflow with AI" aria-busy=${this._busy}>
      <h2>Create a workflow with AI</h2>
      <p>${this._source?"Refine the selected workflow into a new draft using the source content disclosed below.":"Describe a notification workflow or one deterministic light on/off workflow. The local model receives your request and only the entity and notification identifiers you select below."} No current state is sent. Generated drafts never save or enable themselves.</p>
      <p>For light control, select the exact light entity. Its draft contains one light operation with no AI or notification steps at runtime. Save disabled, review separate unattended permission for the exact workflow, dry run without a provider, then enable separately.</p>
      <label>Starting point<select .value=${this._sourceId} ?disabled=${this._busy} @change=${(event:Event)=>void this._chooseSource((event.target as HTMLSelectElement).value)}><option value="">Create a new workflow</option>${this._sources.map(source=>html`<option value=${source.workflow_id}>Refine a copy of ${source.name}</option>`)}</select></label>
      ${this._source?html`<p>Refine a new copy of <strong>${this._source.workflow.name}</strong>. Its name, description, triggers, conditions, prompts, steps and selected references will be sent to the local provider with your instructions. The existing workflow remains unchanged.</p>
        <details><summary>Review source sent to local AI</summary><pre>${JSON.stringify({name:this._source.workflow.name,description:this._source.workflow.description,triggers:this._source.workflow.triggers,conditions:this._source.workflow.conditions,steps:this._source.workflow.steps},null,2)}</pre></details>
        <p>Source entity references: ${this._source.entity_ids.length?this._source.entity_ids.join(", "):"None"}</p>
        <p>Source notification references: ${this._source.notify_targets.length?this._source.notify_targets.join(", "):"None"}</p>
        <p>Keep all source references selected for refinement. Unavailable references must be repaired in the source before generating a copy.</p>`:nothing}
      <label>Draft provider<select .value=${this._provider} ?disabled=${this._busy} @change=${(event: Event)=>{this._provider=(event.target as HTMLSelectElement).value; this._draft=undefined;}}>${this._providers.map(provider=>html`<option value=${provider.connection_id}>${provider.title}</option>`)}</select></label>
      <label>${this._source?"Additional entity the copy may use (optional)":"Entity the draft may use (optional)"}<input list="draft-entities" .value=${this._entity} ?disabled=${this._busy} @input=${(event: Event)=>{this._entity=(event.target as HTMLInputElement).value; this._draft=undefined;}}></label>
      <datalist id="draft-entities">${this._entities.map(entity=>html`<option value=${entity.entity_id}>${entity.name??entity.entity_id}</option>`)}</datalist>
      <fieldset ?disabled=${this._busy}><legend>Notification targets the draft may use (up to 8)</legend><div class="targets">${this._targets.map(target=>html`<label><input type="checkbox" .checked=${this._selected.includes(target.reference)} ?disabled=${!this._selected.includes(target.reference)&&this._selected.length>=8} @change=${(event: Event)=>{this._selected=(event.target as HTMLInputElement).checked?[...this._selected,target.reference]:this._selected.filter(item=>item!==target.reference);this._draft=undefined;}}>${target.name} (${target.kind})</label>`)}</div></fieldset>
      <label>${this._source?"What should change in the copy?":"What should happen?"}<textarea maxlength="4000" .value=${this._prompt} ?disabled=${this._busy} @input=${(event: Event)=>{this._prompt=(event.target as HTMLTextAreaElement).value;this._draft=undefined;}}></textarea></label>
      <button ?disabled=${this._busy||!this._valid()} @click=${()=>void this._generate()}>${this._source?"Generate refined copy":"Generate draft"}</button>
      <button ?disabled=${this._busy} @click=${this._ready}>Reload draft options</button>
      <p role="status">${this._message}</p>
      ${this._draft?html`<h3>${this._draft.name}</h3><p>${this._draft.description}</p><details><summary>Review generated workflow</summary><pre>${JSON.stringify(this._draft,null,2)}</pre></details>
        <button @click=${()=>this.dispatchEvent(new CustomEvent("generated-workflow",{bubbles:true,composed:true,detail:{json:JSON.stringify(this._draft,null,2)}}))}>Review in workflow editor</button>`:nothing}
    </section>`;
  }
}
customElements.define("ai-orchestrator-workflow-draft",WorkflowDraftView);
