import { describe, expect, it } from "vitest";

import {
  fetchOrchestratorStatus,
  parseOrchestratorStatus,
  STATUS_REQUEST,
  StatusContractError,
} from "../src/api/status-client";
import { createFakeHass, FOUNDATION_STATUS } from "./fixtures/fake-hass";

describe("foundation status client", () => {
  it("sends only the authoritative status command", async () => {
    let capturedRequest: Record<string, unknown> | undefined;
    const status = await fetchOrchestratorStatus(
      createFakeHass(FOUNDATION_STATUS, (message) => {
        capturedRequest = message;
      }),
    );

    expect(capturedRequest).toEqual(STATUS_REQUEST);
    expect(status).toEqual(FOUNDATION_STATUS);
  });

  it("accepts a response with providers enabled", () => {
    const withProviders = {
      ...FOUNDATION_STATUS,
      features: { ...FOUNDATION_STATUS.features, providers: true },
    };
    const parsed = parseOrchestratorStatus(withProviders);
    expect(parsed.features.providers).toBe(true);
  });

  it.each([
    undefined,
    {},
    { ...FOUNDATION_STATUS, schema_version: 2 },
    { ...FOUNDATION_STATUS, phase: "unknown" },
    { ...FOUNDATION_STATUS, configured: "yes" },
    {
      ...FOUNDATION_STATUS,
      features: { ...FOUNDATION_STATUS.features, providers: "unknown" },
    },
    { ...FOUNDATION_STATUS, unexpected: "field" },
    {
      ...FOUNDATION_STATUS,
      features: { ...FOUNDATION_STATUS.features, unexpected: false },
    },
  ])("rejects an unsupported response instead of inferring readiness", (response) => {
    expect(() => parseOrchestratorStatus(response)).toThrow(StatusContractError);
  });
});
