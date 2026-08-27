import { afterEach, describe, expect, it } from "vitest";

import { type CatalogView } from "../src/entry";
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

const mounted: CatalogView[] = [];

async function mountView(response: unknown): Promise<CatalogView> {
  const view = document.createElement("ai-orchestrator-catalog-view") as CatalogView;
  view.hass = createRoutedFakeHass({ "ai_orchestrator/catalog": response });
  document.body.append(view);
  mounted.push(view);
  await view.updateComplete;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  await view.updateComplete;
  return view;
}

function shadowText(view: CatalogView): string {
  return view.shadowRoot?.textContent?.replace(/\s+/gu, " ").trim() ?? "";
}

afterEach(() => {
  for (const view of mounted.splice(0)) view.remove();
});

describe("catalog view", () => {
  it("renders registry identity and read-only boundaries", async () => {
    const view = await mountView(CATALOG);

    expect(shadowText(view)).toContain("Areas (1)");
    expect(shadowText(view)).toContain("Kitchen");
    expect(shadowText(view)).toContain("Devices (1)");
    expect(shadowText(view)).toContain("Entities (1)");
    expect(shadowText(view)).toContain("Current state and actions are not included");
  });

  it("renders the empty registry state", async () => {
    const view = await mountView({ schema_version: 1, areas: [], devices: [], entities: [] });

    expect(shadowText(view)).toContain("No registry entries");
  });

  it("fails closed without rendering malformed response content", async () => {
    const view = await mountView({ schema_version: 1, areas: [], devices: [], entities: [], marker: "secret" });

    expect(shadowText(view)).toContain("Could not load the Home Assistant catalog");
    expect(shadowText(view)).not.toContain("secret");
  });
});