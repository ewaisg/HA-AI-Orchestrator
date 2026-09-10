export const VALID_PREVIEW = {
  schema_version: 1, mode: "offline", enabled: false, triggered: true, conditions_passed: true, eligible: true,
  trigger_results: [{ index: 0, passed: true, reason: "matched" }],
  condition_results: [{ index: 0, passed: true, reason: "matched" }],
  planned_steps: [{ index: 0, kind: "ai_compose" }, { index: 1, kind: "notify" }], provider_calls: 0, actions_executed: 0,
};
