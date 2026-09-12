import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { saveWorkflow } from "../api/workflow-client";
import { PREVIEW_INPUT_LIMIT, PREVIEW_REASONS, previewWorkflow, type WorkflowPreview } from "../api/workflow-preview-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

export const WORKFLOW_PREVIEW_TAG = "ai-orchestrator-workflow-preview";
const EXAMPLE = {
  schema_version: 1, workflow_id: "12345678-1234-4123-8123-123456789abc",
  name: "Synthetic evening window preview", enabled: false,
  triggers: [{ kind: "state", entity_ids: ["binary_sensor.synthetic_window"], to_state: "on" }],
  conditions: [{ kind: "time_window", after_time: "18:00", before_time: "06:00" }, { kind: "state", entity_id: "binary_sensor.synthetic_window", state: "on" }],
  steps: [{ step_id: "compose", kind: "ai_compose", prompt: "Write a short window reminder." }, { step_id: "notify", kind: "notify", notify_service: "notify.synthetic" }],
};
const KIND_LABELS = { ai_compose: "Compose text", ai_classify: "Classify text", notify: "Notification" };

export class WorkflowPreviewView extends LitElement {
  public static override properties = { hass: { attribute: false }, draft: { attribute: false }, _workflow: { state: true }, _snapshot: { state: true }, _busy: { state: true }, _error: { state: true }, _result: { state: true }, _saved: { state: true } };
  public static override styles = css`
    :host { display:block; min-width:0; color:var(--primary-text-color,#233642); margin-bottom:32px; }
    * { box-sizing:border-box; } h1 { font-size:26px; margin:0 0 10px; } h2 { font-size:20px; }
    p { line-height:1.6; } .editors { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr)); gap:16px; }
    label { display:block; font-weight:600; margin-bottom:6px; } textarea { width:100%; min-width:0; height:300px; resize:vertical; padding:12px; font:13px/1.5 monospace; color:inherit; background:var(--card-background-color,#fff); border:1px solid #7d969c; border-radius:8px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin:16px 0; } button { cursor:pointer; min-height:44px; padding:10px 14px; font:inherit; border:1px solid #7d969c; border-radius:8px; background:var(--card-background-color,#fff); color:inherit; }
    .primary { background:#175e56; color:#fff; } button:disabled { opacity:.55; cursor:default; }
    button:focus-visible,textarea:focus-visible { outline:3px solid #207e73; outline-offset:3px; }
    .result { border:1px solid var(--divider-color,#ccd9da); border-radius:12px; padding:16px; overflow-wrap:anywhere; }
    .error { color:var(--error-color,#852e23); } li { margin:8px 0; } @media(max-width:700px) { .editors { grid-template-columns:minmax(0,1fr); } textarea { height:220px; } }
  `;
  public declare hass?: HomeAssistantLike;
  /** A stored document handed back by the workflows list; each load carries a distinct sequence. */
  public declare draft?: { json: string; sequence: number };
  private declare _workflow: string;
  private declare _saved: boolean;
  private declare _snapshot: string;
  private declare _busy: boolean;
  private declare _error: string;
  private declare _result?: WorkflowPreview;
  private _sequence = 0;
  private _connection?: HomeAssistantLike["connection"];
  private _userId?: string;
  private _callWS?: HomeAssistantLike["callWS"];
  public constructor() { super(); this._workflow = ""; this._snapshot = ""; this._busy = false; this._error = ""; this._saved = false; }
  private readonly _reset = (): void => { this._invalidate(); this._workflow = ""; this._snapshot = ""; };
  private _invalidate(): void { this._sequence++; this._busy = false; this._error = ""; this._result = undefined; this._saved = false; }
  private _unbind(): void { this._connection?.removeEventListener("disconnected", this._reset); }
  public override connectedCallback(): void { super.connectedCallback(); this._connection?.addEventListener("disconnected", this._reset); }
  public override disconnectedCallback(): void { this._unbind(); this._reset(); super.disconnectedCallback(); }
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("draft") && this.draft !== undefined) { this._invalidate(); this._workflow = this.draft.json; }
    if (!changed.has("hass")) return;
    if (this._connection !== this.hass?.connection || this._userId !== this.hass?.user?.id || this._callWS !== this.hass?.callWS) {
      this._unbind(); this._reset(); this._connection = this.hass?.connection; this._userId = this.hass?.user?.id; this._callWS = this.hass?.callWS;
      this._connection?.addEventListener("disconnected", this._reset);
    }
  }
  private _example(daytime: boolean): void {
    this._invalidate(); this._workflow = JSON.stringify(EXAMPLE, null, 2);
    this._snapshot = JSON.stringify({ states: { "binary_sensor.synthetic_window": "on" }, time: daytime ? "12:00" : "20:00", event: { kind: "state", entity_id: "binary_sensor.synthetic_window", from_state: "off", to_state: "on" } }, null, 2);
  }
  private _edit(event: Event, workflow: boolean): void {
    this._invalidate(); const value = (event.target as HTMLTextAreaElement).value;
    if (workflow) this._workflow = value; else this._snapshot = value;
  }
  private readonly _preview = async (): Promise<void> => {
    const hass = this.hass;
    if (this._busy || !hass || hass.connection?.connected === false || !this._workflow.trim() || !this._snapshot.trim()) return;
    this._invalidate(); this._busy = true; const sequence = this._sequence;
    const current = (): boolean => sequence === this._sequence && this.isConnected && this.hass?.callWS === hass.callWS && this.hass?.connection === hass.connection && this.hass?.user?.id === hass.user?.id;
    try { const result = await previewWorkflow(hass, this._workflow, this._snapshot); if (current()) this._result = result; }
    catch { if (current()) this._error = "Preview could not be completed. Check both JSON documents, administrator access, and the installed integration version."; }
    finally { if (current()) this._busy = false; }
  };
  private readonly _save = async (): Promise<void> => {
    const hass = this.hass;
    if (this._busy || !hass || hass.connection?.connected === false || !this._workflow.trim()) return;
    this._invalidate(); this._busy = true; const sequence = this._sequence;
    const current = (): boolean => sequence === this._sequence && this.isConnected && this.hass?.callWS === hass.callWS && this.hass?.connection === hass.connection && this.hass?.user?.id === hass.user?.id;
    try {
      const saved = await saveWorkflow(hass, this._workflow);
      if (!current()) return;
      this._workflow = JSON.stringify(saved.workflow, null, 2); this._saved = true;
      this.dispatchEvent(new CustomEvent("workflow-saved", { bubbles: true, composed: true }));
    } catch { if (current()) this._error = "The workflow could not be saved. Check the workflow JSON, administrator access, and the installed integration version."; }
    finally { if (current()) this._busy = false; }
  };
  protected override render(): TemplateResult {
    return html`<section aria-labelledby="preview-title">
      <h1 id="preview-title">Workflow preview</h1>
      <p>Experimental offline JSON editor. Test a draft against a supplied snapshot: previewing reads no live home state, contacts no provider, and executes no action. "Save as workflow" stores the workflow document in Home Assistant; an enabled saved workflow then watches its triggers and records outcomes without running any step.</p>
      <p>Start with a synthetic window example, then edit the workflow or snapshot. The example identifiers are fictional.</p>
      <div class="actions"><button type="button" @click=${() => this._example(false)}>Load synthetic evening example</button><button type="button" @click=${() => this._example(true)}>Load synthetic daytime example</button></div>
      <div class="editors"><div><label for="workflow">Workflow JSON</label><textarea id="workflow" spellcheck="false" maxlength=${PREVIEW_INPUT_LIMIT} .value=${this._workflow} @input=${(event: Event) => this._edit(event, true)}></textarea></div>
      <div><label for="snapshot">Snapshot JSON</label><textarea id="snapshot" spellcheck="false" maxlength=${PREVIEW_INPUT_LIMIT} .value=${this._snapshot} @input=${(event: Event) => this._edit(event, false)}></textarea></div></div>
      <div class="actions"><button class="primary" type="button" ?disabled=${this._busy || !this.hass || this.hass.connection?.connected === false || !this._workflow.trim() || !this._snapshot.trim()} @click=${this._preview}>${this._busy ? "Previewing…" : "Preview workflow"}</button><button type="button" ?disabled=${this._busy || !this.hass || this.hass.connection?.connected === false || !this._workflow.trim()} @click=${this._save}>${this._busy ? "Working…" : "Save as workflow"}</button><button type="button" @click=${this._reset}>Reset preview</button></div>
      <div role="status" aria-live="polite">${this._error ? html`<p class="error">${this._error}</p>` : nothing}${this._saved ? html`<p>Workflow saved. It appears in the stored workflows list below.</p>` : nothing}${this._busy ? html`<p>Evaluating the supplied snapshot…</p>` : nothing}${this._result ? this._renderResult(this._result) : nothing}</div>
    </section>`;
  }
  private _renderResult(result: WorkflowPreview): TemplateResult {
    return html`<div class="result"><h2>${result.eligible ? "Scenario passes — steps planned" : "Scenario blocked — no steps planned"}</h2>
      <p>Draft enabled flag: ${result.enabled ? "yes" : "no"}. Preview never activates a workflow.</p>
      <h3>Triggers (any must pass)</h3><ul>${result.trigger_results.map((check) => html`<li>Trigger ${check.index + 1}: ${check.passed ? "Pass" : "Fail"} — ${PREVIEW_REASONS[check.reason]}</li>`)}</ul>
      <h3>Conditions (all must pass)</h3>${result.condition_results.length ? html`<ul>${result.condition_results.map((check) => html`<li>Condition ${check.index + 1}: ${check.passed ? "Pass" : "Fail"} — ${PREVIEW_REASONS[check.reason]}</li>`)}</ul>` : html`<p>No conditions.</p>`}
      <h3>Planned steps</h3>${result.planned_steps.length ? html`<ol>${result.planned_steps.map((step) => html`<li>${KIND_LABELS[step.kind]} — not executed</li>`)}</ol>` : html`<p>No steps planned.</p>`}
      <p>Provider calls: 0 · Actions executed: 0</p></div>`;
  }
}
customElements.define(WORKFLOW_PREVIEW_TAG, WorkflowPreviewView);
