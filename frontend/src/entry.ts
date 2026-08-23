import { AiOrchestratorPanel, PANEL_TAG } from "./panel/ai-orchestrator-panel";

if (customElements.get(PANEL_TAG) === undefined) {
  customElements.define(PANEL_TAG, AiOrchestratorPanel);
}

export { AiOrchestratorPanel, PANEL_TAG };
