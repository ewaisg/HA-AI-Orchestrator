export interface HomeAssistantLike {
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  user?: { id: string };
  connection?: {
    connected: boolean;
    addEventListener(event: "ready" | "disconnected", callback: () => void): void;
    removeEventListener(event: "ready" | "disconnected", callback: () => void): void;
  };
}

export interface HomeAssistantRoute {
  path?: string;
}

export interface HomeAssistantPanelInfo {
  config?: Record<string, unknown>;
}
