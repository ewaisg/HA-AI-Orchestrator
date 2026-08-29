import { css, html, LitElement, type TemplateResult } from "lit";

import {
  fetchCatalog,
  type CatalogDevice,
  type CatalogEntity,
  type CatalogSnapshot,
} from "../api/catalog-client";
import type { HomeAssistantLike } from "../ha/hass-contract";

type ViewState = "loading" | "ready" | "empty" | "error";

export class CatalogView extends LitElement {
  public static override properties = {
    hass: { attribute: false },
    _state: { state: true },
    _catalog: { state: true },
    _query: { state: true },
  };

  public static override styles = css`
    :host { display: block; }
    .summary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
    .summary span, .permission {
      padding: 6px 10px; border: 1px solid var(--divider-color, #d7e0e0);
      border-radius: 999px; background: var(--card-background-color, #fff);
      font-size: 0.8rem; font-weight: 700;
    }
    .permission { color: var(--secondary-text-color, #526168); }
    .toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
    input {
      min-width: 0; flex: 1; min-height: 44px; padding: 9px 12px;
      border: 1px solid var(--divider-color, #d7e0e0); border-radius: 10px;
      background: var(--card-background-color, #fff); color: var(--primary-text-color, #172126);
      font: inherit;
    }
    button {
      min-height: 44px; padding: 9px 15px; border: 1px solid var(--divider-color, #d7e0e0);
      border-radius: 10px; background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #172126); cursor: pointer; font: inherit; font-weight: 700;
    }
    input:focus-visible, button:focus-visible { outline: 3px solid var(--primary-color, #0c6b66); outline-offset: 2px; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--divider-color, #d7e0e0); border-radius: 14px; }
    table { width: 100%; border-collapse: collapse; background: var(--card-background-color, #fff); }
    th, td { padding: 13px 14px; border-bottom: 1px solid var(--divider-color, #d7e0e0); text-align: left; vertical-align: top; }
    th { font-size: 0.76rem; color: var(--secondary-text-color, #526168); text-transform: uppercase; letter-spacing: 0.05em; }
    tr:last-child td { border-bottom: 0; }
    .name { font-weight: 750; }
    code, .detail { display: block; margin-top: 3px; color: var(--secondary-text-color, #526168); font-size: 0.8rem; }
    .state { font-weight: 700; font-size: 0.8rem; }
    .state.available { color: #0e6040; }
    .state.unavailable { color: var(--error-color, #b42318); }
    .state.not_loaded { color: #7a4a00; }
    .message { padding: 36px 20px; border: 1px solid var(--divider-color, #d7e0e0); border-radius: 14px; text-align: center; background: var(--card-background-color, #fff); }
    @media (max-width: 680px) {
      .toolbar { display: grid; }
      thead { display: none; }
      table, tbody, tr, td { display: block; width: 100%; }
      tr { padding: 12px 14px; border-bottom: 1px solid var(--divider-color, #d7e0e0); }
      tr:last-child { border-bottom: 0; }
      td { padding: 5px 0; border: 0; }
      td::before { content: attr(data-label); display: block; color: var(--secondary-text-color, #526168); font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
    }
  `;

  public declare hass?: HomeAssistantLike;
  private declare _state: ViewState;
  private declare _catalog?: CatalogSnapshot;
  private declare _query: string;
  private _hasLoaded = false;
  private _loadScheduled = false;

  public constructor() {
    super();
    this._state = "loading";
    this._query = "";
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    this._scheduleLoad();
  }

  protected override updated(): void {
    this._scheduleLoad();
  }

  protected override render(): TemplateResult {
    if (this._state === "loading") {
      return html`<div class="message" role="status" aria-busy="true">Reading Home Assistant registries…</div>`;
    }
    if (this._state === "error") {
      return html`<div class="message"><p>The registry catalogue could not be loaded.</p><button type="button" @click=${this._load}>Retry</button></div>`;
    }
    const catalog = this._catalog;
    if (catalog === undefined || this._state === "empty") {
      return html`<div class="message"><p>No registered entities are available.</p><button type="button" @click=${this._load}>Refresh</button></div>`;
    }
    const entities = this._filteredEntities(catalog);
    return html`
      <div class="summary" aria-label="Registry totals">
        <span>${catalog.entities.length} entities</span>
        <span>${catalog.devices.length} devices</span>
        <span>${catalog.areas.length} areas</span>
        <span>AI access: none</span>
      </div>
      <div class="toolbar">
        <input
          type="search"
          aria-label="Search entities"
          placeholder="Search name, entity ID, area, device, or integration"
          .value=${this._query}
          @input=${this._onSearch}
        />
        <button type="button" @click=${this._load}>Refresh registries</button>
      </div>
      ${entities.length === 0
        ? html`<div class="message" role="status">No entities match this search.</div>`
        : this._renderTable(catalog, entities)}
    `;
  }

  private _renderTable(catalog: CatalogSnapshot, entities: CatalogEntity[]): TemplateResult {
    const areas = new Map(catalog.areas.map((area) => [area.area_id, area.name]));
    const devices = new Map(catalog.devices.map((device) => [device.device_id, device]));
    return html`
      <div class="table-wrap">
        <table>
          <thead><tr><th>Entity</th><th>Area / device</th><th>Status</th><th>AI permission</th></tr></thead>
          <tbody>${entities.map((entity) => this._renderEntity(entity, areas, devices))}</tbody>
        </table>
      </div>
    `;
  }

  private _renderEntity(
    entity: CatalogEntity,
    areas: Map<string, string>,
    devices: Map<string, CatalogDevice>,
  ): TemplateResult {
    const area = entity.area_id === null ? "No area" : (areas.get(entity.area_id) ?? "Unresolved area");
    const device = entity.device_id === null ? undefined : devices.get(entity.device_id);
    const status = entity.disabled ? "Disabled" : entity.availability.replace("_", " ");
    return html`
      <tr>
        <td data-label="Entity"><span class="name">${entity.name ?? entity.entity_id}</span><code>${entity.entity_id}</code><span class="detail">${entity.platform}</span></td>
        <td data-label="Area / device"><span>${area}</span><span class="detail">${device?.name ?? (entity.device_id === null ? "No device" : "Unresolved device")}</span></td>
        <td data-label="Status"><span class="state ${entity.disabled ? "not_loaded" : entity.availability}">${status}</span></td>
        <td data-label="AI permission"><span class="permission">None</span></td>
      </tr>
    `;
  }

  private _filteredEntities(catalog: CatalogSnapshot): CatalogEntity[] {
    const query = this._query.trim().toLocaleLowerCase();
    if (query === "") return catalog.entities;
    const areas = new Map(catalog.areas.map((area) => [area.area_id, area.name]));
    const devices = new Map(catalog.devices.map((device) => [device.device_id, device.name]));
    return catalog.entities.filter((entity) =>
      [entity.entity_id, entity.name, entity.domain, entity.platform,
        entity.area_id === null ? null : areas.get(entity.area_id),
        entity.device_id === null ? null : devices.get(entity.device_id)]
        .some((value) => value?.toLocaleLowerCase().includes(query) === true),
    );
  }

  private readonly _onSearch = (event: Event): void => {
    this._query = (event.currentTarget as HTMLInputElement).value;
  };

  private readonly _load = async (): Promise<void> => {
    if (this.hass === undefined) return;
    this._hasLoaded = true;
    this._state = "loading";
    try {
      this._catalog = await fetchCatalog(this.hass);
      this._state = this._catalog.entities.length === 0 ? "empty" : "ready";
    } catch {
      this._catalog = undefined;
      this._state = "error";
    }
  };

  private _scheduleLoad(): void {
    if (this.hass === undefined || this._hasLoaded || this._loadScheduled) return;
    this._loadScheduled = true;
    queueMicrotask(() => {
      this._loadScheduled = false;
      void this._load();
    });
  }
}
