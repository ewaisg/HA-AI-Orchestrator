import { AiOrchestratorPanel, PANEL_TAG } from "./panel/ai-orchestrator-panel";
import { CatalogView } from "./panel/catalog-view";
import { ProvidersView } from "./panel/providers-view";
import { ChatView, CHAT_VIEW_TAG } from "./panel/chat-view";

const PROVIDERS_VIEW_TAG = "ai-orchestrator-providers-view";
const CATALOG_VIEW_TAG = "ai-orchestrator-catalog-view";

if (customElements.get(CHAT_VIEW_TAG) === undefined) {
  customElements.define(CHAT_VIEW_TAG, ChatView);
}

if (customElements.get(PANEL_TAG) === undefined) {
  customElements.define(PANEL_TAG, AiOrchestratorPanel);
}
if (customElements.get(PROVIDERS_VIEW_TAG) === undefined) {
  customElements.define(PROVIDERS_VIEW_TAG, ProvidersView);
}
if (customElements.get(CATALOG_VIEW_TAG) === undefined) {
  customElements.define(CATALOG_VIEW_TAG, CatalogView);
}

export {
  ChatView,
  CHAT_VIEW_TAG,
  AiOrchestratorPanel,
  CATALOG_VIEW_TAG,
  CatalogView,
  PANEL_TAG,
  ProvidersView,
  PROVIDERS_VIEW_TAG,
};
