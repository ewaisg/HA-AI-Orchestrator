import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";

import {
  fetchOrchestratorStatus,
  isAccessDeniedFailure,
  type OrchestratorStatus,
  STATUS_FEATURE_KEYS,
  StatusContractError,
  type StatusFeature,
} from "../api/status-client";
import type {
  HomeAssistantLike,
  HomeAssistantPanelInfo,
  HomeAssistantRoute,
} from "../ha/hass-contract";
import { panelStyles } from "../styles/panel-styles";

export const PANEL_TAG = "ai-orchestrator-panel";

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "automations", label: "Automations" },
  { id: "chat", label: "Chat" },
  { id: "providers", label: "Providers" },
  { id: "permissions", label: "Entities & Permissions" },
  { id: "voice", label: "Voice & Notifications" },
  { id: "activity", label: "Activity & Security" },
  { id: "settings", label: "Settings" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type LoadState = "waiting" | "loading" | "ready" | "denied" | "incompatible" | "error";

const FEATURE_LABELS: Record<StatusFeature, string> = {
  providers: "Provider connections",
  workflows: "Workflow runtime",
  conversation: "Conversation agent",
  ai_task: "AI Task entity",
};

const PLACEHOLDER_COPY: Record<Exclude<SectionId, "home">, { title: string; detail: string }> = {
  automations: {
    title: "Automation Studio is not active yet",
    detail:
      "The foundation build does not create, publish, or run workflows. The structured builder arrives only after its deterministic runtime and safety checks are proven.",
  },
  chat: {
    title: "Chat is not connected yet",
    detail:
      "Read-only chat follows a validated provider connection. This panel does not assume a provider, model, entity, or conversation history.",
  },
  providers: {
    title: "Provider setup is not enabled yet",
    detail:
      "No endpoint, credential, model identifier, or provider capability is assumed by this foundation shell.",
  },
  permissions: {
    title: "Entity permissions are not loaded yet",
    detail:
      "A later phase will read Home Assistant's live registries and start with no AI access. This shell contains no invented household entities or targets.",
  },
  voice: {
    title: "Voice and notification setup is not active yet",
    detail:
      "Only capabilities discovered from Home Assistant will appear here. Announcement output will never be presented as proof of voice-input support.",
  },
  activity: {
    title: "There is no execution activity to show",
    detail:
      "The foundation shell does not call AI providers or Home Assistant actions. Audit records appear only after their backend lifecycle and retention rules are implemented.",
  },
  settings: {
    title: "Settings are intentionally limited",
    detail:
      "Only the live integration status is available in Phase 0. Credential, privacy, retention, and cloud-routing controls are not simulated here.",
  },
};

function sectionFromRoute(route: HomeAssistantRoute | undefined): SectionId | undefined {
  const candidate = route?.path?.split("/").filter(Boolean).at(-1);
  return SECTIONS.find((section) => section.id === candidate)?.id;
}

export class AiOrchestratorPanel extends LitElement {
  public static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    route: { attribute: false },
    panel: { attribute: false },
    _activeSection: { state: true },
    _loadState: { state: true },
    _status: { state: true },
  };

  public static override styles = panelStyles;

  public declare hass?: HomeAssistantLike;
  public declare narrow: boolean;
  public declare route?: HomeAssistantRoute;
  public declare panel?: HomeAssistantPanelInfo;

  private declare _activeSection: SectionId;
  private declare _loadState: LoadState;
  private declare _status?: OrchestratorStatus;
  private _hasRequested = false;
  private _requestSequence = 0;

  public constructor() {
    super();
    this.narrow = false;
    this._activeSection = "home";
    this._loadState = "waiting";
  }

  public override disconnectedCallback(): void {
    this._requestSequence += 1;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("route")) {
      const routeSection = sectionFromRoute(this.route);
      if (routeSection !== undefined) {
        this._activeSection = routeSection;
      }
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("hass") && this.hass !== undefined && !this._hasRequested) {
      queueMicrotask(() => void this._refreshStatus());
    }
  }

  protected override render(): TemplateResult {
    return html`
      <div class="app-frame ${this.narrow ? "narrow" : ""}">
        ${this._renderSidebar()}
        <main class="workspace" id="main-content" tabindex="-1">
          <div class="workspace-inner">
            ${this._activeSection === "home"
              ? this._renderHome()
              : this._renderPlaceholder(this._activeSection)}
          </div>
        </main>
      </div>
    `;
  }

  private _renderSidebar(): TemplateResult {
    return html`
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">AI</span>
          <div class="brand-copy">
            <p class="brand-title">AI Orchestrator</p>
            <p class="brand-subtitle">Foundation preview</p>
          </div>
        </div>

        <nav class="section-nav" aria-label="AI Orchestrator sections">
          ${SECTIONS.map(
            (section) => html`
              <button
                class="nav-button"
                type="button"
                aria-current=${this._activeSection === section.id ? "page" : nothing}
                @click=${() => this._selectSection(section.id)}
              >
                <span class="nav-marker" aria-hidden="true"></span>
                <span>${section.label}</span>
              </button>
            `,
          )}
        </nav>

        <div class="sidebar-note">
          <strong>No provider calls</strong>
          This foundation panel reads one authenticated Home Assistant status command. It does not
          send household data to an AI service.
        </div>
      </aside>
    `;
  }

  private _renderHome(): TemplateResult {
    const heading = this._statusHeading();
    return html`
      <header class="page-header">
        <div>
          <p class="eyebrow">Private Home Assistant AI</p>
          <h1>Build from a verified foundation</h1>
          <p class="page-intro">
            This shell reports only what the installed integration confirms. Provider setup,
            entity access, workflows, chat, and actions stay unavailable until their evidence and
            safety gates pass.
          </p>
        </div>
        <span class="privacy-badge">Local status check only</span>
      </header>

      <section class="hero" aria-labelledby="foundation-status" aria-busy=${this._loadState === "loading"}>
        <div class="hero-copy" aria-live="polite">
          <p class="status-kicker">
            <span class="status-dot ${heading.tone}" aria-hidden="true"></span>
            ${heading.kicker}
          </p>
          <h2 id="foundation-status">${heading.title}</h2>
          <p class="hero-description">${heading.detail}</p>
          ${this._renderStatusAction()}
          ${this._loadState === "loading"
            ? html`<div class="loading-bar" role="progressbar" aria-label="Checking integration status"></div>`
            : nothing}
        </div>
        <div class="connection-summary" aria-label="Connection summary">
          <p class="summary-label">Home Assistant</p>
          <p class="summary-value">${this._connectionLabel()}</p>
          <p class="summary-detail">${this._connectionDetail()}</p>
          <div class="summary-rule"></div>
          <p class="summary-label">AI destination</p>
          <p class="summary-value">None contacted</p>
          <p class="summary-detail">This status request contains no entity state or prompt content.</p>
        </div>
      </section>

      <div class="content-grid">
        ${this._renderFeatureCard()} ${this._renderNextSteps()}
      </div>

      <div class="assurance">
        <span class="assurance-mark" aria-hidden="true">✓</span>
        <span>
          Home Assistant remains the authority for state and actions. This panel has no generic
          action executor, does not store browser secrets, and does not enable cloud failover.
        </span>
      </div>
    `;
  }

  private _renderFeatureCard(): TemplateResult {
    return html`
      <section class="card" aria-labelledby="feature-status-heading">
        <h2 id="feature-status-heading">Foundation capabilities</h2>
        <p class="card-intro">Values come from the versioned integration status response.</p>
        <ul class="status-list">
          ${STATUS_FEATURE_KEYS.map((feature) => {
            const confirmed = this._loadState === "ready";
            const enabled = confirmed && this._status?.features[feature] === true;
            const stateLabel = confirmed ? (enabled ? "Available" : "Not available") : "Unknown";
            return html`
              <li class="status-row">
                <span>
                  <span class="status-name">${FEATURE_LABELS[feature]}</span>
                  <span class="status-detail">${this._featureDetail(enabled)}</span>
                </span>
                <span class="state-pill ${confirmed ? (enabled ? "available" : "unavailable") : "unknown"}">
                  ${stateLabel}
                </span>
              </li>
            `;
          })}
        </ul>
      </section>
    `;
  }

  private _renderNextSteps(): TemplateResult {
    return html`
      <section class="card" aria-labelledby="next-steps-heading">
        <h2 id="next-steps-heading">What happens next</h2>
        <p class="card-intro">Each capability opens only after its own verification gate.</p>
        <ol class="next-list">
          <li>
            <strong>Confirm the panel lifecycle</strong>
            Load, reload, mobile layout, caching, and upgrade behavior must be tested on the target
            Home Assistant version.
          </li>
          <li>
            <strong>Connect a verified local provider</strong>
            Provider setup will require live endpoint, authentication, model, and capability evidence.
          </li>
          <li>
            <strong>Discover permissions from Home Assistant</strong>
            Entity and action choices will come from live registries and begin with no AI access.
          </li>
        </ol>
      </section>
    `;
  }

  private _renderPlaceholder(section: Exclude<SectionId, "home">): TemplateResult {
    const copy = PLACEHOLDER_COPY[section];
    const sectionLabel = SECTIONS.find((item) => item.id === section)?.label ?? "Section";
    return html`
      <header class="page-header">
        <div>
          <p class="eyebrow">${sectionLabel}</p>
          <h1>${sectionLabel}</h1>
        </div>
        <span class="phase-badge">Foundation preview</span>
      </header>
      <section class="placeholder" aria-labelledby="placeholder-title">
        <div class="placeholder-inner">
          <span class="phase-badge">Not enabled</span>
          <h2 id="placeholder-title">${copy.title}</h2>
          <p>${copy.detail}</p>
          <div class="hero-actions">
            <button class="secondary-button" type="button" @click=${() => this._selectSection("home")}>
              Return to foundation status
            </button>
          </div>
        </div>
      </section>
    `;
  }

  private _renderStatusAction(): TemplateResult | typeof nothing {
    if (this._loadState === "loading") {
      return nothing;
    }

    if (this._loadState === "ready" && this._status?.configured === false) {
      return html`
        <div class="hero-actions">
          <button class="secondary-button" type="button" @click=${this._refreshStatus}>
            Check again
          </button>
        </div>
      `;
    }

    if (["denied", "incompatible", "error"].includes(this._loadState)) {
      return html`
        <div class="hero-actions">
          <button class="primary-button" type="button" @click=${this._refreshStatus}>Retry status check</button>
        </div>
      `;
    }

    return nothing;
  }

  private _statusHeading(): { kicker: string; title: string; detail: string; tone: string } {
    if (this._loadState === "loading") {
      return {
        kicker: "Checking authenticated connection",
        title: "Reading the integration status",
        detail: "No provider or Home Assistant action is called during this check.",
        tone: "",
      };
    }

    if (this._loadState === "ready" && this._status?.configured === true) {
      return {
        kicker: "Foundation connection confirmed",
        title: "The integration is configured",
        detail:
          "Home Assistant returned the supported foundation status. Feature readiness remains limited to the explicit capability values below.",
        tone: "ready",
      };
    }

    if (this._loadState === "ready") {
      return {
        kicker: "Foundation connection confirmed",
        title: "Integration setup is not complete",
        detail:
          "Home Assistant answered successfully, but the integration reports that setup is not configured. No provider readiness is inferred.",
        tone: "warning",
      };
    }

    if (this._loadState === "denied") {
      return {
        kicker: "Access denied",
        title: "Administrator access is required",
        detail:
          "The status command was not available to this Home Assistant user. No action ran and no data was sent to an AI provider.",
        tone: "error",
      };
    }

    if (this._loadState === "incompatible") {
      return {
        kicker: "Compatibility check failed",
        title: "The status response is not supported",
        detail:
          "The panel did not accept an unknown response as healthy. No action ran and no data was sent to an AI provider.",
        tone: "error",
      };
    }

    if (this._loadState === "error") {
      return {
        kicker: "Status unavailable",
        title: "The integration status could not be read",
        detail:
          "The panel cannot confirm setup or feature readiness. No action ran and no data was sent to an AI provider.",
        tone: "error",
      };
    }

    return {
      kicker: "Waiting for Home Assistant",
      title: "The panel has not received a connection",
      detail: "No setup state or feature readiness is assumed while the Home Assistant connection is unavailable.",
      tone: "warning",
    };
  }

  private _connectionLabel(): string {
    if (this._loadState === "ready") {
      return "Authenticated status received";
    }
    if (this._loadState === "loading") {
      return "Checking";
    }
    if (this._loadState === "denied") {
      return "Access denied";
    }
    if (this._loadState === "incompatible") {
      return "Incompatible response";
    }
    return this._loadState === "error" ? "Unavailable" : "Waiting";
  }

  private _connectionDetail(): string {
    if (this._loadState === "ready") {
      return "The versioned ai_orchestrator/status command completed successfully.";
    }
    if (this._loadState === "loading") {
      return "A single authenticated WebSocket status command is in progress.";
    }
    return "Feature availability cannot be confirmed in this state.";
  }

  private _featureDetail(enabled: boolean): string {
    if (this._loadState !== "ready") {
      return "Status not confirmed";
    }
    return enabled ? "Reported by the integration" : "Reported unavailable by the integration";
  }

  private _selectSection(section: SectionId): void {
    this._activeSection = section;
  }

  private readonly _refreshStatus = async (): Promise<void> => {
    const hass = this.hass;
    if (hass === undefined) {
      this._loadState = "waiting";
      this._status = undefined;
      return;
    }

    this._hasRequested = true;
    this._loadState = "loading";
    this._status = undefined;
    const requestSequence = ++this._requestSequence;

    try {
      const status = await fetchOrchestratorStatus(hass);
      if (requestSequence !== this._requestSequence || !this.isConnected) {
        return;
      }
      this._status = status;
      this._loadState = "ready";
    } catch (error: unknown) {
      if (requestSequence !== this._requestSequence || !this.isConnected) {
        return;
      }
      this._status = undefined;
      this._loadState =
        error instanceof StatusContractError
          ? "incompatible"
          : isAccessDeniedFailure(error)
            ? "denied"
            : "error";
    }
  };
}
