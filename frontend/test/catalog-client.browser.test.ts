import { describe, expect, it } from "vitest";

import {
  CATALOG_REQUEST,
  parseCatalog,
  fetchCatalog,
} from "../src/api/catalog-client";
import { createRoutedFakeHass } from "./fixtures/fake-hass";

const CATALOG = {
  schema_version: 1,
  areas: [{ area_id: "area-a", name: "Kitchen" }],
  devices: [{ device_id: "device-a", name: "Kitchen device", area_id: "area-a" }],
  entities: [
    {
      entity_id: "sensor.temperature",
      name: "Temperature",
      area_id: "area-a",
      device_id: "device-a",
      disabled: false,
    },
  ],
};

describe("catalog client", () => {
  it("accepts the exact read-only catalog contract", () => {
    expect(parseCatalog(CATALOG)).toEqual(CATALOG);
  });

  it.each([
    { ...CATALOG, extra: "not allowed" },
    { ...CATALOG, areas: [{ area_id: "area-a", name: "" }] },
    { ...CATALOG, entities: [{ ...CATALOG.entities[0], disabled: "false" }] },
  ])("rejects malformed catalog responses", (value) => {
    expect(() => parseCatalog(value)).toThrow("Invalid");
  });

  it("requests only the catalog command", async () => {
    const requests: Record<string, unknown>[] = [];
    const hass = createRoutedFakeHass({ "ai_orchestrator/catalog": CATALOG }, (message) => {
      requests.push(message);
    });

    await expect(fetchCatalog(hass)).resolves.toEqual(CATALOG);
    expect(requests).toEqual([CATALOG_REQUEST]);
  });
});