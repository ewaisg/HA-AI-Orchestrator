import { afterEach, describe, expect, it } from "vitest";

import {
  PROVIDERS_VIEW_TAG,
  type ProvidersView,
} from "../src/entry";
import {
  PROVIDER_MANAGEMENT_PATH,
} from "../src/panel/providers-view";
import { createFailingHass, createRoutedFakeHass } from "./fixtures/fake-hass";

const CONNECTION_ID = "12345678-1234-4234-9234-123456789abc";
const PROVIDER_LIST = Object.freeze({
  schema_version: 1,
  providers: [
    {
      connection_id: CONNECTION_ID,
      provider_type: "lm_studio",
      display_name: "LM Studio",
      title: "Local LM Studio",
      health: "healthy",
    },
  ],
});

const mounted: ProvidersView[] = [];

async function mountView(hass: ProvidersView["hass"]): Promise<ProvidersView> {
  const view = document.createElement(PROVIDERS_VIEW_TAG) as ProvidersView;
  view.hass = hass;
  document.body.append(view);
  mounted.push(view);
  await view.updateComplete;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  await view.updateComplete;
  return view;
}

function shadowText(view: ProvidersView): string {
  return view.shadowRoot?.textContent?.replace(/\s+/gu, " ").trim() ?? "";
}

afterEach(() => {
  for (const view of mounted.splice(0)) {
    view.remove();
  }
});

describe("provider setup and connection-test view", () => {
  it("shows the verified Home Assistant management path when no connection exists", async () => {
    const view = await mountView(
      createRoutedFakeHass({
        "ai_orchestrator/providers/list": { schema_version: 1, providers: [] },
      }),
    );

    expect(shadowText(view)).toContain("No provider connections");
    const link = view.shadowRoot?.querySelector<HTMLAnchorElement>("a.primary-link");
    expect(link?.getAttribute("href")).toBe(PROVIDER_MANAGEMENT_PATH);
    expect(link?.textContent).toContain("Add provider connection");
  });

  it("renders only bounded provider metadata and an explicit health label", async () => {
    const view = await mountView(
      createRoutedFakeHass({ "ai_orchestrator/providers/list": PROVIDER_LIST }),
    );

    expect(shadowText(view)).toContain("Local LM Studio");
    expect(shadowText(view)).toContain("Healthy");
    expect(shadowText(view)).toContain("Test connection");
    expect(shadowText(view)).not.toContain(CONNECTION_ID);
  });

  it("contacts the provider only after an explicit test click", async () => {
    const requests: Record<string, unknown>[] = [];
    const view = await mountView(
      createRoutedFakeHass(
        {
          "ai_orchestrator/providers/list": PROVIDER_LIST,
          "ai_orchestrator/providers/test": {
            schema_version: 1,
            connection_id: CONNECTION_ID,
            health: "healthy",
            error_code: null,
          },
        },
        (message) => requests.push(message),
      ),
    );

    expect(requests).toEqual([{ type: "ai_orchestrator/providers/list" }]);
    view.shadowRoot?.querySelector<HTMLButtonElement>("button.test-button")?.click();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await view.updateComplete;

    expect(requests).toEqual([
      { type: "ai_orchestrator/providers/list" },
      { type: "ai_orchestrator/providers/test", connection_id: CONNECTION_ID },
    ]);
    expect(shadowText(view)).toContain("Connection test passed");
  });

  it("renders a normalized authentication state without raw error content", async () => {
    const view = await mountView(
      createRoutedFakeHass({
        "ai_orchestrator/providers/list": PROVIDER_LIST,
        "ai_orchestrator/providers/test": {
          schema_version: 1,
          connection_id: CONNECTION_ID,
          health: "authentication_required",
          error_code: "authentication",
        },
      }),
    );

    view.shadowRoot?.querySelector<HTMLButtonElement>("button.test-button")?.click();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await view.updateComplete;

    expect(shadowText(view)).toContain("Authentication required");
    expect(shadowText(view)).toContain("Authentication failed");
  });

  it("fails closed for a malformed response and never renders its content", async () => {
    const marker = "raw-provider-secret-must-not-render";
    const view = await mountView(
      createRoutedFakeHass({
        "ai_orchestrator/providers/list": { ...PROVIDER_LIST, marker },
      }),
    );

    expect(shadowText(view)).toContain("Could not load provider connections");
    expect(shadowText(view)).not.toContain(marker);
  });

  it("shows a bounded retry state for Home Assistant transport failure", async () => {
    const marker = "transport-secret-must-not-render";
    const view = await mountView(createFailingHass(new Error(marker)));

    expect(shadowText(view)).toContain("Could not load provider connections");
    expect(shadowText(view)).not.toContain(marker);
  });
});
