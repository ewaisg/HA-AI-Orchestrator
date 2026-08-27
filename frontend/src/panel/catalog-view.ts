import { css, html, LitElement, nothing, type TemplateResult } from "lit";

import { fetchCatalog, type CatalogResponse } from "../api/catalog-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

type ViewState = "loading" | "ready" | "empty" | "error";

export class CatalogView extends LitElement {
  public static override properties = {
    hass: { attribute: false },
    _viewState: { state: true },
    _catalog: { state: true },
  };

  public static override styles = css`
    :host { display: block; }
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .refresh { border: 1px solid var(--divider-color, #d7e0e0); border-radius: 6px; padding: 8px 14px; background: transparent; color: var(--primary-text-color, #172126); cursor: pointer; }
    .summary { color: var(--secondary-text-color, #526168); margin: 0 0 16px; }
    .catalog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .catalog-card { background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #d7e0e0); border-radius: 8px; padding: 16px; }
    .catalog-card h2 { margin: 0 0 12px; font-size: 1rem; }
    .catalog-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .catalog-item { border-top: 1px solid var(--divider-color, #d7e0e0); padding-top: 8px; }
    .catalog-item strong, .catalog-item span { display: block; overflow-wrap: anywhere; }
    .catalog-item span { color: var(--secondary-text-color, #526168); font-size: .82rem; margin-top: 3px; }
    .disabled { color: var(--error-color, #b42318); }
    .empty, .error { padding: 28px; text-align: center; }
    .error button { margin-top: 12px; }
  `;

  public declare hass?: HomeAssistantLike;
  private declare _viewState: ViewState;
  private declare _catalog?: CatalogResponse;
  private _hasLoaded = false;
  private _loadScheduled = false;

  public constructor() {
    super();
    this._viewState = "loading";
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
      return html`<div role="status" aria-busy="true">Loading Home Assistant catalog…</div>`;
    }
    if (this._viewState === "error") {
      return html`<div class="error"><p>Could not load the Home Assistant catalog.</p><button class="refresh" type="button" @click=${this._loadCatalog}>Retry</button></div>`;
    }
    const catalog = this._catalog;
    if (catalog === undefined || (catalog.areas.length === 0 && catalog.devices.length === 0 && catalog.entities.length === 0)) {
      return html`<div class="empty"><h2>No registry entries</h2><p>Home Assistant returned no areas, devices, or entities.</p></div>`;
    }
    return html`
      <div class="toolbar"><button class="refresh" type="button" @click=${this._loadCatalog}>Refresh catalog</button></div>
      <p class="summary">Read-only registry catalog. Current state and actions are not included.</p>
      <div class="catalog-grid">
        ${this._renderList("Areas", catalog.areas.map((area) => ({ primary: area.name, secondary: area.area_id })))}
        ${this._renderList("Devices", catalog.devices.map((device) => ({ primary: device.name, secondary: device.area_id ?? "No area" })))}
        ${this._renderList("Entities", catalog.entities.map((entity) => ({ primary: entity.name, secondary: `${entity.entity_id}${entity.disabled ? " · Disabled" : ""}`, disabled: entity.disabled })))}
      </div>
    `;
  }

  private _renderList(title: string, items: { primary: string; secondary: string; disabled?: boolean }[]): TemplateResult {
    return html`<section class="catalog-card" aria-labelledby=${`${title.toLowerCase()}-heading`}><h2 id=${`${title.toLowerCase()}-heading`}>${title} (${items.length})</h2><ul class="catalog-list">${items.map((item) => html`<li class="catalog-item"><strong class=${item.disabled ? "disabled" : nothing}>${item.primary}</strong><span>${item.secondary}</span></li>`)}</ul></section>`;
  }

  private _scheduleLoad(): void {
    if (this.hass === undefined || this._hasLoaded || this._loadScheduled) return;
    this._loadScheduled = true;
    queueMicrotask(() => { this._loadScheduled = false; void this._loadCatalog(); });
  }

  private readonly _loadCatalog = async (): Promise<void> => {
    if (this.hass === undefined) return;
    this._hasLoaded = true;
    this._viewState = "loading";
    try {
      this._catalog = await fetchCatalog(this.hass);
      this._viewState = "ready";
    } catch {
      this._catalog = undefined;
      this._viewState = "error";
    }
  };
}