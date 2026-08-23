import { PANEL_TAG, type AiOrchestratorPanel } from "../entry";
import type { HomeAssistantLike } from "../ha/hass-contract";

const fakeDevelopmentHass: HomeAssistantLike = {
  callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
    if (message.type !== "ai_orchestrator/status") {
      throw new Error("Unsupported development fixture request");
    }

    return {
      schema_version: 1,
      phase: "foundation",
      configured: false,
      features: {
        providers: false,
        workflows: false,
        conversation: false,
        ai_task: false,
      },
    } as T;
  },
};

const panel = document.createElement(PANEL_TAG) as AiOrchestratorPanel;
panel.hass = fakeDevelopmentHass;
document.body.append(panel);
