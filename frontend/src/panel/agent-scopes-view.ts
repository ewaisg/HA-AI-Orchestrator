import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { askScopedAgent, probeAgentTools, fetchAgentProfiles, saveAgentProfile, type AgentProfile, type ScopedAnswer } from "../api/agent-client";
import { fetchCatalog, type CatalogEntity } from "../api/catalog-client";
import { fetchChatOptions, type ChatProvider } from "../api/chat-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

export class AgentScopesView extends LitElement {
  static override properties = { hass: { attribute: false }, _profiles: { state: true }, _providers: { state: true },
    _entities: { state: true }, _connection: { state: true }, _selected: { state: true }, _query: { state: true },
    _busy: { state: true }, _message: { state: true }, _verified: { state: true }, _question: { state: true }, _answer: { state: true } };
  static override styles = css`
    :host { display:block; margin-bottom:24px; }
    section { padding:20px; border:1px solid var(--divider-color,#ccd); border-radius:12px; }
    label { display:block; margin:10px 0; overflow-wrap:anywhere; }
    select,input[type=search],button { font:inherit; min-height:44px; max-width:100%; box-sizing:border-box; }
    select,input[type=search] { width:100%; color:inherit; background:var(--card-background-color,#fff); }
    .choices { max-height:280px; overflow:auto; }
    button { margin:8px 8px 0 0; }
    small { display:block; color:var(--secondary-text-color,#526168); }
    textarea { display:block; width:100%; box-sizing:border-box; min-height:90px; font:inherit; color:inherit; background:var(--card-background-color,#fff); }
    .answer { white-space:pre-wrap; overflow-wrap:anywhere; }
  `;
  declare hass?: HomeAssistantLike;
  private declare _profiles: AgentProfile[];
  private declare _providers: ChatProvider[];
  private declare _entities: CatalogEntity[];
  private declare _connection: string;
  private declare _selected: string[];
  private declare _query: string;
  private declare _busy: boolean;
  private declare _message: string;
  private declare _verified: boolean;
  private declare _question: string;
  private declare _answer?: ScopedAnswer;
  private _generation = 0;
  private _identity?: string;
  private _socket?: HomeAssistantLike["connection"];
  private readonly _disconnected = (): void => { this._clear(); };
  private readonly _ready = (): void => { void this._load(); };
  constructor() {
    super(); this._profiles = []; this._providers = []; this._entities = []; this._connection = "";
    this._selected = []; this._query = ""; this._busy = false; this._message = "";
    this._verified = false; this._question = ""; this._answer = undefined;
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback(); this._clear(); this._identity = undefined;
    this._socket?.removeEventListener?.("disconnected", this._disconnected);
    this._socket?.removeEventListener?.("ready", this._ready); this._socket = undefined;
  }
  private _clear(): void {
    this._generation++; this._profiles = []; this._providers = []; this._entities = [];
    this._selected = []; this._connection = ""; this._message = ""; this._query = ""; this._busy = false;
    this._verified = false; this._question = ""; this._answer = undefined;
  }
  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("hass") && this.hass) {
      const identity = this.hass.user?.id ?? "unknown";
      if (identity !== this._identity || this._socket !== this.hass.connection) {
        this._socket?.removeEventListener?.("disconnected", this._disconnected);
        this._socket?.removeEventListener?.("ready", this._ready);
        this._clear(); this._identity = identity; this._socket = this.hass.connection;
        this._socket?.addEventListener?.("disconnected", this._disconnected);
        this._socket?.addEventListener?.("ready", this._ready);
        void this._load();
      }
    } else if (changed.has("hass")) {
      this._clear(); this._identity = undefined;
    }
  }
  private async _load(): Promise<void> {
    const hass = this.hass;
    if (!hass || hass.connection?.connected === false) return;
    this._clear();
    const generation = ++this._generation;
    this._busy = true; this._profiles = []; this._selected = []; this._connection = ""; this._message = "";
    try {
      const [profiles, options, catalog] = await Promise.all([fetchAgentProfiles(hass), fetchChatOptions(hass), fetchCatalog(hass)]);
      if (generation !== this._generation || !this.isConnected) return;
      this._profiles = profiles; this._providers = options.providers;
      this._entities = catalog.entities.filter((entity) => !entity.disabled && ["sensor", "binary_sensor", "light", "switch", "fan"].includes(entity.domain));
      this._choose(options.providers[0]?.connection_id ?? "");
    } catch { if (generation === this._generation) this._message = "Policies could not be loaded. Reload to try again."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private _choose(id: string): void {
    this._connection = id;
    this._verified = false; this._answer = undefined; this._question = "";
    this._selected = [...(this._profiles.find((profile) => profile.connection_id === id)?.observe_registry_ids ?? [])];
    this._message = "";
  }
  private async _save(): Promise<void> {
    const profile = this._profiles.find((item) => item.connection_id === this._connection);
    if (!this.hass || this.hass.connection?.connected === false || !profile || this._busy) return;
    const generation = ++this._generation;
    this._busy = true; this._message = ""; this._answer = undefined;
    try {
      const saved = await saveAgentProfile(this.hass, { ...profile, observe_registry_ids: [...this._selected] });
      if (generation !== this._generation || !this.isConnected) return;
      this._profiles = this._profiles.map((item) => item.connection_id === saved.connection_id ? saved : item);
      this._message = "Observation policy saved. Device actions remain disabled.";
    } catch { if (generation === this._generation) this._message = "Policy was not saved. Reload and check the selected entities; another edit or an excluded entity may prevent saving."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private async _probe(): Promise<void> {
    if (!this.hass || !this._connection || this._busy) return;
    const generation = ++this._generation;
    this._busy = true; this._verified = false; this._answer = undefined; this._message = "";
    try {
      const supported = await probeAgentTools(this.hass, this._connection);
      if (generation !== this._generation || !this.isConnected) return;
      this._verified = supported;
      this._message = supported ? "Tool call and continuation verified for this local connection." : "This connection did not pass the synthetic tool test. Scoped questions remain unavailable.";
    } catch { if (generation === this._generation) this._message = "Tool test did not complete. Check the local provider and retry."; }
    finally { if (generation === this._generation) this._busy = false; }
  }
  private _savedProfile(): AgentProfile | undefined {
    const profile = this._profiles.find((item) => item.connection_id === this._connection);
    return profile && [...profile.observe_registry_ids].sort().join("\n") === [...this._selected].sort().join("\n") ? profile : undefined;
  }
  private async _ask(): Promise<void> {
    const profile = this._savedProfile();
    if (!this.hass || !profile || !profile.observe_registry_ids.length || !this._verified || this._busy) return;
    const generation = ++this._generation;
    this._busy = true; this._answer = undefined; this._message = "";
    try {
      const answer = await askScopedAgent(this.hass, profile, this._question);
      if (generation !== this._generation || !this.isConnected) return;
      this._answer = answer;
    } catch { if (generation === this._generation) { this._verified = false; this._message = "The scoped question did not complete. Reload policies and rerun the tool test; the provider or permissions may have changed."; } }
    finally { if (generation === this._generation) this._busy = false; }
  }
  protected override render() {
    const query = this._query.trim().toLowerCase();
    const entities = this._entities.filter((entity) => `${entity.name ?? ""} ${entity.entity_id}`.toLowerCase().includes(query));
    const missing = this._selected.filter((id) => !this._entities.some((entity) => entity.registry_id === id));
    return html`<section aria-label="Agent observation scopes" aria-busy=${this._busy}>
      <h2>Agent observation scopes</h2>
      <p>Choose the entities a local agent may observe. Policies start empty. Only numeric sensor values and on/off states are allowed; attributes and sensitive sensor classes are excluded. Device actions cannot be granted here.</p>
      <p>Use the scoped question below to read selected states through a verified local tool connection. Regular Chat and Assist remain text-only.</p>
      <label>Local agent<select .value=${this._connection} ?disabled=${this._busy} @change=${(event: Event) => this._choose((event.target as HTMLSelectElement).value)}>
        ${this._providers.map((provider) => html`<option value=${provider.connection_id}>${provider.title}</option>`)}
      </select></label>
      ${!this._busy && !this._providers.length ? html`<p>No local agent is available.</p>` : nothing}
      <label>Find an entity<input type="search" .value=${this._query} @input=${(event: Event) => { this._query = (event.target as HTMLInputElement).value; }}></label>
      <p>${this._selected.length} of 64 selected. The backend checks whether each selected entity is eligible.</p>
      <div class="choices">${entities.slice(0, 100).map((entity) => html`<label><input type="checkbox" .checked=${this._selected.includes(entity.registry_id)}
        ?disabled=${this._busy || !this._connection || (!this._selected.includes(entity.registry_id) && this._selected.length >= 64)}
        @change=${(event: Event) => { this._answer = undefined; this._selected = (event.target as HTMLInputElement).checked ? [...this._selected, entity.registry_id] : this._selected.filter((id) => id !== entity.registry_id); }}>
        ${entity.name ?? entity.entity_id}<small>${entity.entity_id}</small></label>`)}</div>
      ${entities.length > 100 ? html`<p>Showing 100 matches. Refine your search.</p>` : nothing}
      ${missing.length ? html`<p>${missing.length} selected entities are unavailable. Clear the selection to revoke them.</p>` : nothing}
      <button ?disabled=${this._busy || !this._connection} @click=${() => { this._answer = undefined; this._selected = []; }}>Clear selection</button>
      <button ?disabled=${this._busy || !this._connection} @click=${() => { void this._save(); }}>Save observation policy</button>
      <button ?disabled=${this._busy} @click=${() => { void this._load(); }}>Reload policies</button>
      <h3>Ask about selected entities</h3>
      <p>The tool test uses synthetic data only. A scoped question sends your question and permitted state values to this local provider. Each question is independent; no history is saved. No device action is available.</p>
      <button ?disabled=${this._busy || !this._connection} @click=${() => { void this._probe(); }}>Test tool support</button>
      <label>Scoped question<textarea maxlength="4000" .value=${this._question} ?disabled=${this._busy} @input=${(event: Event) => { this._question = (event.target as HTMLTextAreaElement).value; this._answer = undefined; }}></textarea></label>
      <button ?disabled=${this._busy || !this._verified || !this._savedProfile()?.observe_registry_ids.length || !this._question.trim()} @click=${() => { void this._ask(); }}>Ask local agent</button>
      ${this._answer ? html`
        <p class="answer">${this._answer.text}</p>
        <section aria-label="Scoped question trace">
          <h3>How this answer was produced</h3>
          <p>Local provider · ${this._answer.provider_calls} provider calls · ${this._answer.tool_calls} state reads · 0 actions</p>
          <ol>${this._answer.trace.map((marker) => html`<li>${marker === "provider_response" ? "Local provider returned a response" : "Read permitted entity states"}</li>`)}</ol>
          <p>This trace contains operation types only. It does not include prompts, state values, or provider payloads, and is not saved as history.</p>
        </section>
      ` : nothing}
      <p role="status">${this._message}</p>
    </section>`;
  }
}
customElements.define("ai-orchestrator-agent-scopes-view", AgentScopesView);
