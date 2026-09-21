import {css,html,LitElement,nothing,type PropertyValues} from "lit";
import {previewWorkflowLight,updateWorkflowLightAuthorization,type WorkflowLightReview} from "../api/workflow-light-client";
import type {StoredWorkflow} from "../api/workflow-client";
import type {HomeAssistantLike} from "../ha/hass-contract";

export class WorkflowLightReviewView extends LitElement {
  static override properties={hass:{attribute:false},workflow:{attribute:false},_review:{state:true},_busy:{state:true},_message:{state:true},_ordinary:{state:true},_unattended:{state:true}};
  static override styles=css`:host{display:block}p,dd,label{overflow-wrap:anywhere;line-height:1.5}label{display:block;margin:8px 0}button,input{min-height:44px;max-width:100%}button{font:inherit;margin:4px 0}dd{margin:0 0 8px}button:focus-visible,input:focus-visible{outline:3px solid var(--primary-color,#007a78)}`;
  declare hass?:HomeAssistantLike;declare workflow?:StoredWorkflow;
  private declare _review?:WorkflowLightReview;private declare _busy:boolean;private declare _message:string;private declare _ordinary:boolean;private declare _unattended:boolean;
  private _epoch=0;private _timer?:ReturnType<typeof setTimeout>;private _socket?:HomeAssistantLike["connection"];private _call?:HomeAssistantLike["callWS"];private _user?:string;
  constructor(){super();this._busy=false;this._message="";this._ordinary=false;this._unattended=false;}
  private readonly _reset=():void=>{this._epoch++;clearTimeout(this._timer);this._review=undefined;this._busy=false;this._ordinary=false;this._unattended=false;this._message="";};
  override disconnectedCallback():void{this._socket?.removeEventListener("disconnected",this._reset);this._reset();super.disconnectedCallback();}
  protected override willUpdate(changed:PropertyValues<this>):void{
    if(changed.has("workflow"))this._reset();
    if(changed.has("hass")&&(this._socket!==this.hass?.connection||this._call!==this.hass?.callWS||this._user!==this.hass?.user?.id)){
      this._socket?.removeEventListener("disconnected",this._reset);this._reset();this._socket=this.hass?.connection;this._call=this.hass?.callWS;this._user=this.hass?.user?.id;this._socket?.addEventListener("disconnected",this._reset);
    }
  }
  private _online():boolean{return !!this.hass&&this.isConnected&&this.hass.connection?.connected!==false;}
  private async _preview():Promise<void>{
    if(this._busy||!this._online()||!this.workflow)return;
    this._reset();const epoch=this._epoch,workflow=this.workflow;this._busy=true;
    try{const review=await previewWorkflowLight(this.hass!,workflow.workflow_id);if(epoch!==this._epoch||!this._online())return;
      const step=workflow.steps[0];if(workflow.steps.length!==1||step?.kind!=="light_control"||step.target_registry_id!==review.target.registry_id||step.operation!==review.operation)throw new Error("Changed workflow target");
      const canonical=(value:StoredWorkflow)=>JSON.stringify(value,(_key,item:unknown)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
      if(canonical(workflow)!==canonical(review.workflow))throw new Error("Saved workflow changed");
      this._review=review;this._timer=setTimeout(()=>{this._reset();this._message="Authorization review expired. Review the current saved workflow again.";},review.expires_in*1000);
    }catch{if(epoch===this._epoch)this._message="Review is unavailable. Reload the saved workflow and check its light target.";}finally{if(epoch===this._epoch)this._busy=false;}
  }
  private async _update(authorize:boolean):Promise<void>{
    if(this._busy||!this._online()||!this._review||(authorize&&(this.workflow?.enabled||!this._ordinary||!this._unattended)))return;
    const review=this._review;this._reset();const epoch=this._epoch;this._busy=true;
    try{await updateWorkflowLightAuthorization(this.hass!,review,authorize);if(epoch!==this._epoch||!this._online())return;this._message=authorize?"Unattended permission saved for this exact workflow. Run its provider-free dry run, then enable separately.":"Unattended light permission revoked. Reload workflow status.";this.dispatchEvent(new CustomEvent("workflow-authorization-changed",{bubbles:true,composed:true}));}
    catch{if(epoch===this._epoch)this._message="Permission change could not be verified. Reload and review current authorization; nothing was enabled.";}
    finally{if(epoch===this._epoch)this._busy=false;}
  }
  protected override render(){return html`<section aria-label="Unattended light authorization"><p>This deterministic light workflow needs separate permission to operate without a confirmation on every trigger. Saving a draft grants nothing.</p><button ?disabled=${this._busy||!this.workflow||!this._online()} @click=${()=>{void this._preview();}}>Review unattended light permission</button>
    ${this._review?html`<dl><dt>Exact light</dt><dd>${this._review.target.entity_id}</dd><dt>Physical device</dt><dd>${this._review.target.device_name}</dd><dt>Operation</dt><dd>${this._review.operation==="turn_on"?"Turn on":"Turn off"}</dd><dt>Current permission</dt><dd>${this._review.authorized?"Authorized":"Not authorized"}</dd></dl><p>Review the saved trigger and conditions above. This permission applies only to the exact saved workflow and current target identity; edits require review again. This review expires in five minutes.</p>
      ${this.workflow?.enabled?html`<p>Disable the workflow before granting or renewing permission.</p>`:html`<label><input type="checkbox" .checked=${this._ordinary} ?disabled=${this._busy} @change=${(event:Event)=>{this._ordinary=(event.target as HTMLInputElement).checked;}}>I verified this target is ordinary lighting, not critical or life-safety equipment.</label><label><input type="checkbox" .checked=${this._unattended} ?disabled=${this._busy} @change=${(event:Event)=>{this._unattended=(event.target as HTMLInputElement).checked;}}>I authorize this exact workflow to perform the displayed light operation unattended when its trigger and conditions pass.</label><button ?disabled=${this._busy||!this._ordinary||!this._unattended} @click=${()=>{void this._update(true);}}>Authorize unattended light operation</button>`}
      <button ?disabled=${this._busy} @click=${()=>{void this._update(false);}}>Revoke unattended light permission</button>`:nothing}<p role="status" aria-live="polite">${this._message}</p></section>`;}
}
if(!customElements.get("ai-orchestrator-workflow-light-review"))customElements.define("ai-orchestrator-workflow-light-review",WorkflowLightReviewView);
