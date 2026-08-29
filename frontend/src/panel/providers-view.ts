import { css, html, LitElement, nothing, type TemplateResult } from "lit";

import {
  fetchProviderList,
  testProviderConnection,
  type ProviderConnection,
  type ProviderHealth,
  type ProviderTestResult,
} from "../api/provider-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

type ViewState = "loading" | "ready" | "empty" | "error";
type TestState = "idle" | "checking";
type TestResult = ProviderTestResult | "transport_failure";

export const PROVIDER_MANAGEMENT_PATH = "/config/integrations/integration/ai_orchestrator";

const ERROR_LABELS: Record<string, string> = {
  authentication: "Authentication failed",
  authorization: "Authorization denied",
  not_found: "Model not found",
  rate_limited: "Rate limited",
  provider_unavailable: "Provider unavailable",
  timeout: "Connection timed out",
  connection: "Connection failed",
  tls: "TLS error",
  dns: "DNS resolution failed",
  context_overflow: "Context limit exceeded",
  safety_refusal: "Provider refused the request",
  invalid_response: "Provider returned an invalid response",
  cancelled: "Connection test cancelled",
  unsupported: "Connection test unsupported",
  unknown: "Test failed",
};

const HEALTH_LABELS: Record<ProviderHealth, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  unavailable: "Unavailable",
  authentication_required: "Authentication required",
  not_tested: "Not tested",
};

export class ProvidersView extends LitElement {
  public static override properties = {
    hass: { attribute: false },
    _viewState: { state: true },
    _providers: { state: true },
    _testStates: { state: true },
    _testResults: { state: true },
  };

  public static override styles = css`
    :host {
      display: block;
    }

    .provider-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .provider-card {
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .provider-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .provider-name {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.3;
      color: var(--primary-text-color, #212121);
    }

    .provider-type {
      font-size: 0.8rem;
      color: var(--secondary-text-color, #727272);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .state-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }

    .state-badge.healthy {
      border: 1px solid var(--success-color, #2e7d32);
      color: var(--success-color, #2e7d32);
    }

    .state-badge.degraded,
    .state-badge.not_tested {
      border: 1px solid var(--warning-color, #8a5a00);
      color: var(--warning-color, #8a5a00);
    }

    .state-badge.unavailable,
    .state-badge.authentication_required {
      border: 1px solid var(--error-color, #b42318);
      color: var(--error-color, #b42318);
    }

    .provider-meta {
      font-size: 0.85rem;
      color: var(--secondary-text-color, #727272);
      margin: 0;
    }

    .provider-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .test-button {
      font-size: 0.85rem;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: transparent;
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      transition: background 0.15s;
    }

    .test-button:hover:not(:disabled) {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .test-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .test-result {
      font-size: 0.8rem;
      font-weight: 500;
    }

    .test-result.healthy {
      color: var(--success-color, #4caf50);
    }

    .test-result.unavailable,
    .test-result.authentication_required {
      color: #8a1c12;
    }

    .test-result.checking,
    .test-result.degraded,
    .test-result.not_tested {
      color: var(--secondary-text-color, #727272);
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--primary-text-color, #212121);
    }

    .empty-state h3 {
      font-size: 1.1rem;
      margin: 0 0 8px;
      color: var(--primary-text-color, #212121);
    }

    .empty-state p {
      margin: 0;
      max-width: 400px;
      margin-inline: auto;
    }

    .error-state {
      text-align: center;
      padding: 32px 24px;
      color: var(--primary-text-color, #212121);
    }

    .primary-link,
    .refresh-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      background: var(--orchestrator-accent-strong, #07514d);
      color: #fff;
      cursor: pointer;
      margin-top: 12px;
      text-decoration: none;
    }

    .primary-link:hover,
    .refresh-button:hover {
      opacity: 0.9;
    }

    .provider-toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
  `;

  public declare hass?: HomeAssistantLike;

  private declare _viewState: ViewState;
  private declare _providers: ProviderConnection[];
  private declare _testStates: Map<string, TestState>;
  private declare _testResults: Map<string, TestResult>;
  private _hasLoaded = false;
  private _loadScheduled = false;

  public constructor() {
    super();
    this._viewState = "loading";
    this._providers = [];
    this._testStates = new Map();
    this._testResults = new Map();
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    this._scheduleLoad();
  }

  protected override updated(): void {
    this._scheduleLoad();
  }

  protected override render(): TemplateResult {
    if (this._viewState === "loading") {
      return html`<div role="status" aria-label="Loading providers" aria-busy="true">
        Loading provider connections…
      </div>`;
    }

    if (this._viewState === "error") {
      return html`
        <div class="error-state">
          <p>Could not load provider connections.</p>
          <button class="refresh-button" type="button" @click=${this._loadProviders}>
            Retry
          </button>
        </div>
      `;
    }

    if (this._viewState === "empty") {
      return html`
        <div class="empty-state">
          <h3>No provider connections</h3>
          <p>
            Add a provider through Home Assistant's AI Orchestrator integration page.
            Credentials stay in the backend config flow and never return to this panel.
          </p>
          <a class="primary-link" href=${PROVIDER_MANAGEMENT_PATH}>Add provider connection</a>
        </div>
      `;
    }

    return html`
      <div class="provider-toolbar">
        <a class="primary-link" href=${PROVIDER_MANAGEMENT_PATH}>Manage provider connections</a>
      </div>
      <div class="provider-grid" role="list" aria-label="Provider connections">
        ${this._providers.map((provider) => this._renderProviderCard(provider))}
      </div>
    `;
  }

  private _renderProviderCard(provider: ProviderConnection): TemplateResult {
    const testState = this._testStates.get(provider.connection_id) ?? "idle";
    const testResult = this._testResults.get(provider.connection_id);
    const health =
      testResult === "transport_failure"
        ? "unavailable"
        : (testResult?.health ?? provider.health);
    const lastTestedAt =
      testResult === "transport_failure"
        ? provider.last_tested_at
        : (testResult?.last_tested_at ?? provider.last_tested_at);

    return html`
      <article class="provider-card" role="listitem">
        <div class="provider-card-header">
          <div>
            <h3 class="provider-name">${provider.title}</h3>
            <span class="provider-type">${provider.display_name}</span>
          </div>
          <span class="state-badge ${health}">${HEALTH_LABELS[health]}</span>
        </div>
        <p class="provider-meta">Local provider · ${provider.provider_type}</p>
        <p class="provider-meta">
          ${lastTestedAt
            ? `Last tested ${new Date(lastTestedAt).toLocaleString()}`
            : "Not tested in this Home Assistant runtime"}
        </p>
        <div class="provider-actions">
          <button
            class="test-button"
            type="button"
            ?disabled=${testState === "checking"}
            @click=${() => this._testConnection(provider.connection_id)}
          >
            ${testState === "checking" ? "Testing…" : "Test connection"}
          </button>
          ${this._renderTestResult(testState, testResult)}
        </div>
      </article>
    `;
  }

  private _renderTestResult(
    testState: TestState,
    testResult: TestResult | undefined,
  ): TemplateResult | typeof nothing {
    if (testState === "checking") {
      return html`<span class="test-result checking" role="status" aria-live="polite">
        Checking…
      </span>`;
    }
    if (testResult === "transport_failure") {
      return html`<span class="test-result unavailable" role="status" aria-live="polite">
        Test failed
      </span>`;
    }
    if (testResult?.health === "healthy") {
      return html`<span class="test-result healthy" role="status" aria-live="polite">
        Connection test passed
      </span>`;
    }
    if (testResult !== undefined) {
      const label = ERROR_LABELS[testResult.error_code ?? "unknown"] ?? "Test failed";
      return html`<span
        class="test-result ${testResult.health}"
        role="status"
        aria-live="polite"
      >${label}</span>`;
    }
    return nothing;
  }

  private readonly _loadProviders = async (): Promise<void> => {
    const hass = this.hass;
    if (hass === undefined) {
      return;
    }

    this._hasLoaded = true;
    this._viewState = "loading";

    try {
      const response = await fetchProviderList(hass);
      this._providers = response.providers;
      this._viewState = this._providers.length > 0 ? "ready" : "empty";
    } catch {
      this._viewState = "error";
      this._providers = [];
    }
  };

  private _scheduleLoad(): void {
    if (this.hass === undefined || this._hasLoaded || this._loadScheduled) {
      return;
    }
    this._loadScheduled = true;
    queueMicrotask(() => {
      this._loadScheduled = false;
      void this._loadProviders();
    });
  }

  private async _testConnection(connectionId: string): Promise<void> {
    const hass = this.hass;
    if (hass === undefined) {
      return;
    }

    this._testStates = new Map(this._testStates).set(connectionId, "checking");
    this.requestUpdate();

    try {
      const result = await testProviderConnection(hass, connectionId);
      const newStates = new Map(this._testStates);
      const newResults = new Map(this._testResults);
      newStates.set(connectionId, "idle");
      newResults.set(connectionId, result);
      this._testStates = newStates;
      this._testResults = newResults;
    } catch {
      this._testStates = new Map(this._testStates).set(connectionId, "idle");
      this._testResults = new Map(this._testResults).set(
        connectionId,
        "transport_failure",
      );
    }
  }
}
