import { afterEach, describe, expect, it } from "vitest";

import { CATALOG_VIEW_TAG, type CatalogView } from "../src/entry";
import { createFailingHass, createRoutedFakeHass } from "./fixtures/fake-hass";
import { VALID_CATALOG } from "./catalog-client.browser.test";

const mounted: CatalogView[] = [];

async function mountView(hass: CatalogView["hass"]): Promise<CatalogView> {
  const view = document.createElement(CATALOG_VIEW_TAG) as CatalogView;
  view.hass = hass;
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

describe("read-only registry catalogue view", () => {
  it("renders live metadata with explicit zero AI access", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mountView(
      createRoutedFakeHass(
        { "ai_orchestrator/catalog/list": VALID_CATALOG },
        (message) => requests.push(message),
      ),
    );

    expect(requests).toEqual([{ type: "ai_orchestrator/catalog/list" }]);
    expect(shadowText(view)).toContain("Kitchen Window");
    expect(shadowText(view)).toContain("binary_sensor.kitchen_window");
    expect(shadowText(view)).toContain("AI access: none");
    expect(shadowText(view)).toContain("None");
  });

  it("filters by live area and device metadata", async () => {
    const view = await mountView(
      createRoutedFakeHass({ "ai_orchestrator/catalog/list": VALID_CATALOG }),
    );
    const input = view.shadowRoot?.querySelector<HTMLInputElement>('input[type="search"]');
    expect(input).not.toBeNull();
    if (input === null || input === undefined) throw new Error("Search input missing");

    input.value = "Kitchen window device";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await view.updateComplete;
    expect(shadowText(view)).toContain("Kitchen Window");

    input.value = "No match marker";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await view.updateComplete;
    expect(shadowText(view)).toContain("No entities match this search");
  });

  it("fails closed without rendering malformed response content", async () => {
    const marker = "private-state-must-not-render";
    const view = await mountView(
      createRoutedFakeHass({
        "ai_orchestrator/catalog/list": { ...VALID_CATALOG, raw_state: marker },
      }),
    );
    expect(shadowText(view)).toContain("catalogue could not be loaded");
    expect(shadowText(view)).not.toContain(marker);
  });

  it("offers a bounded retry after transport failure", async () => {
    const marker = "transport-secret-must-not-render";
    const view = await mountView(createFailingHass(new Error(marker)));
    expect(shadowText(view)).toContain("catalogue could not be loaded");
    expect(shadowText(view)).not.toContain(marker);
    expect(view.shadowRoot?.querySelector("button")?.textContent).toContain("Retry");
  });
});
