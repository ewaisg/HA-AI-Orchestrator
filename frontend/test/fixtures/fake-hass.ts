import type { HomeAssistantLike } from "../../src/ha/hass-contract";

export const FOUNDATION_STATUS = Object.freeze({
  schema_version: 1,
  phase: "foundation",
  configured: false,
  features: Object.freeze({
    providers: false,
    workflows: false,
    conversation: false,
    ai_task: false,
  }),
});

export const FOUNDATION_WORKFLOW_PROBE_RESULT = Object.freeze({
  schema_version: 1,
  workflow_id: "foundation_lifecycle_probe",
  trigger_type: "integration_event",
  execution_count: 1,
  executions_for_trigger: 1,
  registration_count: 1,
  provider_contacted: false,
  home_assistant_action_called: false,
});

export function createFakeHass(
  response: unknown = FOUNDATION_STATUS,
  onRequest: (message: Record<string, unknown>) => void = () => undefined,
): HomeAssistantLike {
  return {
    callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
      onRequest(message);
      return structuredClone(response) as T;
    },
  };
}

export function createFailingHass(error: Error): HomeAssistantLike {
  return {
    callWS: async <T>(): Promise<T> => Promise.reject(error),
  };
}

export function createRoutedFakeHass(
  responses: Readonly<Record<string, unknown>>,
  onRequest: (message: Record<string, unknown>) => void = () => undefined,
): HomeAssistantLike {
  return {
    callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
      onRequest(message);
      const messageType = message.type;
      if (typeof messageType !== "string" || !Object.hasOwn(responses, messageType)) {
        return Promise.reject(new Error("Unexpected fake Home Assistant request"));
      }
      return structuredClone(responses[messageType]) as T;
    },
  };
}
