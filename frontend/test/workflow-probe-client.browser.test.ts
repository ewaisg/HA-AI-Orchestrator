import { describe, expect, it } from "vitest";

import {
  parseWorkflowProbeResult,
  runWorkflowProbe,
  WORKFLOW_PROBE_REQUEST,
  WorkflowProbeContractError,
} from "../src/api/workflow-probe-client";
import {
  createFakeHass,
  FOUNDATION_WORKFLOW_PROBE_RESULT,
} from "./fixtures/fake-hass";

describe("foundation workflow lifecycle probe client", () => {
  it("sends only the bounded probe command and accepts the exact response", async () => {
    let capturedRequest: Record<string, unknown> | undefined;
    const result = await runWorkflowProbe(
      createFakeHass(FOUNDATION_WORKFLOW_PROBE_RESULT, (message) => {
        capturedRequest = message;
      }),
    );

    expect(capturedRequest).toEqual(WORKFLOW_PROBE_REQUEST);
    expect(result).toEqual(FOUNDATION_WORKFLOW_PROBE_RESULT);
  });

  it.each([
    undefined,
    {},
    { ...FOUNDATION_WORKFLOW_PROBE_RESULT, schema_version: 2 },
    { ...FOUNDATION_WORKFLOW_PROBE_RESULT, execution_count: 0 },
    { ...FOUNDATION_WORKFLOW_PROBE_RESULT, executions_for_trigger: 2 },
    { ...FOUNDATION_WORKFLOW_PROBE_RESULT, registration_count: 0 },
    { ...FOUNDATION_WORKFLOW_PROBE_RESULT, provider_contacted: true },
    { ...FOUNDATION_WORKFLOW_PROBE_RESULT, home_assistant_action_called: true },
    { ...FOUNDATION_WORKFLOW_PROBE_RESULT, unexpected: "field" },
  ])("rejects a response that cannot prove one harmless execution", (response) => {
    expect(() => parseWorkflowProbeResult(response)).toThrow(WorkflowProbeContractError);
  });
});
