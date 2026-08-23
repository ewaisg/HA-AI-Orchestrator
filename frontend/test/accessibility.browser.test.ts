import * as axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import { type AiOrchestratorPanel, PANEL_TAG } from "../src/entry";
import { createFakeHass } from "./fixtures/fake-hass";

let mounted: AiOrchestratorPanel | undefined;

afterEach(() => {
  mounted?.remove();
  mounted = undefined;
});

describe("panel accessibility baseline", () => {
  it("has no serious or critical automated WCAG violations in the rendered shell", async () => {
    mounted = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
    mounted.hass = createFakeHass();
    document.body.append(mounted);
    await mounted.updateComplete;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await mounted.updateComplete;

    const results = await axe.run(
      { fromShadowDom: [PANEL_TAG, ".app-frame"] },
      {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      },
    );
    const stopShipViolations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(stopShipViolations, JSON.stringify(stopShipViolations, undefined, 2)).toEqual([]);
  });
});
