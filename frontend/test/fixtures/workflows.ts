export const STORED_WORKFLOW_ID = "12345678-1234-4123-8123-123456789abc";

export const STORED_WORKFLOW: Record<string, unknown> = {
  schema_version: 1,
  workflow_id: STORED_WORKFLOW_ID,
  name: "Synthetic evening window",
  description: "",
  enabled: true,
  triggers: [{ kind: "state", entity_ids: ["binary_sensor.synthetic_window"], to_state: "on" }],
  conditions: [{ kind: "time_window", after_time: "18:00", before_time: "06:00" }],
  steps: [{ step_id: "compose", kind: "ai_compose", prompt: "Write a short window reminder." }],
};

export const OBSERVATION: Record<string, unknown> = {
  mode: "observation_only",
  enabled: true,
  triggered: true,
  conditions_passed: true,
  eligible: true,
  trigger_results: [{ index: 0, passed: true, reason: "matched" }],
  condition_results: [{ index: 0, passed: true, reason: "matched" }],
  planned_steps: [{ index: 0, kind: "ai_compose" }],
  provider_calls: 0,
  actions_executed: 0,
};

export const ACTIVE_STATUS: Record<string, unknown> = {
  active: true,
  observations: 2,
  ignored_events: 1,
  registrations: 1,
  latest: OBSERVATION,
  error: null,
};

export const INACTIVE_STATUS: Record<string, unknown> = {
  active: false,
  observations: 0,
  ignored_events: 0,
  registrations: 0,
  latest: null,
  error: null,
};

export const WORKFLOW_LIST: Record<string, unknown> = {
  schema_version: 1,
  store: "ready",
  workflows: [{ workflow: STORED_WORKFLOW, status: ACTIVE_STATUS }],
};

export const EMPTY_LIST: Record<string, unknown> = { schema_version: 1, store: "ready", workflows: [] };
