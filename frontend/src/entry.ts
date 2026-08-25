import { AiOrchestratorPanel, PANEL_TAG } from "./panel/ai-orchestrator-panel";
import { ProvidersView } from "./panel/providers-view";

const PROVIDERS_VIEW_TAG = "ai-orchestrator-providers-view";

if (customElements.get(PANEL_TAG) === undefined) {
  customElements.define(PANEL_TAG, AiOrchestratorPanel);
}
if (customElements.get(PROVIDERS_VIEW_TAG) === undefined) {
  customElements.define(PROVIDERS_VIEW_TAG, ProvidersView);
}

export { AiOrchestratorPanel, PANEL_TAG, ProvidersView, PROVIDERS_VIEW_TAG };
