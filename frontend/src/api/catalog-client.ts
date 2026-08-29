import type { HomeAssistantLike } from "../ha/hass-contract";

export const CATALOG_LIST_REQUEST = Object.freeze({
  type: "ai_orchestrator/catalog/list",
});

export const CATALOG_SCHEMA_VERSION = 1;

const AVAILABILITY_VALUES = ["available", "unavailable", "not_loaded"] as const;
const AREA_SOURCE_VALUES = ["entity", "device"] as const;
const MAX_CATALOG_ITEMS = 10_000;

export type EntityAvailability = (typeof AVAILABILITY_VALUES)[number];
export type AreaSource = (typeof AREA_SOURCE_VALUES)[number];

export interface CatalogArea {
  area_id: string;
  name: string;
}

export interface CatalogDevice {
  device_id: string;
  name: string | null;
  area_id: string | null;
  manufacturer: string | null;
  model: string | null;
  disabled: boolean;
}

export interface CatalogEntity {
  registry_id: string;
  entity_id: string;
  domain: string;
  platform: string;
  name: string | null;
  device_id: string | null;
  area_id: string | null;
  area_source: AreaSource | null;
  disabled: boolean;
  availability: EntityAvailability;
}

export interface CatalogSnapshot {
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
  return value === null || typeof value === "string";
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 255;
}

function parseAreas(value: unknown): CatalogArea[] {
  if (!Array.isArray(value) || value.length > MAX_CATALOG_ITEMS) {
    throw new Error("Invalid area catalogue");
  }
  return value.map((item) => {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ["area_id", "name"]) ||
      !isIdentifier(item.area_id) ||
      typeof item.name !== "string" ||
      item.name.trim() === ""
    ) {
      throw new Error("Invalid area entry");
    }
    return { area_id: item.area_id, name: item.name };
  });
}

function parseDevices(value: unknown): CatalogDevice[] {
  if (!Array.isArray(value) || value.length > MAX_CATALOG_ITEMS) {
    throw new Error("Invalid device catalogue");
  }
  return value.map((item) => {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, [
        "device_id",
        "name",
        "area_id",
        "manufacturer",
        "model",
        "disabled",
      ]) ||
      !isIdentifier(item.device_id) ||
      !isNullableString(item.name) ||
      (item.area_id !== null && !isIdentifier(item.area_id)) ||
      !isNullableString(item.manufacturer) ||
      !isNullableString(item.model) ||
      typeof item.disabled !== "boolean"
    ) {
      throw new Error("Invalid device entry");
    }
    return {
      device_id: item.device_id,
      name: item.name,
      area_id: item.area_id,
      manufacturer: item.manufacturer,
      model: item.model,
      disabled: item.disabled,
    };
  });
}

function parseEntities(value: unknown): CatalogEntity[] {
  if (!Array.isArray(value) || value.length > MAX_CATALOG_ITEMS) {
    throw new Error("Invalid entity catalogue");
  }
  return value.map((item) => {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, [
        "registry_id",
        "entity_id",
        "domain",
        "platform",
        "name",
        "device_id",
        "area_id",
        "area_source",
        "disabled",
        "availability",
      ]) ||
      !isIdentifier(item.registry_id) ||
      typeof item.entity_id !== "string" ||
      !/^[a-z0-9_]+\.[a-z0-9_]+$/u.test(item.entity_id) ||
      typeof item.domain !== "string" ||
      item.domain !== item.entity_id.split(".", 1)[0] ||
      !isIdentifier(item.platform) ||
      !isNullableString(item.name) ||
      (item.device_id !== null && !isIdentifier(item.device_id)) ||
      (item.area_id !== null && !isIdentifier(item.area_id)) ||
      (item.area_source !== null &&
        !(AREA_SOURCE_VALUES as readonly unknown[]).includes(item.area_source)) ||
      (item.area_source === null) !== (item.area_id === null) ||
      typeof item.disabled !== "boolean" ||
      !(AVAILABILITY_VALUES as readonly unknown[]).includes(item.availability)
    ) {
      throw new Error("Invalid entity entry");
    }
    return {
      registry_id: item.registry_id,
      entity_id: item.entity_id,
      domain: item.domain,
      platform: item.platform,
      name: item.name,
      device_id: item.device_id,
      area_id: item.area_id,
      area_source: item.area_source as AreaSource | null,
      disabled: item.disabled,
      availability: item.availability as EntityAvailability,
    };
  });
}

export function parseCatalogSnapshot(value: unknown): CatalogSnapshot {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "areas", "devices", "entities"]) ||
    value.schema_version !== CATALOG_SCHEMA_VERSION
  ) {
    throw new Error("Invalid catalogue response");
  }
  return {
    schema_version: CATALOG_SCHEMA_VERSION,
    areas: parseAreas(value.areas),
    devices: parseDevices(value.devices),
    entities: parseEntities(value.entities),
  };
}

export async function fetchCatalog(hass: HomeAssistantLike): Promise<CatalogSnapshot> {
  const response = await hass.callWS<unknown>({ ...CATALOG_LIST_REQUEST });
  return parseCatalogSnapshot(response);
}
