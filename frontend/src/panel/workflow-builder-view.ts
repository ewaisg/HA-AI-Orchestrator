import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { fetchCatalog, type CatalogEntity } from "../api/catalog-client";
import { fetchChatOptions, newRequestId, type ChatProvider } from "../api/chat-client";
import { fetchNotifyTargets, type NotifyTarget } from "../api/notify-client";
import { saveWorkflow } from "../api/workflow-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

export const WORKFLOW_BUILDER_TAG = "ai-orchestrator-workflow-builder";

type TriggerKind = "state" | "time" | "manual";
type ConditionDraft =
  | { kind: "state"; entity_id: string; state: string }
  | { kind: "time_window"; after_time: string; before_time: string }
  | { kind: "numeric_state"; entity_id: string; above: string; below: string };
type StepDraft = { id?: string } & (
  | { kind: "ai_compose"; prompt: string }
  | { kind: "ai_classify"; prompt: string; categories: string }
  | { kind: "ai_extract"; prompt: string; fields: string }
  | { kind: "branch"; when_step_id: string; when_category: string }
  | { kind: "notify"; notify_service: string });
const STEP_ID = /^[a-z][a-z0-9_]{0,63}$/u;
const FIELD_TYPES = ["string", "number", "boolean"];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/u;
const ENTITY = /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/u;
const MAX_MATCHES = 40;
const SAVE_MESSAGES: Record<string, string> = {
  invalid_workflow: "Home Assistant rejected the workflow. Check the highlighted fields.",
  workflow_store_unavailable: "Workflow storage is unavailable.",
  not_loaded: "The foundation is not loaded.",
};

export class WorkflowBuilderView extends LitElement {
  public static override properties = {
    hass: { attribute: false }, draft: { attribute: false }, _editing: { state: true }, _notice: { state: true },
    _entities: { state: true }, _providers: { state: true }, _targets: { state: true },
    _name: { state: true }, _runMode: { state: true }, _providerId: { state: true }, _enabled: { state: true },
    _triggerKind: { state: true }, _triggerEntity: { state: true }, _toState: { state: true }, _atTime: { state: true },
    _conditions: { state: true }, _steps: { state: true }, _busy: { state: true }, _error: { state: true }, _saved: { state: true },
  };
  public static override styles = css`
    :host { display:block; min-width:0; color:var(--primary-text-color,#233642); margin-bottom:32px; }
    * { box-sizing:border-box; } h1 { font-size:26px; margin:0 0 10px; } h2 { font-size:18px; margin:18px 0 8px; }
    p { line-height:1.6; } fieldset { border:1px solid var(--divider-color,#ccd9da); border-radius:12px; padding:12px 16px; margin:0 0 14px; min-width:0; }
    legend { font-weight:600; padding:0 6px; } label { display:block; font-weight:600; margin:10px 0 4px; }
    input, select, textarea { width:100%; min-width:0; min-height:44px; padding:8px 12px; font:inherit; color:inherit; background:var(--card-background-color,#fff); border:1px solid #7d969c; border-radius:8px; }
    textarea { min-height:96px; resize:vertical; } .row { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin:14px 0; } button { cursor:pointer; min-height:44px; padding:10px 14px; font:inherit; border:1px solid #7d969c; border-radius:8px; background:var(--card-background-color,#fff); color:inherit; }
    .primary { background:#175e56; color:#fff; } button:disabled { opacity:.55; cursor:default; } .error { color:var(--error-color,#852e23); }
    .hint { font-size:13px; opacity:.85; margin:4px 0 0; } .check { display:flex; align-items:center; gap:8px; font-weight:600; margin:10px 0; } .check input { width:auto; min-height:0; }
    button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline:3px solid #207e73; outline-offset:3px; }
  `;
  public declare hass?: HomeAssistantLike;
  /** A stored document to edit; each handoff carries a distinct sequence. */
  public declare draft?: { json: string; sequence: number };
  private declare _editing: boolean;
  private declare _notice: string;
  private declare _entities: CatalogEntity[];
  private declare _providers: ChatProvider[];
  private declare _targets: NotifyTarget[];
  private declare _name: string;
  private declare _runMode: "observe" | "execute";
  private declare _providerId: string;
  private declare _enabled: boolean;
  private declare _triggerKind: TriggerKind;
  private declare _triggerEntity: string;
  private declare _toState: string;
  private declare _atTime: string;
  private declare _conditions: ConditionDraft[];
  private declare _steps: StepDraft[];
  private declare _busy: boolean;
  private declare _error: string;
  private declare _saved: boolean;
  private _sequence = 0;
  private _callWS?: HomeAssistantLike["callWS"];
  private _userId?: string;
  private _workflowId = newRequestId();

  public constructor() {
    super();
    this._entities = []; this._providers = []; this._targets = [];
    this._name = ""; this._runMode = "observe"; this._providerId = ""; this._enabled = false;
    this._triggerKind = "state"; this._triggerEntity = ""; this._toState = "on"; this._atTime = "";
    this._conditions = [];
    this._steps = [{ kind: "ai_compose", prompt: "Write a short, friendly household reminder about this event." }, { kind: "notify", notify_service: "" }];
    this._busy = false; this._error = ""; this._saved = false; this._editing = false; this._notice = "";
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("draft") && this.draft !== undefined) this._loadDocument(this.draft.json);
    if (!changed.has("hass")) return;
    if (this._callWS !== this.hass?.callWS || this._userId !== this.hass?.user?.id) {
      this._callWS = this.hass?.callWS; this._userId = this.hass?.user?.id;
      this._sequence++; this._entities = []; this._providers = []; this._targets = []; this._busy = false; this._error = ""; this._saved = false;
      void this._loadLookups();
    }
  }

  /** Read-only lookups so pickers offer only what Home Assistant really has. */
  private async _loadLookups(): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    const sequence = this._sequence;
    const current = (): boolean => sequence === this._sequence && this.isConnected && this.hass?.callWS === hass.callWS;
    const [catalog, options, targets] = await Promise.allSettled([fetchCatalog(hass), fetchChatOptions(hass), fetchNotifyTargets(hass)]);
    if (!current()) return;
    if (catalog.status === "fulfilled") this._entities = catalog.value.entities.filter((entity) => !entity.disabled);
    if (options.status === "fulfilled") { this._providers = options.value.providers; if (!this._providerId) this._providerId = options.value.providers[0]?.connection_id ?? ""; }
    if (targets.status === "fulfilled") this._targets = targets.value;
  }

  private _matches(query: string): CatalogEntity[] {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return this._entities.filter((entity) => entity.entity_id.includes(needle) || (entity.name ?? "").toLowerCase().includes(needle)).slice(0, MAX_MATCHES);
  }

  private _touch(): void { this._error = ""; this._saved = false; }

  /** Problems that would make the backend reject the document; static, field-level. */
  public problems(): string[] {
    const problems: string[] = [];
    if (!this._name.trim() || this._name.length > 128) problems.push("Give the workflow a name of up to 128 characters.");
    if (this._triggerKind === "state" && !ENTITY.test(this._triggerEntity)) problems.push("Choose a trigger entity.");
    if (this._triggerKind === "state" && (!this._toState.trim() || this._toState.length > 255)) problems.push("Enter the trigger's target state.");
    if (this._triggerKind === "time" && !TIME.test(this._atTime)) problems.push("Enter the trigger time as HH:MM.");
    for (const [index, condition] of this._conditions.entries()) {
      const label = `Condition ${index + 1}`;
      if (condition.kind === "time_window" && (!TIME.test(condition.after_time) || !TIME.test(condition.before_time))) problems.push(`${label}: both times must be HH:MM.`);
      if (condition.kind === "state" && (!ENTITY.test(condition.entity_id) || !condition.state.trim())) problems.push(`${label}: choose an entity and a state.`);
      if (condition.kind === "numeric_state" && (!ENTITY.test(condition.entity_id) || (!condition.above.trim() && !condition.below.trim()) || [condition.above, condition.below].some((value) => value.trim() && !Number.isFinite(Number(value))))) problems.push(`${label}: choose an entity and a finite bound.`);
    }
    if (this._steps.length === 0) problems.push("Add at least one step.");
    for (const [index, step] of this._steps.entries()) {
      const label = `Step ${index + 1}`;
      if ((step.kind === "ai_compose" || step.kind === "ai_classify" || step.kind === "ai_extract") && (!step.prompt.trim() || step.prompt.length > 4000)) problems.push(`${label}: enter a prompt of up to 4,000 characters.`);
      if (step.kind === "ai_classify") {
        const categories = this._categories(step.categories);
        if (categories.length < 2 || categories.length > 20 || new Set(categories).size !== categories.length || categories.some((c) => c.length > 64)) problems.push(`${label}: list two to twenty unique categories.`);
      }
      if (step.kind === "notify" && !this._targets.some((target) => target.reference === step.notify_service)) problems.push(`${label}: choose a notification target that Home Assistant has.`);
      if (step.kind === "ai_extract") {
        const fields = this._fields(step.fields);
        if (fields.length < 1 || fields.length > 10 || new Set(fields.map((f) => f.name)).size !== fields.length || fields.some((f) => !/^[a-z][a-z0-9_]{0,63}$/u.test(f.name) || !FIELD_TYPES.includes(f.type))) problems.push(`${label}: list one to ten fields as name:type (string, number or boolean).`);
      }
      if (step.kind === "branch") {
        const ids = this._stepIds();
        const sourceIndex = ids.indexOf(step.when_step_id);
        const source = sourceIndex >= 0 && sourceIndex < index ? this._steps[sourceIndex] : undefined;
        if (!source || source.kind !== "ai_classify") problems.push(`${label}: choose an earlier classify step to branch on.`);
        else if (!this._categories(source.categories).includes(step.when_category)) problems.push(`${label}: choose one of that step's categories.`);
      }
    }
    if (this._runMode === "execute" && this._steps.some((step) => step.kind === "ai_compose" || step.kind === "ai_classify" || step.kind === "ai_extract") && !this._providers.some((p) => p.connection_id === this._providerId)) problems.push("Execute mode with AI steps needs a local provider.");
    return problems;
  }

  private _categories(value: string): string[] { return value.split(",").map((item) => item.trim()).filter(Boolean); }
  /** `name:type` pairs, comma separated, e.g. `room:string, minutes_open:number`. */
  private _fields(value: string): { name: string; type: string }[] {
    return value.split(",").map((item) => item.trim()).filter(Boolean).map((item) => { const [name = "", type = "string"] = item.split(":").map((part) => part.trim()); return { name, type }; });
  }
  /** Step ids as the document will name them: stored ids are kept, new steps get kind-based ids. */
  private _stepIds(): string[] {
    const taken = new Set(this._steps.map((step) => step.id).filter((id): id is string => id !== undefined));
    const counts: Record<string, number> = {};
    return this._steps.map((step) => {
      if (step.id !== undefined) return step.id;
      const base = step.kind === "ai_compose" ? "compose" : step.kind === "ai_classify" ? "classify" : step.kind === "ai_extract" ? "extract" : step.kind === "branch" ? "gate" : "notify";
      let candidate: string;
      do { counts[base] = (counts[base] ?? 0) + 1; candidate = counts[base] === 1 ? base : `${base}_${counts[base]}`; } while (taken.has(candidate));
      taken.add(candidate);
      return candidate;
    });
  }
  /** Load a stored v1 document into the pickers when its shape is one the builder can represent. */
  private _loadDocument(json: string): void {
    this._touch(); this._notice = "";
    let doc: Record<string, unknown>;
    try { doc = JSON.parse(json) as Record<string, unknown>; } catch { this._notice = "That document is not valid JSON; use the JSON editor below."; return; }
    const triggers = Array.isArray(doc.triggers) ? (doc.triggers as Record<string, unknown>[]) : [];
    const conditions = Array.isArray(doc.conditions) ? (doc.conditions as Record<string, unknown>[]) : [];
    const steps = Array.isArray(doc.steps) ? (doc.steps as Record<string, unknown>[]) : [];
    const trigger = triggers[0];
    const representable = typeof doc.workflow_id === "string" && typeof doc.name === "string" && triggers.length === 1 && trigger !== undefined &&
      (trigger.kind === "manual" || trigger.kind === "time" || (trigger.kind === "state" && Array.isArray(trigger.entity_ids) && trigger.entity_ids.length === 1)) &&
      conditions.every((c) => ["time_window", "state", "numeric_state"].includes(c.kind as string)) &&
      steps.every((s) => ["ai_compose", "ai_classify", "ai_extract", "branch", "notify"].includes(s.kind as string) && typeof s.step_id === "string" && STEP_ID.test(s.step_id));
    if (!representable) { this._notice = "This workflow uses a shape the builder cannot show (for example several triggers); use the JSON editor below."; return; }
    this._workflowId = doc.workflow_id as string; this._editing = true;
    this._name = doc.name as string; this._enabled = doc.enabled === true; this._runMode = doc.run_mode === "execute" ? "execute" : "observe";
    if (typeof doc.provider_connection_id === "string") this._providerId = doc.provider_connection_id;
    this._triggerKind = trigger.kind as TriggerKind;
    this._triggerEntity = trigger.kind === "state" ? String((trigger.entity_ids as string[])[0]) : "";
    this._toState = trigger.kind === "state" ? String(trigger.to_state ?? "on") : "on";
    this._atTime = trigger.kind === "time" ? String(trigger.at_time ?? "") : "";
    this._conditions = conditions.map((c): ConditionDraft => c.kind === "time_window"
      ? { kind: "time_window", after_time: String(c.after_time ?? ""), before_time: String(c.before_time ?? "") }
      : c.kind === "state" ? { kind: "state", entity_id: String(c.entity_id ?? ""), state: String(c.state ?? "") }
      : { kind: "numeric_state", entity_id: String(c.entity_id ?? ""), above: c.above === undefined ? "" : String(c.above), below: c.below === undefined ? "" : String(c.below) });
    this._steps = steps.map((s): StepDraft => {
      const id = s.step_id as string;
      if (s.kind === "ai_compose") return { id, kind: "ai_compose", prompt: String(s.prompt ?? "") };
      if (s.kind === "ai_classify") return { id, kind: "ai_classify", prompt: String(s.prompt ?? ""), categories: (Array.isArray(s.categories) ? s.categories : []).join(", ") };
      if (s.kind === "ai_extract") return { id, kind: "ai_extract", prompt: String(s.prompt ?? ""), fields: (Array.isArray(s.fields) ? (s.fields as Record<string, unknown>[]) : []).map((f) => `${String(f.name)}:${String(f.type)}`).join(", ") };
      if (s.kind === "branch") return { id, kind: "branch", when_step_id: String(s.when_step_id ?? ""), when_category: String(s.when_category ?? "") };
      return { id, kind: "notify", notify_service: String(s.notify_service ?? "") };
    });
  }
  private _move<T>(items: T[], index: number, delta: number): T[] {
    const target = index + delta;
    if (target < 0 || target >= items.length) return items;
    const next = [...items]; [next[index], next[target]] = [next[target]!, next[index]!]; return next;
  }

  /** The exact v1 document the backend validates; nothing is sent until an explicit action. */
  public document(): Record<string, unknown> {
    const triggers = this._triggerKind === "state"
      ? [{ kind: "state", entity_ids: [this._triggerEntity], to_state: this._toState }]
      : this._triggerKind === "time" ? [{ kind: "time", at_time: this._atTime }] : [{ kind: "manual" }];
    const conditions = this._conditions.map((condition) => {
      if (condition.kind === "time_window") return { kind: "time_window", after_time: condition.after_time, before_time: condition.before_time };
      if (condition.kind === "state") return { kind: "state", entity_id: condition.entity_id, state: condition.state };
      const numeric: Record<string, unknown> = { kind: "numeric_state", entity_id: condition.entity_id };
      if (condition.above.trim()) numeric.above = Number(condition.above);
      if (condition.below.trim()) numeric.below = Number(condition.below);
      return numeric;
    });
    const ids = this._stepIds();
    const steps = this._steps.map((step, index) => {
      const step_id = ids[index]!;
      if (step.kind === "ai_compose") return { step_id, kind: "ai_compose", prompt: step.prompt };
      if (step.kind === "ai_classify") return { step_id, kind: "ai_classify", prompt: step.prompt, categories: this._categories(step.categories) };
      if (step.kind === "ai_extract") return { step_id, kind: "ai_extract", prompt: step.prompt, fields: this._fields(step.fields) };
      if (step.kind === "branch") return { step_id, kind: "branch", when_step_id: step.when_step_id, when_category: step.when_category };
      return { step_id, kind: "notify", notify_service: step.notify_service };
    });
    const usesAi = this._steps.some((step) => step.kind === "ai_compose" || step.kind === "ai_classify" || step.kind === "ai_extract");
    return {
      schema_version: 1, workflow_id: this._workflowId, name: this._name.trim(), description: "", enabled: this._enabled,
      run_mode: this._runMode, provider_connection_id: this._runMode === "execute" && usesAi ? this._providerId : null,
      triggers, conditions, steps,
    };
  }

  private readonly _toEditor = (): void => {
    this._touch();
    this.dispatchEvent(new CustomEvent("workflow-draft", { bubbles: true, composed: true, detail: { json: JSON.stringify(this.document(), null, 2) } }));
  };

  private readonly _save = async (): Promise<void> => {
    const hass = this.hass;
    if (this._busy || !hass || hass.connection?.connected === false || this.problems().length > 0) return;
    this._touch(); this._busy = true; const sequence = this._sequence;
    const current = (): boolean => sequence === this._sequence && this.isConnected && this.hass?.callWS === hass.callWS && this.hass?.user?.id === hass.user?.id;
    try {
      await saveWorkflow(hass, JSON.stringify(this.document()));
      if (!current()) return;
      this._saved = true;
      this.dispatchEvent(new CustomEvent("workflow-saved", { bubbles: true, composed: true }));
    } catch (error: unknown) {
      if (!current()) return;
      const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
      const detail = code === "invalid_workflow" && typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" && error.message.length <= 160 ? ` ${error.message}` : "";
      this._error = (SAVE_MESSAGES[code] ?? "The workflow could not be saved. Check administrator access and the installed integration version.") + detail;
    } finally { if (current()) this._busy = false; }
  };

  private readonly _startNew = (): void => {
    this._workflowId = newRequestId(); this._touch(); this._editing = false; this._notice = "";
    this._name = ""; this._enabled = false; this._runMode = "observe"; this._triggerKind = "state"; this._triggerEntity = ""; this._toState = "on"; this._atTime = "";
    this._conditions = []; this._steps = [{ kind: "ai_compose", prompt: "Write a short, friendly household reminder about this event." }, { kind: "notify", notify_service: "" }];
  };

  protected override render(): TemplateResult {
    const problems = this.problems();
    const offline = !this.hass || this.hass.connection?.connected === false;
    return html`<section aria-labelledby="builder-title">
      <h1 id="builder-title">${this._editing ? "Edit a workflow" : "Build a workflow"}</h1>
      ${this._notice ? html`<p class="error" id="wb-notice">${this._notice}</p>` : nothing}
      ${this._editing ? html`<p id="wb-editing">Editing the stored workflow <code>${this._workflowId}</code>; saving replaces it and resets its live status.</p>` : nothing}
      <p>Assemble a workflow from what Home Assistant actually has: a trigger, optional deterministic conditions, AI steps, and a notification target. Nothing is sent until you save; a saved workflow only runs live when its mode is <strong>execute</strong> and it is enabled.</p>
      <fieldset><legend>Workflow</legend>
        <div class="row">
          <div><label for="wb-name">Name</label><input id="wb-name" maxlength="128" .value=${this._name} @input=${(e: Event) => { this._touch(); this._name = (e.target as HTMLInputElement).value; }} /></div>
          <div><label for="wb-mode">Mode</label>
            <select id="wb-mode" .value=${this._runMode} @change=${(e: Event) => { this._touch(); this._runMode = (e.target as HTMLSelectElement).value as "observe" | "execute"; }}>
              <option value="observe" ?selected=${this._runMode === "observe"}>Observe only (record outcomes)</option>
              <option value="execute" ?selected=${this._runMode === "execute"}>Execute (run AI steps and deliver)</option>
            </select></div>
          <div><label for="wb-provider">Local provider for AI steps</label>
            <select id="wb-provider" ?disabled=${this._providers.length === 0} .value=${this._providerId} @change=${(e: Event) => { this._touch(); this._providerId = (e.target as HTMLSelectElement).value; }}>
              ${this._providers.length === 0 ? html`<option value="">No local provider available</option>` : this._providers.map((p) => html`<option value=${p.connection_id} ?selected=${p.connection_id === this._providerId}>${p.title}</option>`)}
            </select></div>
        </div>
        <label class="check" for="wb-enabled"><input id="wb-enabled" type="checkbox" .checked=${this._enabled} @change=${(e: Event) => { this._touch(); this._enabled = (e.target as HTMLInputElement).checked; }} /> Enable after saving</label>
      </fieldset>
      <fieldset><legend>Trigger</legend>
        <label for="wb-trigger-kind">Kind</label>
        <select id="wb-trigger-kind" .value=${this._triggerKind} @change=${(e: Event) => { this._touch(); this._triggerKind = (e.target as HTMLSelectElement).value as TriggerKind; }}>
          <option value="state" ?selected=${this._triggerKind === "state"}>An entity changes to a state</option>
          <option value="time" ?selected=${this._triggerKind === "time"}>A time of day</option>
          <option value="manual" ?selected=${this._triggerKind === "manual"}>Manual only (Observe now)</option>
        </select>
        ${this._triggerKind === "state" ? html`<div class="row">
          <div>${this._renderEntityPicker("wb-trigger-entity", "Entity", this._triggerEntity, (value) => { this._triggerEntity = value; })}</div>
          <div><label for="wb-to-state">Changes to state</label><input id="wb-to-state" maxlength="255" .value=${this._toState} @input=${(e: Event) => { this._touch(); this._toState = (e.target as HTMLInputElement).value; }} /></div>
        </div>` : nothing}
        ${this._triggerKind === "time" ? html`<label for="wb-at-time">At (HH:MM, local)</label><input id="wb-at-time" placeholder="20:00" maxlength="5" .value=${this._atTime} @input=${(e: Event) => { this._touch(); this._atTime = (e.target as HTMLInputElement).value; }} />` : nothing}
      </fieldset>
      <fieldset><legend>Conditions (all must pass)</legend>
        ${this._conditions.map((condition, index) => this._renderCondition(condition, index))}
        <div class="actions">
          <button type="button" @click=${() => this._addCondition({ kind: "time_window", after_time: "18:00", before_time: "06:00" })}>Add time window</button>
          <button type="button" @click=${() => this._addCondition({ kind: "state", entity_id: "", state: "on" })}>Add entity state</button>
          <button type="button" @click=${() => this._addCondition({ kind: "numeric_state", entity_id: "", above: "", below: "" })}>Add numeric bound</button>
        </div>
      </fieldset>
      <fieldset><legend>Steps (in order)</legend>
        ${this._steps.map((step, index) => this._renderStep(step, index))}
        <div class="actions">
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({ kind: "ai_compose", prompt: "" })}>Add compose text</button>
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({ kind: "ai_classify", prompt: "", categories: "urgent, routine" })}>Add classify</button>
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({ kind: "ai_extract", prompt: "", fields: "room:string, needs_action:boolean" })}>Add extract values</button>
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({ kind: "branch", when_step_id: "", when_category: "" })}>Add branch</button>
          <button type="button" ?disabled=${this._steps.length >= 25} @click=${() => this._addStep({ kind: "notify", notify_service: "" })}>Add notification</button>
        </div>
      </fieldset>
      ${problems.length ? html`<ul class="error" id="wb-problems">${problems.map((problem) => html`<li>${problem}</li>`)}</ul>` : nothing}
      <div class="actions">
        <button class="primary" id="wb-save" type="button" ?disabled=${this._busy || offline || problems.length > 0} @click=${this._save}>${this._busy ? "Saving…" : "Save workflow"}</button>
        <button id="wb-to-editor" type="button" @click=${this._toEditor}>Open in JSON editor</button>
        <button type="button" @click=${this._startNew}>Start a new one</button>
      </div>
      <div role="status" aria-live="polite">${this._error ? html`<p class="error">${this._error}</p>` : nothing}${this._saved ? html`<p>Workflow saved. It appears in the stored workflows list below; enable it there or with the checkbox above before saving.</p>` : nothing}</div>
    </section>`;
  }

  private _renderEntityPicker(id: string, label: string, value: string, set: (value: string) => void): TemplateResult {
    const matches = this._matches(value);
    return html`<label for=${id}>${label}</label>
      <input id=${id} list="${id}-list" placeholder="Type to search entities" autocomplete="off" maxlength="255" .value=${value} @input=${(e: Event) => { this._touch(); set((e.target as HTMLInputElement).value); this.requestUpdate(); }} />
      <datalist id="${id}-list">${matches.map((entity) => html`<option value=${entity.entity_id}>${entity.name ?? entity.entity_id}</option>`)}</datalist>
      <p class="hint">${this._entities.length ? `${this._entities.length} entities in the catalogue` : "Catalogue unavailable; type an entity id"}${matches.length ? ` · ${matches.length} match(es)` : ""}</p>`;
  }

  private _addCondition(condition: ConditionDraft): void { if (this._conditions.length < 20) { this._touch(); this._conditions = [...this._conditions, condition]; } }
  private _addStep(step: StepDraft): void { this._touch(); this._steps = [...this._steps, step]; }
  private _updateCondition(index: number, patch: Partial<ConditionDraft>): void { this._touch(); this._conditions = this._conditions.map((c, i) => (i === index ? ({ ...c, ...patch } as ConditionDraft) : c)); }
  private _updateStep(index: number, patch: Partial<StepDraft>): void { this._touch(); this._steps = this._steps.map((s, i) => (i === index ? ({ ...s, ...patch } as StepDraft) : s)); }

  private _renderCondition(condition: ConditionDraft, index: number): TemplateResult {
    const remove = html`<span class="actions"><button type="button" ?disabled=${index === 0} @click=${() => { this._touch(); this._conditions = this._move(this._conditions, index, -1); }}>Move condition ${index + 1} up</button><button type="button" ?disabled=${index === this._conditions.length - 1} @click=${() => { this._touch(); this._conditions = this._move(this._conditions, index, 1); }}>Move condition ${index + 1} down</button><button type="button" @click=${() => { this._touch(); this._conditions = this._conditions.filter((_, i) => i !== index); }}>Remove condition ${index + 1}</button></span>`;
    if (condition.kind === "time_window") return html`<fieldset><legend>Condition ${index + 1}: time window</legend><div class="row">
      <div><label for="wb-c${index}-after">From (HH:MM)</label><input id="wb-c${index}-after" maxlength="5" .value=${condition.after_time} @input=${(e: Event) => this._updateCondition(index, { after_time: (e.target as HTMLInputElement).value })} /></div>
      <div><label for="wb-c${index}-before">Until (HH:MM, exclusive)</label><input id="wb-c${index}-before" maxlength="5" .value=${condition.before_time} @input=${(e: Event) => this._updateCondition(index, { before_time: (e.target as HTMLInputElement).value })} /></div></div>${remove}</fieldset>`;
    if (condition.kind === "state") return html`<fieldset><legend>Condition ${index + 1}: entity state</legend><div class="row">
      <div>${this._renderEntityPicker(`wb-c${index}-entity`, "Entity", condition.entity_id, (value) => this._updateCondition(index, { entity_id: value }))}</div>
      <div><label for="wb-c${index}-state">Is in state</label><input id="wb-c${index}-state" maxlength="255" .value=${condition.state} @input=${(e: Event) => this._updateCondition(index, { state: (e.target as HTMLInputElement).value })} /></div></div>${remove}</fieldset>`;
    return html`<fieldset><legend>Condition ${index + 1}: numeric bound</legend><div class="row">
      <div>${this._renderEntityPicker(`wb-c${index}-entity`, "Entity", condition.entity_id, (value) => this._updateCondition(index, { entity_id: value }))}</div>
      <div><label for="wb-c${index}-above">Above (exclusive)</label><input id="wb-c${index}-above" inputmode="decimal" .value=${condition.above} @input=${(e: Event) => this._updateCondition(index, { above: (e.target as HTMLInputElement).value })} /></div>
      <div><label for="wb-c${index}-below">Below (exclusive)</label><input id="wb-c${index}-below" inputmode="decimal" .value=${condition.below} @input=${(e: Event) => this._updateCondition(index, { below: (e.target as HTMLInputElement).value })} /></div></div>${remove}</fieldset>`;
  }

  private _renderStep(step: StepDraft, index: number): TemplateResult {
    const remove = html`<span class="actions"><button type="button" ?disabled=${index === 0} @click=${() => { this._touch(); this._steps = this._move(this._steps, index, -1); }}>Move step ${index + 1} up</button><button type="button" ?disabled=${index === this._steps.length - 1} @click=${() => { this._touch(); this._steps = this._move(this._steps, index, 1); }}>Move step ${index + 1} down</button><button type="button" @click=${() => { this._touch(); this._steps = this._steps.filter((_, i) => i !== index); }}>Remove step ${index + 1}</button></span>`;
    if (step.kind === "notify") return html`<fieldset><legend>Step ${index + 1}: send a notification</legend>
      <label for="wb-s${index}-target">Target (from Home Assistant)</label>
      <select id="wb-s${index}-target" .value=${step.notify_service} @change=${(e: Event) => this._updateStep(index, { notify_service: (e.target as HTMLSelectElement).value })}>
        <option value="" ?selected=${step.notify_service === ""}>Choose a target…</option>
        ${this._targets.map((target) => html`<option value=${target.reference} ?selected=${target.reference === step.notify_service}>${target.name} — ${target.reference} (${target.kind})</option>`)}
      </select>
      <p class="hint">The message is the text composed by the most recent compose step; the workflow name is the title.</p>${remove}</fieldset>`;
    if (step.kind === "branch") {
      const ids = this._stepIds();
      const sources = this._steps.map((s, i) => ({ s, i })).filter(({ s, i }) => s.kind === "ai_classify" && i < index);
      const source = sources.find(({ i }) => ids[i] === step.when_step_id)?.s;
      const categories = source && source.kind === "ai_classify" ? this._categories(source.categories) : [];
      return html`<fieldset><legend>Step ${index + 1}: branch — continue only when a classification matches</legend>
        <div class="row"><div><label for="wb-s${index}-when">Classify step</label>
        <select id="wb-s${index}-when" .value=${step.when_step_id} @change=${(e: Event) => this._updateStep(index, { when_step_id: (e.target as HTMLSelectElement).value, when_category: "" })}>
          <option value="" ?selected=${step.when_step_id === ""}>Choose an earlier classify step…</option>
          ${sources.map(({ i }) => html`<option value=${ids[i]!} ?selected=${ids[i] === step.when_step_id}>Step ${i + 1} (${ids[i]})</option>`)}
        </select></div>
        <div><label for="wb-s${index}-category">Continue when category is</label>
        <select id="wb-s${index}-category" ?disabled=${categories.length === 0} .value=${step.when_category} @change=${(e: Event) => this._updateStep(index, { when_category: (e.target as HTMLSelectElement).value })}>
          <option value="" ?selected=${step.when_category === ""}>Choose a category…</option>
          ${categories.map((category) => html`<option value=${category} ?selected=${category === step.when_category}>${category}</option>`)}
        </select></div></div>
        <p class="hint">If the category differs, every later step is skipped and the run still counts as completed.</p>${remove}</fieldset>`;
    }
    if (step.kind === "ai_extract") return html`<fieldset><legend>Step ${index + 1}: extract values with AI</legend>
      <label for="wb-s${index}-prompt">Prompt</label>
      <textarea id="wb-s${index}-prompt" maxlength="4000" .value=${step.prompt} @input=${(e: Event) => this._updateStep(index, { prompt: (e.target as HTMLTextAreaElement).value })}></textarea>
      <label for="wb-s${index}-fields">Fields (name:type, comma separated; types string, number, boolean)</label>
      <input id="wb-s${index}-fields" .value=${step.fields} @input=${(e: Event) => this._updateStep(index, { fields: (e.target as HTMLInputElement).value })} />
      <p class="hint">The model must return exactly these fields with these types; anything else fails the step.</p>${remove}</fieldset>`;
    return html`<fieldset><legend>Step ${index + 1}: ${step.kind === "ai_compose" ? "compose text with AI" : "classify with AI"}</legend>
      <label for="wb-s${index}-prompt">Prompt</label>
      <textarea id="wb-s${index}-prompt" maxlength="4000" .value=${step.prompt} @input=${(e: Event) => this._updateStep(index, { prompt: (e.target as HTMLTextAreaElement).value })}></textarea>
      ${step.kind === "ai_classify" ? html`<label for="wb-s${index}-categories">Categories (comma separated, 2–20)</label><input id="wb-s${index}-categories" .value=${step.categories} @input=${(e: Event) => this._updateStep(index, { categories: (e.target as HTMLInputElement).value })} />` : nothing}
      <p class="hint">The model receives only this prompt plus the event, time, and the states of entities named by your conditions.</p>${remove}</fieldset>`;
  }
}
customElements.define(WORKFLOW_BUILDER_TAG, WorkflowBuilderView);
