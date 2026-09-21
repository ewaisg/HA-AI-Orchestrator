import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { ACTION_LABELS, confirmAction, fetchActionCatalog, interpretAction, proposeAction, saveActionProfile, type ActionCatalog, type ActionProposal, type ActionScope, type ActionTool } from "../api/action-client";
import { fetchChatOptions, type ChatProvider } from "../api/chat-client";
import type { HomeAssistantLike } from "../ha/hass-contract";
import { previewSwitchReview, updateSwitchReview, type SwitchPreview } from "../api/action-client";

export class ActionControlsView extends LitElement {
  static override properties = { hass: { attribute: false }, mode: {}, _providers: { state: true }, _connection: { state: true }, _catalog: { state: true }, _scopes: { state: true }, _tool: { state: true }, _target: { state: true }, _volume: { state: true }, _query: { state: true }, _busy: { state: true }, _message: { state: true }, _proposal: { state: true }, _prompt: { state: true }, _switchTarget: { state: true }, _review: { state: true }, _attestations: { state: true } };
  static override styles = css`
    :host{display:block;margin-bottom:24px} section{padding:20px;border:1px solid var(--divider-color,#ccd);border-radius:12px;min-width:0}
    label{display:block;margin:10px 0;overflow-wrap:anywhere} select,input[type=search],input[type=number],textarea{display:block;width:100%;box-sizing:border-box;background:var(--card-background-color,#fff);color:inherit} textarea{font:inherit;min-height:80px}
    button,select,input{font:inherit;min-height:44px;max-width:100%} button{margin:8px 8px 0 0} .choices{max-height:280px;overflow:auto} small{display:block} p,dd{overflow-wrap:anywhere} dd{margin:0 0 10px} dt{font-weight:bold} .proposal{margin-top:16px}
  `;
  declare hass?: HomeAssistantLike;
  declare mode: "permissions" | "control" | "all";
  private declare _providers: ChatProvider[];
  private declare _connection: string;
  private declare _catalog?: ActionCatalog;
  private declare _scopes: ActionScope[];
  private declare _tool: ActionTool | "";
  private declare _target: string;
  private declare _volume: string;
  private declare _query: string;
  private declare _busy: boolean;
  private declare _message: string;
  private declare _proposal?: ActionProposal;
  private declare _prompt: string;
  private declare _switchTarget: string;
  private declare _review?: SwitchPreview;
  private declare _attestations: boolean[];
  private _reviewTimer?: ReturnType<typeof setTimeout>;
  private _generation = 0;
  private _identity?: string;
  private _callWS?: HomeAssistantLike["callWS"];
  private _socket?: HomeAssistantLike["connection"];
  private _timer?: ReturnType<typeof setTimeout>;
  private readonly _offline = () => this._clear();
  private readonly _ready = () => { void this._load(); };
  constructor() { super(); this._switchTarget = ""; this._attestations = [false, false, false]; this.mode = "all"; this._prompt = ""; this._providers = []; this._connection = ""; this._scopes = []; this._tool = ""; this._target = ""; this._volume = ""; this._query = ""; this._busy = false; this._message = ""; }
  private _clearReview(): void { clearTimeout(this._reviewTimer); this._reviewTimer = undefined; this._review = undefined; this._attestations = [false, false, false]; }
  private _clearProposal(): void { clearTimeout(this._timer); this._timer = undefined; this._proposal = undefined; this._clearReview(); }
  private _clear(): void { this._generation++; this._clearProposal(); this._prompt = ""; this._switchTarget = ""; this._providers = []; this._catalog = undefined; this._connection = ""; this._scopes = []; this._tool = ""; this._target = ""; this._volume = ""; this._query = ""; this._busy = false; this._message = ""; }
  override disconnectedCallback(): void { super.disconnectedCallback(); this._clear(); this._identity = undefined; this._socket?.removeEventListener("disconnected", this._offline); this._socket?.removeEventListener("ready", this._ready); this._socket = undefined; }
  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("mode")) this._clearProposal();
    if (!changed.has("hass")) return;
    const identity = this.hass?.user?.id ?? "unknown";
    if (!this.hass || identity !== this._identity || this.hass.connection !== this._socket || this.hass.callWS !== this._callWS) {
      this._socket?.removeEventListener("disconnected", this._offline); this._socket?.removeEventListener("ready", this._ready);
      this._clear(); this._identity = this.hass ? identity : undefined; this._socket = this.hass?.connection; this._callWS = this.hass?.callWS;
      this._socket?.addEventListener("disconnected", this._offline); this._socket?.addEventListener("ready", this._ready);
      if (this.hass) void this._load();
    }
  }
  private _online(): boolean { return !!this.hass && this.hass.connection?.connected !== false && this.isConnected; }
  private async _load(): Promise<void> {
    if (!this._online()) return;
    this._clear(); const generation = this._generation; this._busy = true;
    try {
      const options = await fetchChatOptions(this.hass!);
      if (generation !== this._generation || !this._online()) return;
      this._providers = options.providers;
      this._busy = false;
      if (options.providers[0]) await this._choose(options.providers[0].connection_id);
    } catch { if (generation === this._generation) this._message = "Action controls could not be loaded. Reload to try again."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private async _choose(connection: string): Promise<void> {
    if (!this._online() || this._busy) return;
    const generation = ++this._generation; this._clearProposal(); this._catalog = undefined; this._scopes = []; this._tool = ""; this._target = ""; this._volume = ""; this._message = ""; this._connection = connection; this._busy = true;
    this._prompt = ""; this._switchTarget = "";
    try {
      const catalog = await fetchActionCatalog(this.hass!, connection);
      if (generation !== this._generation || !this._online()) return;
      this._catalog = catalog; this._scopes = structuredClone(catalog.profile.action_scopes); this._tool = catalog.tools[0]?.tool_id ?? "";
    } catch { if (generation === this._generation) this._message = "Action permissions are unavailable. Reload before trying again."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private _toggle(id: string, checked: boolean): void {
    if (!this._tool || this._busy) return;
    this._clearProposal();
    const ids = this._scopes.find((scope) => scope.tool_id === this._tool)?.registry_ids ?? [];
    const next = checked ? [...new Set([...ids, id])] : ids.filter((item) => item !== id);
    this._scopes = this._scopes.filter((scope) => scope.tool_id !== this._tool);
    if (next.length) this._scopes = [...this._scopes, { tool_id: this._tool, registry_ids: next }];
  }
  private _dirty(): boolean { return JSON.stringify(this._scopes) !== JSON.stringify(this._catalog?.profile.action_scopes ?? []); }
  private async _save(): Promise<void> {
    if (!this._online() || this._busy || !this._catalog) return;
    const generation = ++this._generation; this._clearProposal(); this._busy = true; this._message = "";
    try {
      const profile = await saveActionProfile(this.hass!, { ...this._catalog.profile, action_scopes: this._scopes });
      if (generation !== this._generation || !this._online()) return;
      this._catalog = { ...this._catalog, profile }; this._scopes = structuredClone(profile.action_scopes); this._message = "Action permissions saved. Every action still requires separate confirmation.";
    } catch { if (generation === this._generation) this._message = "Permissions were not saved. Reload and review the current permissions."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private async _propose(): Promise<void> {
    const selected = this._catalog?.tools.find((item) => item.tool_id === this._tool);
    const target = selected?.targets.find((item) => item.registry_id === this._target);
    if (!this._online() || this._busy || !this._catalog || !selected || !target || this._dirty()) return;
    const generation = ++this._generation; this._clearProposal(); this._busy = true; this._message = "";
    try {
      const args: Record<string, number> = selected.arguments === "volume" ? { volume_level: Number(this._volume) } : {};
      if (selected.arguments === "volume" && !this._volume.trim()) throw new Error("Volume required");
      const proposal = await proposeAction(this.hass!, this._catalog.profile, selected, target, args);
      if (generation !== this._generation || !this._online()) return;
      this._proposal = proposal;
      this._timer = setTimeout(() => { this._clearProposal(); this._message = "This confirmation expired. Review a new proposal before acting."; }, proposal.expires_in * 1000);
    } catch { if (generation === this._generation) this._message = "The action could not be proposed. Reload permissions and review the target."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private async _confirm(): Promise<void> {
    if (!this._online() || this._busy || !this._proposal) return;
    const proposal = this._proposal; const generation = ++this._generation;
    this._clearProposal(); this._busy = true; this._message = "";
    try {
      const status = await confirmAction(this.hass!, proposal);
      if (generation !== this._generation || !this._online()) return;
      this._message = status === "completed" ? "Home Assistant accepted the action. Check the device to verify its physical result." : "The action outcome is unknown. Check the device before considering another action.";
    } catch { if (generation === this._generation) this._message = "The action was not confirmed or its outcome is unknown. Check the device before trying another action."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private async _interpret(): Promise<void> {
    if (!this._online() || this._busy || !this._catalog || this._dirty() || !this._prompt.trim()) return;
    const generation = ++this._generation; this._clearProposal(); this._busy = true; this._message = "";
    try {
      const proposal = await interpretAction(this.hass!, this._catalog, this._prompt);
      if (generation !== this._generation || !this._online()) return;
      this._proposal = proposal;
      this._timer = setTimeout(() => { this._clearProposal(); this._message = "This confirmation expired. Review a new proposal before acting."; }, proposal.expires_in * 1000);
    } catch { if (generation === this._generation) this._message = "AI could not propose a permitted action. Review the request and permissions; no confirmation was sent."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private async _previewSwitch(): Promise<void> {
    const target = this._catalog?.switch_candidates.find(item => item.registry_id === this._switchTarget);
    if (!this._online() || this._busy || !this._catalog || !target || this._dirty()) return;
    const generation = ++this._generation; this._clearProposal(); this._busy = true; this._message = "";
    try {
      const preview = await previewSwitchReview(this.hass!, this._catalog.profile, target);
      if (generation !== this._generation || !this._online()) return;
      this._review = preview;
      this._reviewTimer = setTimeout(() => { this._clearReview(); this._message = "Switch review expired. Inspect the current target again."; }, preview.expires_in * 1000);
    } catch { if (generation === this._generation) this._message = "Switch review is unavailable. Reload and inspect the current target."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private async _saveSwitchReview(revokeId?: string): Promise<void> {
    const preview = this._review;
    if (!this._online() || this._busy || !this._catalog || this._dirty() || (!revokeId && (!preview || !this._attestations.every(Boolean)))) return;
    const generation = ++this._generation; const connection = this._connection;
    this._clearProposal(); this._busy = true; this._message = "";
    try {
      await updateSwitchReview(this.hass!, this._catalog.profile, revokeId ?? preview!.registry_id, revokeId ? undefined : preview);
      if (generation !== this._generation || !this._online()) return;
      this._busy = false; await this._choose(connection);
      if (this._generation === generation + 1 && this._connection === connection && this._catalog) this._message = revokeId ? "Switch review revoked and its switch grants removed." : "Switch review saved. No action is granted yet. Select and save separate switch action permissions.";
    } catch { if (generation === this._generation) { this._catalog = undefined; this._scopes = []; this._message = "Switch review was not verified. Reload current permissions before continuing."; } }
    finally { if (generation === this._generation) this._busy = false; }
  }
  protected override render() {
    const selected = this._catalog?.tools.find((item) => item.tool_id === this._tool);
    const ids = this._scopes.find((scope) => scope.tool_id === this._tool)?.registry_ids ?? [];
    const granted = this._catalog?.profile.action_scopes.find((scope) => scope.tool_id === this._tool)?.registry_ids ?? [];
    const count = this._scopes.reduce((sum, scope) => sum + scope.registry_ids.length, 0);
    const targets = selected?.targets.filter((target) => `${target.name} ${target.entity_id}`.toLowerCase().includes(this._query.toLowerCase())) ?? [];
    return html`<section aria-label="Confirmed device actions" aria-busy=${this._busy}>
      <h2>${this.mode === "permissions" ? "Device action permissions" : "Confirmed device actions"}</h2>
      <p>Review an exact device action and confirm separately before Home Assistant sends it. Saved grants alone never execute an action.</p>
      <label>Action provider<select .value=${this._connection} ?disabled=${this._busy} @change=${(event: Event) => { void this._choose((event.target as HTMLSelectElement).value); }}>${this._providers.map((provider) => html`<option value=${provider.connection_id}>${provider.title}</option>`)}</select></label>
      <label>Device action<select .value=${this._tool} ?disabled=${this._busy || !this._catalog} @change=${(event: Event) => { this._clearProposal(); this._tool = (event.target as HTMLSelectElement).value as ActionTool; this._target = ""; this._volume = ""; }}>${this._catalog?.tools.map((item) => html`<option value=${item.tool_id}>${item.label}</option>`)}</select></label>
      ${this.mode !== "control" ? html`
        <h3>Review ordinary switches</h3>
        <p>Inspect the physical device before classifying it. A switch name does not establish what it controls. Security, locks, doors, alarms, life-safety equipment and grouped targets are not eligible. Review saves no grants; each later switch action is high risk and requires separate confirmation.</p>
        <label>Switch to inspect<select .value=${this._switchTarget} ?disabled=${this._busy || this._dirty()} @change=${(event: Event) => { this._clearProposal(); this._switchTarget = (event.target as HTMLSelectElement).value; }}><option value="">Choose a switch</option>${this._catalog?.switch_candidates.map(item => html`<option value=${item.registry_id}>${item.name} — ${item.entity_id} (${item.status})</option>`)}</select></label>
        <button ?disabled=${this._busy || this._dirty() || !this._catalog?.switch_candidates.some(item => item.registry_id === this._switchTarget)} @click=${() => { void this._previewSwitch(); }}>Inspect switch review</button>
        ${this._review ? html`<section aria-label="Switch classification review"><h3>Verify this physical target</h3><dl><dt>Entity</dt><dd>${this._review.entity_id}</dd><dt>Device</dt><dd>${this._review.device_name}</dd><dt>Name</dt><dd>${this._review.name}</dd><dt>Classification</dt><dd>Ordinary, noncritical switch</dd></dl>
          ${["I verified the physical target controlled by this switch.", "This controls one physical device, not a group or indirect automation.", "This is not security or life-safety equipment and cannot control a lock, door or alarm."].map((label, index) => html`<label><input type="checkbox" .checked=${this._attestations[index]!} ?disabled=${this._busy} @change=${(event: Event) => { this._attestations = this._attestations.map((value, item) => item === index ? (event.target as HTMLInputElement).checked : value); }}>${label}</label>`)}
          <p>Expires in five minutes. This review will remove any existing switch grants for this target.</p>
          <button ?disabled=${this._busy || !this._attestations.every(Boolean)} @click=${() => { void this._saveSwitchReview(); }}>Save switch review</button><button @click=${() => this._clearReview()}>Cancel switch review</button>
        </section>` : nothing}
        ${this._catalog?.profile.switch_reviews.length ? html`<h4>Saved switch reviews</h4><ul>${this._catalog.profile.switch_reviews.map(review => html`<li>${this._catalog?.switch_candidates.find(item => item.registry_id === review.registry_id)?.entity_id ?? "Unavailable reviewed switch"}<button ?disabled=${this._busy || this._dirty()} @click=${() => { void this._saveSwitchReview(review.registry_id); }}>Revoke switch review</button></li>`)}</ul>` : nothing}
        ${this._dirty() ? html`<p>Save or reload your pending grants before reviewing a switch.</p>` : nothing}
        <label>Find action target<input type="search" .value=${this._query} @input=${(event: Event) => { this._query = (event.target as HTMLInputElement).value; }}></label>
        <p>${count} of 64 action grants selected. An action grant is separate from observation permission.</p>
        <div class="choices">${targets.slice(0, 100).map((target) => html`<label><input type="checkbox" .checked=${ids.includes(target.registry_id)} ?disabled=${this._busy || (!ids.includes(target.registry_id) && count >= 64)} @change=${(event: Event) => this._toggle(target.registry_id, (event.target as HTMLInputElement).checked)}>${target.name}<small>${target.entity_id}</small></label>`)}</div>
        ${ids.some((id) => !selected?.targets.some((target) => target.registry_id === id)) ? html`<p>Some saved targets are unavailable. Clear all grants to revoke them.</p>` : nothing}
        <button ?disabled=${this._busy || !this._catalog} @click=${() => { this._clearProposal(); this._scopes = []; }}>Clear all action grants</button>
        <button ?disabled=${this._busy || !this._catalog} @click=${() => { void this._save(); }}>Save action permissions</button>
      ` : nothing}
      ${this.mode !== "permissions" ? html`
        <h3>Ask local AI to propose an action</h3><p>Your request and granted device names and IDs go to this local provider. Review the proposal before confirming; current device states are not sent to the model.</p>
        <label>Device request<textarea maxlength="4000" .value=${this._prompt} ?disabled=${this._busy} @input=${(event: Event) => { this._clearProposal(); this._prompt = (event.target as HTMLTextAreaElement).value; }}></textarea></label>
        <button ?disabled=${this._busy || !this._catalog?.profile.action_scopes.length || this._dirty() || !this._prompt.trim()} @click=${() => { void this._interpret(); }}>Ask AI to propose</button>
        <h3>Or choose the action directly</h3>
        <label>Granted device<select .value=${this._target} ?disabled=${this._busy || !this._catalog} @change=${(event: Event) => { this._clearProposal(); this._target = (event.target as HTMLSelectElement).value; }}><option value="">Choose a device</option>${selected?.targets.filter((target) => granted.includes(target.registry_id)).map((target) => html`<option value=${target.registry_id}>${target.name} — ${target.entity_id}</option>`)}</select></label>
        ${selected?.arguments === "volume" ? html`<label>Volume (0 to 1)<input type="number" min="0" max="1" step="0.01" .value=${this._volume} ?disabled=${this._busy} @input=${(event: Event) => { this._clearProposal(); this._volume = (event.target as HTMLInputElement).value; }}></label>` : nothing}
        ${!granted.length ? html`<p>No device is granted for this action. Save explicit grants in Entities & Permissions first.</p>` : nothing}
        <button ?disabled=${this._busy || !this._target || this._dirty()} @click=${() => { void this._propose(); }}>Review action</button>
        ${this._proposal ? html`<section class="proposal" aria-label="Action confirmation"><h3>Review before confirming</h3><dl><dt>Action</dt><dd>${ACTION_LABELS[this._proposal.tool_id]}</dd><dt>Exact entity</dt><dd>${this._proposal.entity_id}</dd><dt>Current state</dt><dd>${this._proposal.state}</dd><dt>Arguments</dt><dd>${JSON.stringify(this._proposal.arguments)}</dd><dt>Risk</dt><dd>${this._proposal.risk}</dd></dl><p>Expires in five minutes. A changed state or permission requires a new proposal.</p><button ?disabled=${this._busy} @click=${() => { void this._confirm(); }}>Confirm this action</button><button @click=${() => this._clearProposal()}>Cancel proposal</button></section>` : nothing}
      ` : nothing}
      <button ?disabled=${this._busy} @click=${() => { void this._load(); }}>Reload action permissions</button><p role="status">${this._message}</p>
    </section>`;
  }
}
customElements.define("ai-orchestrator-action-controls-view", ActionControlsView);
