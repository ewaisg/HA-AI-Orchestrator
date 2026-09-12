import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { fetchChatOptions, type ChatProvider } from "../api/chat-client";
import { saveWorkflow } from "../api/workflow-client";
import { DRY_RUN_ERRORS, dryRunWorkflow, type DryRunResult, type DryRunStep } from "../api/workflow-dry-run-client";
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
const DRY_RUN_MESSAGES: Record<string, string> = {
  workflow_not_found: "Save the workflow first; a dry run uses the stored version.",
  dry_run_provider_unavailable: "Select an available local provider.",
  dry_run_busy: "A dry run is already running. Try again shortly.",
  invalid_snapshot: "Check the snapshot JSON.",
  workflow_store_unavailable: "Workflow storage is unavailable.",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export class WorkflowPreviewView extends LitElement {
  public static override properties = { hass: { attribute: false }, draft: { attribute: false }, _workflow: { state: true }, _snapshot: { state: true }, _busy: { state: true }, _error: { state: true }, _result: { state: true }, _saved: { state: true }, _providers: { state: true }, _connectionId: { state: true }, _dryRun: { state: true } };
  public static override styles = css`
    :host { display:block; min-width:0; color:var(--primary-text-color,#233642); margin-bottom:32px; }
    * { box-sizing:border-box; } h1 { font-size:26px; margin:0 0 10px; } h2 { font-size:20px; }
    p { line-height:1.6; } .editors { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr)); gap:16px; }
    label { display:block; font-weight:600; margin-bottom:6px; } textarea { width:100%; min-width:0; height:300px; resize:vertical; padding:12px; font:13px/1.5 monospace; color:inherit; background:var(--card-background-color,#fff); border:1px solid #7d969c; border-radius:8px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin:16px 0; } button { cursor:pointer; min-height:44px; padding:10px 14px; font:inherit; border:1px solid #7d969c; border-radius:8px; background:var(--card-background-color,#fff); color:inherit; }
    .primary { background:#175e56; color:#fff; } button:disabled { opacity:.55; cursor:default; }
    button:focus-visible,textarea:focus-visible { outline:3px solid #207e73; outline-offset:3px; }
    .result { border:1px solid var(--divider-color,#ccd9da); border-radius:12px; padding:16px; overflow-wrap:anywhere; }
    .error { color:var(--error-color,#852e23); } li { margin:8px 0; } select { min-height:44px; padding:8px 12px; font:inherit; border:1px solid #7d969c; border-radius:8px; background:var(--card-background-color,#fff); color:inherit; max-width:100%; } .composed { white-space:pre-wrap; border-left:3px solid #175e56; padding-left:12px; } @media(max-width:700px) { .editors { grid-template-columns:minmax(0,1fr); } textarea { height:220px; } }
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
  private declare _providers: ChatProvider[];
  private declare _connectionId: string;
  private declare _dryRun?: DryRunResult;
  private _sequence = 0;
  private _connection?: HomeAssistantLike["connection"];
  private _userId?: string;
  private _callWS?: HomeAssistantLike["callWS"];
  public constructor() { super(); this._workflow = ""; this._snapshot = ""; this._busy = false; this._error = ""; this._saved = false; this._providers = []; this._connectionId = ""; }
  private readonly _reset = (): void => { this._invalidate(); this._workflow = ""; this._snapshot = ""; };
  private _invalidate(): void { this._sequence++; this._busy = false; this._error = ""; this._result = undefined; this._saved = false; this._dryRun = undefined; }
  private _unbind(): void { this._connection?.removeEventListener("disconnected", this._reset); }
  public override connectedCallback(): void { super.connectedCallback(); this._connection?.addEventListener("disconnected", this._reset); }
  public override disconnectedCallback(): void { this._unbind(); this._reset(); super.disconnectedCallback(); }
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("draft") && this.draft !== undefined) { this._invalidate(); this._workflow = this.draft.json; }
    if (!changed.has("hass")) return;
    if (this._connection !== this.hass?.connection || this._userId !== this.hass?.user?.id || this._callWS !== this.hass?.callWS) {
      this._unbind(); this._reset(); this._connection = this.hass?.connection; this._userId = this.hass?.user?.id; this._callWS = this.hass?.callWS;
      this._connection?.addEventListener("disconnected", this._reset);
      this._providers = []; this._connectionId = "";
      void this._loadProviders();
    }
  }
  /** Local providers eligible for an explicit trial; a failed lookup simply disables the dry run. */
  private async _loadProviders(): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    const sequence = this._sequence;
    try {
      const options = await fetchChatOptions(hass);
      if (sequence !== this._sequence || !this.isConnected || this.hass?.callWS !== hass.callWS) return;
      this._providers = options.providers;
      this._connectionId = options.providers[0]?.connection_id ?? "";
    } catch { /* no providers available for a dry run */ }
  }
  private _storedWorkflowId(): string | undefined {
    try { const id = (JSON.parse(this._workflow) as { workflow_id?: unknown }).workflow_id; return typeof id === "string" && UUID.test(id) ? id : undefined; } catch { return undefined; }
  }
  private _canDryRun(): boolean {
    return !this._busy && !!this.hass && this.hass.connection?.connected !== false && !!this._snapshot.trim() && this._storedWorkflowId() !== undefined && this._providers.some((p) => p.connection_id === this._connectionId);
  }
  private readonly _runDry = async (): Promise<void> => {
    const hass = this.hass; const workflowId = this._storedWorkflowId(); const connectionId = this._connectionId;
    if (!this._canDryRun() || !hass || workflowId === undefined) return;
    this._invalidate(); this._busy = true; const sequence = this._sequence;
    const current = (): boolean => sequence === this._sequence && this.isConnected && this.hass?.callWS === hass.callWS && this.hass?.connection === hass.connection && this.hass?.user?.id === hass.user?.id;
    try { const result = await dryRunWorkflow(hass, workflowId, connectionId, this._snapshot); if (current()) this._dryRun = result; }
    catch (error: unknown) {
      if (!current()) return;
      const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
      this._error = DRY_RUN_MESSAGES[code] ?? "The dry run could not be completed. Check the snapshot JSON, the selected provider, administrator access, and the installed integration version.";
    }
    finally { if (current()) this._busy = false; }
  };
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
      <div class="actions">
        <label for="dry-run-provider">Local provider for a dry run</label>
        <select id="dry-run-provider" ?disabled=${this._busy || this._providers.length === 0} .value=${this._connectionId} @change=${(event: Event) => { this._invalidate(); this._connectionId = (event.target as HTMLSelectElement).value; }}>
          ${this._providers.length === 0 ? html`<option value="">No local provider available</option>` : this._providers.map((provider) => html`<option value=${provider.connection_id} ?selected=${provider.connection_id === this._connectionId}>${provider.title}</option>`)}
        </select>
        <button id="dry-run" type="button" ?disabled=${!this._canDryRun()} @click=${this._runDry}>${this._busy ? "Working…" : "Dry run AI steps"}</button>
      </div>
      <p>A dry run evaluates the <em>stored</em> workflow against the snapshot above, then runs its AI steps once against the selected local provider. The model sees only the step prompt, the event, the time, and the states of entities named by the workflow's conditions. Notifications are only planned; nothing is sent, stored, or executed.</p>
      <div role="status" aria-live="polite">${this._error ? html`<p class="error">${this._error}</p>` : nothing}${this._saved ? html`<p>Workflow saved. It appears in the stored workflows list below.</p>` : nothing}${this._busy ? html`<p>Working…</p>` : nothing}${this._result ? this._renderResult(this._result) : nothing}${this._dryRun ? this._renderDryRun(this._dryRun) : nothing}</div>
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
  private _renderDryRun(result: DryRunResult): TemplateResult {
    const heading = !result.eligible ? "Dry run: scenario blocked — no AI step ran" : result.completed ? "Dry run completed — nothing was sent" : "Dry run stopped at a failed step";
    return html`<div class="result"><h2>${heading}</h2>
      <h3>Triggers (any must pass)</h3><ul>${result.trigger_results.map((check) => html`<li>Trigger ${check.index + 1}: ${check.passed ? "Pass" : "Fail"} — ${PREVIEW_REASONS[check.reason]}</li>`)}</ul>
      <h3>Conditions (all must pass)</h3>${result.condition_results.length ? html`<ul>${result.condition_results.map((check) => html`<li>Condition ${check.index + 1}: ${check.passed ? "Pass" : "Fail"} — ${PREVIEW_REASONS[check.reason]}</li>`)}</ul>` : html`<p>No conditions.</p>`}
      <h3>Steps</h3>${result.steps.length ? html`<ol>${result.steps.map((step) => this._renderDryRunStep(step))}</ol>` : html`<p>No steps ran.</p>`}
      <p>Provider calls: ${result.provider_calls} · Actions executed: 0 · Destination: local</p></div>`;
  }
  private _renderDryRunStep(step: DryRunStep): TemplateResult {
    const label = KIND_LABELS[step.kind];
    if (step.status === "ok" && step.text !== undefined) return html`<li>${label} — composed:<div class="composed">${step.text}</div></li>`;
    if (step.status === "ok") return html`<li>${label} — category: ${step.category}</li>`;
    if (step.status === "planned") return html`<li>${label} — planned, not sent${step.message_step_id ? ` (would use text from step ${step.message_step_id})` : ""}</li>`;
    if (step.status === "failed") return html`<li>${label} — failed: ${DRY_RUN_ERRORS[step.error as keyof typeof DRY_RUN_ERRORS] ?? "Provider error"}</li>`;
    return html`<li>${label} — skipped</li>`;
  }
}
customElements.define(WORKFLOW_PREVIEW_TAG, WorkflowPreviewView);
