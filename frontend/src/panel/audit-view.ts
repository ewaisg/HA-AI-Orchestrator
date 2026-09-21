import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { fetchAudit, type AuditRecord, type AuditOperation } from "../api/audit-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

const OPERATIONS: Record<AuditOperation, string> = {
  light_turn_on_v1: "Turn light on", light_turn_off_v1: "Turn light off",
  switch_turn_on_v1: "Turn switch on", switch_turn_off_v1: "Turn switch off",
  media_play_v1: "Play media", media_pause_v1: "Pause media", media_volume_v1: "Set media volume",
  workflow_run: "Workflow run", notify: "Notification",
};
export class AuditView extends LitElement {
  static override properties = { hass: { attribute: false }, _rows: { state: true }, _state: { state: true }, _cursor: { state: true } };
  static override styles = css`
    :host { display: block; color: var(--primary-text-color, #233642); }
    * { box-sizing: border-box; }
    p, li { line-height: 1.6; overflow-wrap: anywhere; }
    ol { padding: 0; list-style: none; display: grid; gap: 12px; }
    li { border: 1px solid var(--divider-color, #ccd9da); border-radius: 10px; padding: 16px; min-width: 0; }
    h2 { font-size: 1.2rem; } h3 { font-size: 1rem; }
    button { font: inherit; color: inherit; background: var(--card-background-color, white); border: 1px solid var(--divider-color, #ccd9da); border-radius: 8px; padding: 8px 16px; min-height: 44px; cursor: pointer; }
    button:focus-visible { outline: 3px solid var(--primary-color, #007a78); }
    button:disabled { opacity: .6; cursor: default; }
  `;
  declare hass?: HomeAssistantLike;
  private declare _rows: AuditRecord[];
  private declare _state: "waiting" | "loading" | "ready" | "error";
  private declare _cursor: number | null;
  private _sequence = 0;
  private _connection?: HomeAssistantLike["connection"];
  private _callWS?: HomeAssistantLike["callWS"];
  private _userId?: string;
  constructor() { super(); this._rows = []; this._state = "waiting"; this._cursor = null; }
  private readonly _reset = (): void => { this._sequence++; this._rows = []; this._cursor = null; this._state = "waiting"; };
  private readonly _refresh = (): void => { void this._load(false); };
  override connectedCallback(): void {
    super.connectedCallback();
    this._connection?.addEventListener("disconnected", this._reset);
    this._connection?.addEventListener("ready", this._refresh);
    if (this._callWS) queueMicrotask(this._refresh);
  }
  override disconnectedCallback(): void {
    this._connection?.removeEventListener("disconnected", this._reset);
    this._connection?.removeEventListener("ready", this._refresh);
    this._reset(); super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("hass") && (this._connection !== this.hass?.connection || this._callWS !== this.hass?.callWS || this._userId !== this.hass?.user?.id)) {
      this._connection?.removeEventListener("disconnected", this._reset);
      this._connection?.removeEventListener("ready", this._refresh);
      this._reset();
      this._connection = this.hass?.connection; this._callWS = this.hass?.callWS; this._userId = this.hass?.user?.id;
      this._connection?.addEventListener("disconnected", this._reset);
      this._connection?.addEventListener("ready", this._refresh);
      queueMicrotask(this._refresh);
    }
  }
  private async _load(more: boolean): Promise<void> {
    const hass = this.hass;
    if (!hass || !this.isConnected || hass.connection?.connected === false || this._state === "loading" || (more && (this._cursor === null || this._rows.length >= 4096))) return;
    const sequence = ++this._sequence;
    const userId = hass.user?.id;
    const after = more ? this._cursor! : 0;
    if (!more) { this._rows = []; this._cursor = null; }
    this._state = "loading";
    const current = (): boolean => sequence === this._sequence && this.isConnected && this.hass?.callWS === hass.callWS && this.hass?.connection === hass.connection && this.hass?.user?.id === userId && this.hass?.connection?.connected !== false;
    try {
      const page = await fetchAudit(hass, after, Math.min(100, 4096 - this._rows.length));
      if (!current()) return;
      const ids = new Set(this._rows.map(row => row.audit_id));
      if (page.records.some(row => ids.has(row.audit_id))) throw new Error("Duplicate audit metadata");
      this._rows = [...this._rows, ...page.records]; this._cursor = page.next_cursor; this._state = "ready";
    } catch {
      if (!current()) return;
      this._rows = []; this._cursor = null; this._state = "error";
    }
  }
  protected override render() {
    return html`
      <h2>Durable action history</h2>
      <p>Confirmed device-action metadata is retained for up to 90 days, within a 4096-record limit. Workflows are not recorded here yet. No household identifiers or message content are shown.</p>
      <p>Committed means the service call returned; it does not confirm a physical device change. Unknown means the result is uncertain and must be checked before trying again. Non-final counts may be incomplete.</p>
      <button @click=${this._refresh} ?disabled=${this._state === "loading"}>Refresh history</button>
      <div role="status" aria-live="polite">
        ${this._state === "waiting" ? html`<p>Waiting for Home Assistant.</p>` : nothing}
        ${this._state === "loading" ? html`<p>Loading audit history…</p>` : nothing}
        ${this._state === "error" ? html`<p>Audit history is unavailable. Check your connection, administrator access and integration storage, then refresh.</p>` : nothing}
        ${this._state === "ready" && !this._rows.length ? html`<p>No retained action history.</p>` : nothing}
      </div>
      <ol aria-label="Audit records">${this._rows.map(row => html`<li>
        <h3>${OPERATIONS[row.operation]}</h3>
        <p>Stage: ${row.phase}. Counts: ${row.counts_final ? "final" : "not final"}.</p>
        <p>Created: <time datetime=${row.created_at}>${row.created_at}</time><br>Updated: <time datetime=${row.updated_at}>${row.updated_at}</time></p>
        <p>Provider calls: ${row.provider_calls} · Actions attempted: ${row.actions_attempted} · Service returns: ${row.service_returns}</p>
        ${row.error_code ? html`<p>Reason: ${row.error_code}</p>` : nothing}
      </li>`)}</ol>
      ${this._cursor !== null && this._rows.length < 4096 ? html`<button @click=${() => { void this._load(true); }} ?disabled=${this._state === "loading"}>Load more history</button>` : nothing}
      ${this._rows.length >= 4096 ? html`<p>Display limit reached. Refresh to read current retained history.</p>` : nothing}
    `;
  }
}
if (!customElements.get("ai-orchestrator-audit")) customElements.define("ai-orchestrator-audit", AuditView);
