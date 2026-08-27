import type { HomeAssistantLike } from "../ha/hass-contract";

export const CATALOG_REQUEST = Object.freeze({ type: "ai_orchestrator/catalog" });
export const CATALOG_SCHEMA_VERSION = 1;

export interface CatalogArea {
  area_id: string;
  name: string;
}

export interface CatalogDevice {
  device_id: string;
  name: string;
  area_id: string | null;
}

export interface CatalogEntity {
  entity_id: string;
  name: string;
  area_id: string | null;
  device_id: string | null;
  disabled: boolean;
}

export interface CatalogResponse {
  schema_version: 1;
  areas: CatalogArea[];
  devices: CatalogDevice[];
  entities: CatalogEntity[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0);
}

export function parseCatalog(value: unknown): CatalogResponse {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "areas", "devices", "entities"]) ||
    value.schema_version !== CATALOG_SCHEMA_VERSION ||
    !Array.isArray(value.areas) ||
    !Array.isArray(value.devices) ||
    !Array.isArray(value.entities)
  ) {
    throw new Error("Invalid catalog response");
  }

  const areas: CatalogArea[] = [];
  for (const item of value.areas) {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ["area_id", "name"]) ||
      typeof item.area_id !== "string" ||
      item.area_id.length === 0 ||
      typeof item.name !== "string" ||
      item.name.trim() === ""
    ) {
      throw new Error("Invalid area in catalog response");
    }
    areas.push({ area_id: item.area_id, name: item.name });
  }

  const devices: CatalogDevice[] = [];
  for (const item of value.devices) {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ["device_id", "name", "area_id"]) ||
      typeof item.device_id !== "string" ||
      item.device_id.length === 0 ||
      typeof item.name !== "string" ||
      item.name.trim() === "" ||
      !isNullableString(item.area_id)
    ) {
      throw new Error("Invalid device in catalog response");
    }
    devices.push({ device_id: item.device_id, name: item.name, area_id: item.area_id });
  }

  const entities: CatalogEntity[] = [];
  for (const item of value.entities) {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ["entity_id", "name", "area_id", "device_id", "disabled"]) ||
      typeof item.entity_id !== "string" ||
      !/^[a-z0-9_]+\.[a-z0-9_]+$/u.test(item.entity_id) ||
      typeof item.name !== "string" ||
      item.name.trim() === "" ||
      !isNullableString(item.area_id) ||
      !isNullableString(item.device_id) ||
      typeof item.disabled !== "boolean"
    ) {
      throw new Error("Invalid entity in catalog response");
    }
    entities.push({
      entity_id: item.entity_id,
      name: item.name,
      area_id: item.area_id,
      device_id: item.device_id,
      disabled: item.disabled,
    });
  }

  return { schema_version: CATALOG_SCHEMA_VERSION, areas, devices, entities };
}

export async function fetchCatalog(hass: HomeAssistantLike): Promise<CatalogResponse> {
  return parseCatalog(await hass.callWS<unknown>({ ...CATALOG_REQUEST }));
}