import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";

import {
  deleteWorkflow,
  fetchWorkflows,
  observeWorkflow,
  setWorkflowEnabled,
  type StoreState,
  type WorkflowEntry,
} from "../api/workflow-client";
import type { WorkflowObservation } from "../api/workflow-preview-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

export const WORKFLOWS_VIEW_TAG = "ai-orchestrator-workflows";

type ViewState = "waiting" | "loading" | "ready" | "error";
type Pending = { id: string; action: "enable" | "disable" | "delete" | "observe" };

const STATIC_ERRORS = {
  load: "Stored workflows could not be read from Home Assistant. Check administrator access and the installed integration version.",
  mutate: "The change could not be completed. Nothing was executed; reload to see the current stored state.",
  observe: "The observation could not be completed. Nothing was executed.",
} as const;

export class WorkflowsView extends LitElement {
  public static override properties = {
    hass: { attribute: false },
    refreshToken: { type: Number, attribute: false },
    _viewState: { state: true },
    _store: { state: true },
    _entries: { state: true },
    _pending: { state: true },
    _confirmDeleteId: { state: true },
    _error: { state: true },
    _observation: { state: true },
  };

  public static override styles = css`
    :host {
      display: block;
      min-width: 0;
      color: var(--primary-text-color, #233642);
      margin-bottom: 32px;
    }
    * {
      box-sizing: border-box;
    }
    h2 {
      font-size: 20px;
      margin: 0 0 8px;
    }
    h3 {
      font-size: 1rem;
      margin: 0;
      line-height: 1.3;
    }
    p {
      line-height: 1.6;
    }
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #ccd9da);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .badge {
      display: inline-flex;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      border: 1px solid currentColor;
      white-space: nowrap;
    }
    .badge.active {
      color: var(--success-color, #2e7d32);
    }
    .badge.inactive {
      color: var(--secondary-text-color, #5d6f74);
    }
    .badge.error {
      color: var(--error-color, #852e23);
    }
    .meta {
      margin: 0;
      font-size: 0.85rem;
      color: var(--secondary-text-color, #5d6f74);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    button {
      cursor: pointer;
      min-height: 40px;
      padding: 8px 12px;
      font: inherit;
      border: 1px solid #7d969c;
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: inherit;
    }
    button.danger {
      border-color: var(--error-color, #852e23);
      color: var(--error-color, #852e23);
    }
    button:disabled {
      opacity: 0.55;
      cursor: default;
    }
    button:focus-visible {
      outline: 3px solid #207e73;
      outline-offset: 3px;
    }
    .notice {
      border: 1px solid var(--divider-color, #ccd9da);
      border-radius: 12px;
      padding: 12px 16px;
    }
    .error {
      color: var(--error-color, #852e23);
    }
  `;

  public declare hass?: HomeAssistantLike;
  public declare refreshToken: number;

  private declare _viewState: ViewState;
  private declare _store: StoreState;
  private declare _entries: WorkflowEntry[];
  private declare _pending?: Pending;
  private declare _confirmDeleteId?: string;
  private declare _error: string;
  private declare _observation?: { id: string; result: WorkflowObservation };
  private _sequence = 0;
  private _connection?: HomeAssistantLike["connection"];
  private _userId?: string;
  private _callWS?: HomeAssistantLike["callWS"];

  public constructor() {
    super();
    this.refreshToken = 0;
    this._viewState = "waiting";
    this._store = "not_loaded";
    this._entries = [];
    this._error = "";
  }

  private readonly _reset = (): void => {
    this._sequence++;
    this._viewState = "waiting";
    this._store = "not_loaded";
    this._entries = [];
    this._pending = undefined;
    this._confirmDeleteId = undefined;
    this._error = "";
    this._observation = undefined;
  };

  public override connectedCallback(): void {
    super.connectedCallback();
    this._connection?.addEventListener("disconnected", this._reset);
    // First mount binds and loads in willUpdate; only a reattachment with an
    // already-bound hass needs to reload here.
    if (this._callWS !== undefined && this.hass !== undefined) {
      queueMicrotask(() => void this._load());
    }
  }

  public override disconnectedCallback(): void {
    this._connection?.removeEventListener("disconnected", this._reset);
    this._reset();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("hass")) {
      const identityChanged =
        this._connection !== this.hass?.connection ||
        this._userId !== this.hass?.user?.id ||
        this._callWS !== this.hass?.callWS;
      if (identityChanged) {
        this._connection?.removeEventListener("disconnected", this._reset);
        this._reset();
        this._connection = this.hass?.connection;
        this._userId = this.hass?.user?.id;
        this._callWS = this.hass?.callWS;
        this._connection?.addEventListener("disconnected", this._reset);
        if (this.hass !== undefined) {
          queueMicrotask(() => void this._load());
        }
      }
    }
    if (changed.has("refreshToken") && changed.get("refreshToken") !== undefined) {
      queueMicrotask(() => void this._load());
    }
  }

  /** True while the response belongs to the current view, hass identity, and DOM attachment. */
  private _current(sequence: number, hass: HomeAssistantLike): boolean {
    return (
      sequence === this._sequence &&
      this.isConnected &&
      this.hass?.callWS === hass.callWS &&
      this.hass?.connection === hass.connection &&
      this.hass?.user?.id === hass.user?.id
    );
  }

  private readonly _load = async (): Promise<void> => {
    const hass = this.hass;
    if (hass === undefined || hass.connection?.connected === false) {
      return;
    }
    const sequence = ++this._sequence;
    this._viewState = "loading";
    this._error = "";
    try {
      const list = await fetchWorkflows(hass);
      if (!this._current(sequence, hass)) return;
      this._store = list.store;
      this._entries = list.workflows;
      this._viewState = "ready";
    } catch {
      if (!this._current(sequence, hass)) return;
      this._entries = [];
      this._viewState = "error";
      this._error = STATIC_ERRORS.load;
    }
  };

  private async _mutate(pending: Pending): Promise<void> {
    const hass = this.hass;
    if (hass === undefined || this._pending !== undefined || hass.connection?.connected === false) {
      return;
    }
    const sequence = this._sequence;
    this._pending = pending;
    this._error = "";
    if (pending.action !== "observe") {
      this._observation = undefined;
    }
    try {
      if (pending.action === "observe") {
        const result = await observeWorkflow(hass, pending.id);
        if (!this._current(sequence, hass)) return;
        this._observation = { id: pending.id, result };
        // Counters changed on the backend; refresh the list to show them.
        const list = await fetchWorkflows(hass);
        if (!this._current(sequence, hass)) return;
        this._store = list.store;
        this._entries = list.workflows;
        return;
      }
      const list =
        pending.action === "delete"
          ? await deleteWorkflow(hass, pending.id)
          : await setWorkflowEnabled(hass, pending.id, pending.action === "enable");
      if (!this._current(sequence, hass)) return;
      this._store = list.store;
      this._entries = list.workflows;
      this._confirmDeleteId = undefined;
    } catch {
      if (!this._current(sequence, hass)) return;
      this._error = pending.action === "observe" ? STATIC_ERRORS.observe : STATIC_ERRORS.mutate;
    } finally {
      if (this._current(sequence, hass)) {
        this._pending = undefined;
      }
    }
  }

  private _loadIntoEditor(entry: WorkflowEntry): void {
    this.dispatchEvent(
      new CustomEvent("workflow-load", {
        detail: { json: JSON.stringify(entry.workflow, null, 2) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override render(): TemplateResult {
    return html`
      <section aria-labelledby="workflows-title">
        <h2 id="workflows-title">Stored workflows</h2>
        <p>
          Enabled workflows watch their triggers in Home Assistant and record whether the
          deterministic conditions passed. No step runs yet: no text is generated, no
          notification is sent, and no device action executes.
        </p>
        <div class="actions">
          <button type="button" ?disabled=${this._viewState === "loading" || !this.hass} @click=${this._load}>
            ${this._viewState === "loading" ? "Loading…" : "Reload workflows"}
          </button>
        </div>
        <div role="status" aria-live="polite">
          ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
          ${this._store === "unreadable"
            ? html`<p class="notice error">
                Stored workflows could not be read. Nothing on disk was changed and no workflow is
                active; saving is refused until the storage file is repaired or restored.
              </p>`
            : nothing}
        </div>
        ${this._renderList()}
      </section>
    `;
  }

  private _renderList(): TemplateResult | typeof nothing {
    if (this._viewState !== "ready") {
      return nothing;
    }
    if (this._entries.length === 0) {
      return html`<p class="notice">No stored workflows. Use "Save as workflow" in the editor above.</p>`;
    }
    return html`<div class="list" role="list" aria-label="Stored workflows">
      ${this._entries.map((entry) => this._renderEntry(entry))}
    </div>`;
  }

  private _renderEntry(entry: WorkflowEntry): TemplateResult {
    const { workflow, status } = entry;
    const id = workflow.workflow_id;
    const busy = this._pending !== undefined;
    const mine = this._pending?.id === id ? this._pending.action : undefined;
    const badge = status.error !== null ? "error" : status.active ? "active" : "inactive";
    const badgeLabel =
      status.error === "activation_failed"
        ? "Activation failed"
        : status.error === "cleanup_failed"
          ? "Cleanup pending"
          : status.active
            ? "Active"
            : workflow.enabled
              ? "Enabled, not active"
              : "Disabled";
    const observation = this._observation?.id === id ? this._observation.result : undefined;
    return html`
      <article class="card" role="listitem">
        <div class="card-header">
          <h3>${workflow.name}</h3>
          <span class="badge ${badge}">${badgeLabel}</span>
        </div>
        ${workflow.description ? html`<p class="meta">${workflow.description}</p>` : nothing}
        <p class="meta">
          ${workflow.triggers.length} trigger(s) · ${workflow.conditions.length} condition(s) ·
          ${workflow.steps.length} step(s)
        </p>
        <p class="meta">
          Observations ${status.observations} · Ignored events ${status.ignored_events} ·
          Listeners ${status.registrations}
        </p>
        ${status.latest ? this._renderOutcome("Latest observation", status.latest) : nothing}
        ${observation ? this._renderOutcome("Manual observation", observation) : nothing}
        <div class="actions">
          <button
            type="button"
            ?disabled=${busy}
            @click=${() => this._mutate({ id, action: workflow.enabled ? "disable" : "enable" })}
          >
            ${mine === "enable" || mine === "disable"
              ? "Saving…"
              : workflow.enabled
                ? "Disable"
                : "Enable"}
          </button>
          <button
            type="button"
            ?disabled=${busy || !status.active}
            @click=${() => this._mutate({ id, action: "observe" })}
          >
            ${mine === "observe" ? "Observing…" : "Observe now"}
          </button>
          <button type="button" ?disabled=${busy} @click=${() => this._loadIntoEditor(entry)}>
            Load into editor
          </button>
          ${this._confirmDeleteId === id
            ? html`<button
                  class="danger"
                  type="button"
                  ?disabled=${busy}
                  @click=${() => this._mutate({ id, action: "delete" })}
                >
                  ${mine === "delete" ? "Deleting…" : "Confirm delete"}
                </button>
                <button type="button" ?disabled=${busy} @click=${() => { this._confirmDeleteId = undefined; }}>
                  Keep
                </button>`
            : html`<button
                class="danger"
                type="button"
                ?disabled=${busy}
                @click=${() => { this._confirmDeleteId = id; }}
              >
                Delete
              </button>`}
        </div>
      </article>
    `;
  }

  private _renderOutcome(label: string, outcome: WorkflowObservation): TemplateResult {
    return html`<p class="meta">
      ${label}: triggered ${outcome.triggered ? "yes" : "no"} · conditions
      ${outcome.conditions_passed ? "passed" : "failed"} ·
      ${outcome.eligible ? `${outcome.planned_steps.length} step(s) planned, none executed` : "no steps planned"}
    </p>`;
  }
}

customElements.define(WORKFLOWS_VIEW_TAG, WorkflowsView);
