import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { fetchWorkflows, type WorkflowEntry, type StoreState } from "../api/workflow-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

export class ActivityView extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _entries: { state: true },
    _state: { state: true },
    _store: { state: true },
  };
  static override styles = css`
    :host { display: block; color: var(--primary-text-color, #233642); }
    * { box-sizing: border-box; }
    h1 { font-size: 1.6rem; } h2 { font-size: 1.1rem; }
    p, li { line-height: 1.6; }
    .cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
    article { border: 1px solid var(--divider-color, #ccd9da); border-radius: 12px; padding: 16px; background: var(--card-background-color, white); overflow-wrap: anywhere; min-width: 0; }
    button { font: inherit; color: inherit; background: var(--card-background-color, white); border: 1px solid var(--divider-color, #ccd9da); border-radius: 8px; min-height: 44px; padding: 8px 16px; cursor: pointer; }
    button:focus-visible { outline: 3px solid var(--primary-color, #007a78); }
    button:disabled { opacity: .6; cursor: default; }
  `;
  declare hass?: HomeAssistantLike;
  private declare _entries: WorkflowEntry[];
  private declare _state: "waiting" | "loading" | "ready" | "error";
  private declare _store: StoreState;
  private _sequence = 0;
  private _connection?: HomeAssistantLike["connection"];
  private _callWS?: HomeAssistantLike["callWS"];
  private _userId?: string;

  constructor() {
    super();
    this._entries = [];
    this._state = "waiting";
    this._store = "not_loaded";
  }

  private readonly _reset = (): void => {
    this._sequence++;
    this._entries = [];
    this._state = "waiting";
    this._store = "not_loaded";
  };
  private readonly _ready = (): void => { void this._load(); };

  override connectedCallback(): void {
    super.connectedCallback();
    this._connection?.addEventListener("disconnected", this._reset);
    this._connection?.addEventListener("ready", this._ready);
    if (this._callWS) queueMicrotask(this._ready);
  }
  override disconnectedCallback(): void {
    this._connection?.removeEventListener("disconnected", this._reset);
    this._connection?.removeEventListener("ready", this._ready);
    this._reset();
    super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("hass") && (this._connection !== this.hass?.connection ||
        this._callWS !== this.hass?.callWS || this._userId !== this.hass?.user?.id)) {
      this._connection?.removeEventListener("disconnected", this._reset);
      this._connection?.removeEventListener("ready", this._ready);
      this._reset();
      this._connection = this.hass?.connection;
      this._callWS = this.hass?.callWS;
      this._userId = this.hass?.user?.id;
      this._connection?.addEventListener("disconnected", this._reset);
      this._connection?.addEventListener("ready", this._ready);
      queueMicrotask(this._ready);
    }
  }
  private async _load(): Promise<void> {
    const hass = this.hass;
    if (!hass || !this.isConnected || hass.connection?.connected === false || this._state === "loading") return;
    const sequence = ++this._sequence;
    this._state = "loading";
    this._entries = [];
    const current = (): boolean => sequence === this._sequence && this.isConnected &&
      this.hass?.callWS === hass.callWS && this.hass?.connection === hass.connection &&
      this.hass?.user?.id === hass.user?.id;
    try {
      const result = await fetchWorkflows(hass);
      if (!current()) return;
      this._entries = result.workflows;
      this._store = result.store;
      this._state = "ready";
    } catch {
      if (!current()) return;
      this._state = "error";
    }
  }
  protected override render() {
    return html`
      <h1>Activity &amp; Security</h1>
      <p>Latest workflow results from Home Assistant. Notification success means Home Assistant accepted the call; check the phone to confirm receipt.</p>
      <p>These counters and last-run records are temporary and may reset when workflows are changed or Home Assistant restarts. Prompts, generated messages, and household state are not displayed here.</p>
      <button @click=${this._ready} ?disabled=${this._state === "loading"}>Refresh activity</button>
      <div role="status" aria-live="polite">
        ${this._state === "waiting" ? html`<p>Waiting for Home Assistant.</p>` : nothing}
        ${this._state === "loading" ? html`<p>Loading activity…</p>` : nothing}
        ${this._state === "error" ? html`<p>Activity could not be loaded. Check your connection and administrator access, then refresh.</p>` : nothing}
        ${this._state === "ready" && this._store !== "ready" ? html`<p>Workflow storage is unavailable. No activity can be verified.</p>` : nothing}
        ${this._state === "ready" && this._store === "ready" && this._entries.length === 0 ? html`<p>No stored workflows yet.</p>` : nothing}
      </div>
      ${this._state === "ready" && this._store === "ready" ? html`<div class="cards">${this._entries.map(({ workflow, status }) => html`
        <article aria-label=${workflow.name}>
          <h2>${workflow.name}</h2>
          <p>${status.active ? "Active" : "Inactive"} · ${workflow.run_mode === "execute" ? "Execute mode" : "Observe only"}${status.execution_running ? " · Running" : ""}</p>
          <p>Runs: ${status.executions} · Failures: ${status.execution_failures} · Skipped while busy: ${status.skipped_busy}</p>
          ${status.error ? html`<p>Workflow needs attention: ${status.error}</p>` : nothing}
          ${status.last_execution ? html`
            <p>Last run: ${status.last_execution.completed ? "Completed" : "Failed"}</p>
            <p>Started: ${status.last_execution.started_at}${status.last_execution.finished_at ? html`<br>Finished: ${status.last_execution.finished_at}` : nothing}</p>
            <p>Provider calls: ${status.last_execution.provider_calls} · Successful notification calls: ${status.last_execution.actions_executed}</p>
            ${status.last_execution.error ? html`<p>Failure code: ${status.last_execution.error}</p>` : nothing}
            <ol aria-label="Execution steps">${status.last_execution.steps.map(step => html`<li>${step.step_id}: ${step.status}${step.target ? html` (${step.target})` : nothing}</li>`)}</ol>
          ` : html`<p>No execution recorded in this runtime.</p>`}
        </article>
      `)}</div>` : nothing}
    `;
  }
}
if (!customElements.get("ai-orchestrator-activity")) customElements.define("ai-orchestrator-activity", ActivityView);
