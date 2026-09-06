import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";

import {
  CHAT_LIMITS, fetchChatOptions, prepareChatMessages, sendChat,
  type ChatMessage, type ChatOptions,
} from "../api/chat-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

export const CHAT_VIEW_TAG = "ai-orchestrator-chat-view";

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  unauthorized: "Administrator access is required for chat.",
  chat_busy: "A request is still running. Wait a moment, then send again.",
  chat_duplicate_request: "This request was already submitted. Start a new request to retry.",
  chat_provider_unavailable: "This local provider is no longer available. Refresh providers and select a connection.",
  chat_authentication: "Provider authentication failed. Update its credentials in Home Assistant.",
  chat_timeout: "The provider took too long to reply. Your message is ready to try again.",
  chat_invalid_response: "The provider did not return a valid text-only reply. Try a shorter request.",
  chat_connection: "Home Assistant could not reach the local provider.",
  chat_not_found: "The configured model is not available. Check provider settings.",
  chat_unsupported: "This provider does not support the requested text generation.",
};

export class ChatView extends LitElement {
  public static override properties = {
    hass: { attribute: false },
    _options: { state: true }, _connectionId: { state: true }, _draft: { state: true },
    _history: { state: true }, _busy: { state: true }, _loading: { state: true },
    _error: { state: true }, _notice: { state: true }, _pendingPrompt: { state: true },
  };

  public static override styles = css`
    :host { display:block; color:var(--primary-text-color,#233642); font:inherit; block-size:100%; min-block-size:0; }
    * { box-sizing:border-box; }

    /* App-shell layout: only .transcript scrolls; header/controls/compose stay fixed. */
    .chat {
      display:flex; flex-direction:column; min-height:0;
      height:var(--ai-chat-height,100%);
      width:100%; max-width:var(--ai-chat-max-width,860px); margin-inline:auto;
    }
    .chat > .transcript { flex:1 1 auto; min-height:0; }
    .chat > header, .chat > .controls, .chat > .privacy,
    .chat > .error, .chat > .notice, .chat > .compose, .chat > .setup-hint { flex:0 0 auto; }

    header { margin:0 0 12px; }
    .eyebrow { margin:0; color:var(--secondary-text-color,#4b626d); text-transform:uppercase; font-size:11px; letter-spacing:.14em; font-weight:700; }
    h1 { font-size:clamp(20px,2.4vw,26px); letter-spacing:-.02em; margin:4px 0 0; }
    h2 { font-size:18px; margin:0 0 6px; }
    p { line-height:1.6; }
    .intro { display:none; }

    .controls { display:flex; flex-wrap:wrap; align-items:end; gap:10px; padding:10px 12px; background:var(--card-background-color,#fff); border:1px solid var(--divider-color,#ccd9da); border-radius:12px; }
    .provider { flex:1; min-width:0; }
    label { display:block; font-weight:600; margin-bottom:5px; font-size:12px; color:var(--secondary-text-color,#4b626d); }
    select,textarea { width:100%; max-width:100%; min-width:0; color:inherit; background:var(--card-background-color,#fff); border:1px solid #7d969c; border-radius:9px; font:inherit; padding:9px 10px; }
    select { text-overflow:ellipsis; }
    textarea { resize:none; min-height:52px; max-height:34vh; line-height:1.5; overflow:auto; }
    button,a { font:inherit; }
    button { cursor:pointer; min-height:40px; border-radius:9px; padding:8px 14px; border:1px solid #7d969c; color:inherit; background:var(--card-background-color,#fff); font-weight:600; }
    button.primary { background:#175e56; color:#fff; border-color:#175e56; }
    button:disabled { opacity:.55; cursor:default; }
    button:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible { outline:3px solid #207e73; outline-offset:3px; }
    a { color:#175e56; }

    .privacy { padding:6px 2px; color:var(--secondary-text-color,#4b626d); font-size:12px; line-height:1.55; }
    .privacy strong { color:var(--primary-text-color,#233642); font-weight:600; }
    .privacy > summary { cursor:pointer; list-style:revert; padding:2px 0; }
    .privacy > summary:focus-visible { outline:3px solid #207e73; outline-offset:3px; border-radius:6px; }
    .privacy-detail { padding:6px 0 2px 2px; }
    .setup-hint { margin:0 0 8px; }

    .transcript { overflow-y:auto; overflow-x:hidden; padding:8px 2px; overscroll-behavior:contain; scrollbar-width:thin; }
    .empty { text-align:center; padding:28px 18px; color:var(--secondary-text-color,#4b626d); }

    .message { border-radius:14px; padding:12px 14px; margin:0 0 10px; border:1px solid var(--divider-color,#ccd9da); background:var(--card-background-color,#fff); overflow-wrap:anywhere; max-width:88%; }
    .message.user { margin-left:auto; border-left:3px solid #207e73; }
    .message.assistant { margin-right:auto; }
    .message strong { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--secondary-text-color,#4b626d); }
    .message p { white-space:pre-wrap; margin:6px 0 0; }
    .pending { color:var(--secondary-text-color,#4b626d); margin:0 0 10px; font-size:13px; }
    .error { background:#fff2ee; color:#852e23; border:1px solid #d7a79d; border-radius:10px; padding:10px 14px; margin:8px 0; line-height:1.5; }
    .notice { color:var(--secondary-text-color,#4b626d); font-size:12px; line-height:1.5; margin:6px 0; }

    .compose { padding:10px 12px; background:var(--card-background-color,#fff); border:1px solid var(--divider-color,#ccd9da); border-radius:12px; }
    .compose label { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; }
    .compose-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; }
    .hint { font-size:11px; color:var(--secondary-text-color,#4b626d); }

    @media(max-width:900px) {
      .chat { height:var(--ai-chat-height,100%); }
      h1 { font-size:20px; }
    }
    @media(max-width:480px) {
      .controls,.compose { padding:9px 10px; }
      .provider { flex-basis:100%; }
      .message { max-width:94%; }
      .privacy { font-size:11px; padding:6px 2px; }
      textarea { max-height:26vh; }
    }
  `;

  public declare hass?: HomeAssistantLike;
  private declare _options?: ChatOptions;
  private declare _connectionId: string;
  private declare _draft: string;
  private declare _history: ChatMessage[];
  private declare _busy: boolean;
  private declare _loading: boolean;
  private declare _error: string;
  private declare _notice: string;
  private declare _pendingPrompt: string;
  private _sequence = 0;
  private _loadSequence = 0;
  private _boundConnection?: HomeAssistantLike["connection"];
  private _userId?: string;
  private _hasLoaded = false;

  public constructor() {
    super();
    this._connectionId = "";
    this._draft = "";
    this._history = [];
    this._busy = false;
    this._loading = false;
    this._error = "";
    this._notice = "";
    this._pendingPrompt = "";
  }

  private readonly _onDisconnected = (): void => {
    this._reset();
    this._options = undefined;
    this._hasLoaded = false;
    this._error = "Home Assistant disconnected. Chat history was cleared. Reconnect and refresh providers.";
  };

  private readonly _onReady = (): void => { this._hasLoaded = true; void this._load(); };

  public override disconnectedCallback(): void {
    this._unbind();
    this._reset();
    this._hasLoaded = false;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has("hass")) return;
    if (this.hass === undefined) {
      this._unbind();
      this._reset();
      this._options = undefined;
      this._connectionId = "";
      this._hasLoaded = false;
      this._userId = undefined;
      return;
    }
    const sessionChanged = this._userId !== this.hass.user?.id || this._boundConnection !== this.hass.connection;
    if (sessionChanged) {
      this._unbind();
      this._reset();
      this._options = undefined;
      this._connectionId = "";
      this._hasLoaded = false;
      this._userId = this.hass.user?.id;
      this._boundConnection = this.hass.connection;
      this._boundConnection?.addEventListener("disconnected", this._onDisconnected);
      this._boundConnection?.addEventListener("ready", this._onReady);
    }
    if (!this._hasLoaded && this.hass.connection?.connected !== false) {
      this._hasLoaded = true;
      queueMicrotask(() => void this._load());
    }
  }

  private _unbind(): void {
    this._boundConnection?.removeEventListener("disconnected", this._onDisconnected);
    this._boundConnection?.removeEventListener("ready", this._onReady);
    this._boundConnection = undefined;
  }

  private _reset(): void {
    this._sequence += 1;
    this._loadSequence += 1;
    this._history = [];
    this._draft = "";
    this._pendingPrompt = "";
    this._busy = false;
    this._loading = false;
    this._error = "";
    this._notice = "";
  }

  private async _load(): Promise<void> {
    const hass = this.hass;
    if (hass === undefined || this._loading || !this.isConnected) return;
    const sequence = ++this._loadSequence;
    this._loading = true;
    this._error = "";
    try {
      const options = await fetchChatOptions(hass);
      if (sequence !== this._loadSequence || !this.isConnected) return;
      this._options = options;
      if (!options.providers.some((p) => p.connection_id === this._connectionId)) {
        this._sequence += 1;
        this._history = [];
        this._draft = "";
        this._notice = "";
        this._connectionId = options.providers[0]?.connection_id ?? "";
      }
    } catch {
      if (sequence !== this._loadSequence || !this.isConnected) return;
      this._options = undefined;
      this._error = "Chat is unavailable. Check administrator access and install matching backend and panel files, then refresh providers.";
    } finally {
      if (sequence === this._loadSequence) this._loading = false;
    }
  }

  private async _send(event?: Event): Promise<void> {
    event?.preventDefault();
    const hass = this.hass;
    const prompt = this._draft.trim();
    const provider = this._options?.providers.find((p) => p.connection_id === this._connectionId);
    if (hass === undefined || this._busy || this._loading || !provider || !prompt || prompt.length > CHAT_LIMITS.max_message_chars || this.hass?.connection?.connected === false) return;
    const prepared = prepareChatMessages(this._history, prompt);
    const sequence = ++this._sequence;
    const connectionId = this._connectionId;
    this._busy = true;
    this._pendingPrompt = prompt;
    this._error = "";
    this._notice = prepared.omitted ? "Earlier turns were left out to stay within the conversation limit." : "";
    try {
      const result = await sendChat(hass, connectionId, crypto.randomUUID(), prepared.messages);
      if (sequence !== this._sequence || !this.isConnected) return;
      this._history = [...prepared.messages, {role:"assistant", content:result.text}];
      this._draft = "";
      await this.updateComplete;
      const transcript = this.renderRoot.querySelector<HTMLElement>(".transcript");
      transcript?.scrollTo({top:transcript.scrollHeight});
    } catch (error: unknown) {
      if (sequence !== this._sequence || !this.isConnected) return;
      const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
      this._error = ERROR_MESSAGES[code] ?? "The reply could not be completed. Your message is ready to try again.";
    } finally {
      if (sequence === this._sequence) {
        this._busy = false;
        this._pendingPrompt = "";
        await this.updateComplete;
        this.renderRoot.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      }
    }
  }

  /** Size the compose box to its content, bounded by the CSS max-height. */
  private _autoGrow(field: HTMLTextAreaElement): void {
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }

  /** Keep the newest turn visible, like a normal chat client. */
  protected override updated(changed: PropertyValues): void {
    if (changed.has("_draft") && this._draft === "") {
      const field = this.shadowRoot?.querySelector<HTMLTextAreaElement>("textarea");
      if (field) field.style.height = "";
    }
    if (!changed.has("_history") && !changed.has("_busy")) return;
    const transcript = this.shadowRoot?.querySelector<HTMLElement>(".transcript");
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }

  protected override render(): TemplateResult {
    const provider = this._options?.providers.find((p) => p.connection_id === this._connectionId);
    return html`<div class="chat">
      <header><p class="eyebrow">Local AI · Read-only chat</p><h1>Talk to your local AI</h1>
        <p class="intro">Try a question, draft an announcement, or explore an idea.</p></header>
      <section class="controls" aria-label="Chat provider">
        <div class="provider"><label for="provider">Local provider</label>
          <select id="provider" .value=${this._connectionId} ?disabled=${this._busy || this._loading || !this._options?.providers.length}
            @change=${(event:Event) => { this._reset(); this._connectionId = (event.target as HTMLSelectElement).value; }}>
            ${!this._options?.providers.length ? html`<option value="">${this._loading ? "Loading providers…" : "No local provider available"}</option>` : nothing}
            ${this._options?.providers.map((p) => html`<option value=${p.connection_id}>${p.title}</option>`)}
          </select></div>
        <button type="button" ?disabled=${this._busy || this._loading} @click=${() => void this._load()}>Refresh providers</button>
        <button type="button" @click=${() => {const wasBusy = this._busy; this._reset(); if (wasBusy) this._notice = "Conversation cleared. The pending provider request may still finish; its reply will be discarded.";}}>New chat</button>
      </section>
      <details class="privacy">
        <summary><strong>Destination: ${provider ? `${provider.title} · Local` : "Choose a local provider"}</strong></summary>
        <div class="privacy-detail">
          Only messages in this conversation are sent when you press Send. No household context or device actions.
          History stays in this open chat view and clears when you leave. Replies arrive when complete; streaming is unavailable.
          ${provider ? html`<br>Generation is an explicit trial; this model's capabilities have not been verified.` : nothing}
        </div>
      </details>
      ${!this._loading && this._options?.providers.length === 0 ? html`<p class="setup-hint">Add a local connection in <a href="/config/integrations/integration/ai_orchestrator">provider settings</a>, then refresh providers.</p>` : nothing}
      <div class="transcript" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
        ${this._history.length === 0 && !this._busy ? html`<div class="empty"><h2>A fresh conversation</h2><p>For example: “Draft a friendly reminder to close a window.”<br>This chat can write the words; it cannot check or control devices.</p></div>` : nothing}
        ${this._history.map((m) => html`<article class="message ${m.role}"><strong>${m.role === "user" ? "You" : "AI reply"}</strong><p>${m.content}</p></article>`)}
        ${this._busy ? html`<article class="message user"><strong>You</strong><p>${this._pendingPrompt}</p></article><p class="pending" role="status">Waiting for your local provider…</p>` : nothing}
      </div>
      ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : nothing}
      ${this._notice ? html`<p class="notice" role="status">${this._notice}</p>` : nothing}
      <form class="compose" @submit=${(event:Event) => void this._send(event)}>
        <label for="message">Your message</label>
        <textarea id="message" rows="1" maxlength=${CHAT_LIMITS.max_message_chars} .value=${this._draft} ?disabled=${this._busy}
          placeholder="Ask your local AI…" aria-describedby="compose-hint"
          @input=${(event:Event) => {const field = event.target as HTMLTextAreaElement; this._draft = field.value; this._autoGrow(field);}}
          @keydown=${(event:KeyboardEvent) => {if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void this._send(event);}}></textarea>
        <div class="compose-footer"><span id="compose-hint" class="hint">${this._draft.length} / ${CHAT_LIMITS.max_message_chars} · Ctrl/⌘ + Enter to send</span>
          <button class="primary" type="submit" ?disabled=${this._busy || this._loading || !provider || !this._draft.trim()}>${this._busy ? "Waiting…" : "Send"}</button></div>
      </form>
    </div>`;
  }
}
