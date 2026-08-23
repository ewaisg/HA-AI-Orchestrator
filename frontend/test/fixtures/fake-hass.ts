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
