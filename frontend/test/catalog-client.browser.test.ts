import { describe, expect, it } from "vitest";

import { fetchCatalog, parseCatalogSnapshot } from "../src/api/catalog-client";
import { createFakeHass } from "./fixtures/fake-hass";

export const VALID_CATALOG = Object.freeze({
  schema_version: 1,
  areas: [{ area_id: "kitchen", name: "Kitchen" }],
  devices: [
    {
      device_id: "device123",
      name: "Kitchen window device",
      area_id: "kitchen",
      manufacturer: "Synthetic manufacturer",
      model: "Synthetic model",
      disabled: false,
    },
  ],
  entities: [
    {
      registry_id: "entity123",
      entity_id: "binary_sensor.kitchen_window",
      domain: "binary_sensor",
      platform: "synthetic",
      name: "Kitchen Window",
      device_id: "device123",
      area_id: "kitchen",
      area_source: "device",
      disabled: false,
      availability: "available",
    },
  ],
});

describe("registry catalogue client", () => {
  it("sends only the bounded list command and parses the exact contract", async () => {
    let request: Record<string, unknown> | undefined;
    const result = await fetchCatalog(
      createFakeHass(VALID_CATALOG, (message) => {
        request = message;
      }),
    );

    expect(request).toEqual({ type: "ai_orchestrator/catalog/list" });
    expect(result.entities[0]?.registry_id).toBe("entity123");
    expect(result.entities[0]?.availability).toBe("available");
  });

  it.each([
    undefined,
    null,
    {},
    { ...VALID_CATALOG, schema_version: 2 },
    { ...VALID_CATALOG, raw_states: [] },
    { ...VALID_CATALOG, entities: [{ ...VALID_CATALOG.entities[0], state: "on" }] },
    { ...VALID_CATALOG, entities: [{ ...VALID_CATALOG.entities[0], domain: "light" }] },
    { ...VALID_CATALOG, entities: [{ ...VALID_CATALOG.entities[0], availability: "on" }] },
    { ...VALID_CATALOG, entities: [{ ...VALID_CATALOG.entities[0], area_id: null }] },
    { ...VALID_CATALOG, devices: [{ ...VALID_CATALOG.devices[0], identifiers: [] }] },
    { ...VALID_CATALOG, areas: [{ area_id: "", name: "Kitchen" }] },
  ])("fails closed for malformed or expanded catalogue data", (response) => {
    expect(() => parseCatalogSnapshot(response)).toThrow();
  });
});
