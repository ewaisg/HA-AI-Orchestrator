import { describe, expect, it } from "vitest";

import {
  fetchProviderList,
  parseProviderList,
  parseProviderTestResult,
  testProviderConnection,
} from "../src/api/provider-client";
import { createFakeHass, createRoutedFakeHass } from "./fixtures/fake-hass";

const VALID_PROVIDER = Object.freeze({
  connection_id: "12345678-1234-4234-9234-123456789abc",
  provider_type: "lm_studio",
  display_name: "LM Studio",
  title: "LM Studio 12345678",
  health: "not_tested",
  last_tested_at: null,
});

const VALID_LIST_RESPONSE = Object.freeze({
  schema_version: 1,
  providers: [VALID_PROVIDER],
});

const VALID_TEST_SUCCESS = Object.freeze({
  schema_version: 1,
  connection_id: "12345678-1234-4234-9234-123456789abc",
  health: "healthy",
  error_code: null,
  last_tested_at: "2026-08-28T18:00:00+00:00",
});

const VALID_TEST_FAILURE = Object.freeze({
  schema_version: 1,
  connection_id: "12345678-1234-4234-9234-123456789abc",
  health: "authentication_required",
  error_code: "authentication",
  last_tested_at: "2026-08-28T18:01:00+00:00",
});

describe("provider list client", () => {
  it("sends the correct list request and parses the response", async () => {
    let capturedRequest: Record<string, unknown> | undefined;
    const response = await fetchProviderList(
      createFakeHass(VALID_LIST_RESPONSE, (message) => {
        capturedRequest = message;
      }),
    );

    expect(capturedRequest).toEqual({ type: "ai_orchestrator/providers/list" });
    expect(response.providers).toHaveLength(1);
    const first = response.providers[0]!;
    expect(first.connection_id).toBe(VALID_PROVIDER.connection_id);
    expect(first.provider_type).toBe("lm_studio");
    expect(first.display_name).toBe("LM Studio");
  });

  it("returns empty array for no providers", () => {
    const result = parseProviderList({ schema_version: 1, providers: [] });
    expect(result.providers).toHaveLength(0);
  });

  it.each([
    undefined,
    null,
    {},
    { providers: "not-array" },
    { schema_version: 2, providers: [] },
    { schema_version: 1, providers: [{ connection_id: 123 }] },
    { schema_version: 1, providers: [{ ...VALID_PROVIDER, connection_id: undefined }] },
    { schema_version: 1, providers: [{ ...VALID_PROVIDER, health: "loaded" }] },
    { schema_version: 1, providers: [{ ...VALID_PROVIDER, health: "healthy" }] },
    { schema_version: 1, providers: [{ ...VALID_PROVIDER, last_tested_at: "yesterday" }] },
    { schema_version: 1, providers: [{ ...VALID_PROVIDER, credential: "must-reject" }] },
    { schema_version: 1, providers: [], unexpected: true },
  ])("rejects invalid list response", (response) => {
    expect(() => parseProviderList(response)).toThrow();
  });
});

describe("provider test client", () => {
  it("sends a test request with the connection ID", async () => {
    let capturedRequest: Record<string, unknown> | undefined;
    const hass = createRoutedFakeHass(
      { "ai_orchestrator/providers/test": VALID_TEST_SUCCESS },
      (message) => {
        capturedRequest = message;
      },
    );

    const result = await testProviderConnection(
      hass,
      "12345678-1234-4234-9234-123456789abc",
    );

    expect(capturedRequest).toEqual({
      type: "ai_orchestrator/providers/test",
      connection_id: "12345678-1234-4234-9234-123456789abc",
    });
    expect(result.health).toBe("healthy");
    expect(result.error_code).toBeNull();
  });

  it("parses a failed test result with error code", () => {
    const result = parseProviderTestResult(VALID_TEST_FAILURE);
    expect(result.health).toBe("authentication_required");
    expect(result.error_code).toBe("authentication");
  });

  it.each([
    undefined,
    null,
    {},
    { ...VALID_TEST_SUCCESS, schema_version: 2 },
    { ...VALID_TEST_SUCCESS, connection_id: "x" },
    { ...VALID_TEST_SUCCESS, health: "loaded" },
    { ...VALID_TEST_SUCCESS, error_code: "authentication" },
    { ...VALID_TEST_SUCCESS, last_tested_at: null },
    { ...VALID_TEST_FAILURE, error_code: null },
    { ...VALID_TEST_FAILURE, error_code: "raw-provider-secret" },
    { ...VALID_TEST_SUCCESS, unexpected: true },
  ])("rejects invalid test response", (response) => {
    expect(() => parseProviderTestResult(response)).toThrow();
  });

  it("rejects a response for a different connection", () => {
    expect(() =>
      parseProviderTestResult(
        VALID_TEST_SUCCESS,
        "00000000-0000-4000-8000-000000000020",
      ),
    ).toThrow();
  });
});
