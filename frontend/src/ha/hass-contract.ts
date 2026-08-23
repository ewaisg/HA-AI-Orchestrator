export interface HomeAssistantLike {
  callWS<T>(message: Record<string, unknown>): Promise<T>;
}

export interface HomeAssistantRoute {
  path?: string;
}

export interface HomeAssistantPanelInfo {
  config?: Record<string, unknown>;
}
