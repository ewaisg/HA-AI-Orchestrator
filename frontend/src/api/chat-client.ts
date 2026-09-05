import type { HomeAssistantLike } from "../ha/hass-contract";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatProvider {
  connection_id: string;
  title: string;
  display_name: string;
  destination: "local";
  capability_verified: false;
}

export const CHAT_LIMITS = Object.freeze({
  max_messages: 21,
  max_message_chars: 4000,
  max_total_chars: 16000,
  max_response_chars: 4000,
  timeout_seconds: 60,
});

export interface ChatOptions {
  schema_version: 1;
  providers: ChatProvider[];
  limits: typeof CHAT_LIMITS;
  streaming: false;
  household_context: false;
  actions: false;
  history_persisted: false;
}

export interface ChatResult {
  schema_version: 1;
  connection_id: string;
  request_id: string;
  text: string;
  destination: "local";
  streaming: false;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

export function parseChatOptions(value: unknown): ChatOptions {
  if (!isRecord(value) || !exactKeys(value, ["schema_version", "providers", "limits", "streaming", "household_context", "actions", "history_persisted"]) ||
      value.schema_version !== 1 || value.streaming !== false || value.household_context !== false ||
      value.actions !== false || value.history_persisted !== false || !Array.isArray(value.providers) ||
      !isRecord(value.limits) || !exactKeys(value.limits, Object.keys(CHAT_LIMITS))) {
    throw new Error("Unsupported chat options");
  }
  const limits = value.limits;
  if (Object.entries(CHAT_LIMITS).some(([key, limit]) => limits[key] !== limit)) {
    throw new Error("Unsupported chat limits");
  }
  const seen = new Set<string>();
  const providers: ChatProvider[] = value.providers.map((item: unknown) => {
    if (!isRecord(item) || !exactKeys(item, ["connection_id", "title", "display_name", "destination", "capability_verified"]) ||
        typeof item.connection_id !== "string" || !UUID.test(item.connection_id) ||
        !isText(item.title, 1000) || !isText(item.display_name, 1000) || item.destination !== "local" ||
        item.capability_verified !== false || seen.has(item.connection_id)) {
      throw new Error("Unsupported chat provider");
    }
    seen.add(item.connection_id);
    return { connection_id: item.connection_id, title: item.title, display_name: item.display_name, destination: "local", capability_verified: false };
  });
  return { schema_version: 1, providers, limits: CHAT_LIMITS, streaming: false, household_context: false, actions: false, history_persisted: false };
}

export function parseChatResult(value: unknown, connectionId: string, requestId: string): ChatResult {
  if (!isRecord(value) || !exactKeys(value, ["schema_version", "connection_id", "request_id", "text", "destination", "streaming"]) ||
      value.schema_version !== 1 || value.connection_id !== connectionId || value.request_id !== requestId ||
      value.destination !== "local" || value.streaming !== false || !isText(value.text, CHAT_LIMITS.max_response_chars)) {
    throw new Error("Unsupported chat response");
  }
  return { schema_version: 1, connection_id: connectionId, request_id: requestId, text: value.text, destination: "local", streaming: false };
}

export async function fetchChatOptions(hass: HomeAssistantLike): Promise<ChatOptions> {
  return parseChatOptions(await hass.callWS<unknown>({ type: "ai_orchestrator/chat/options" }));
}

export async function sendChat(hass: HomeAssistantLike, connectionId: string, requestId: string, messages: readonly ChatMessage[]): Promise<ChatResult> {
  if (!UUID.test(connectionId) || !UUID.test(requestId) || messages.length === 0 ||
      messages.length > CHAT_LIMITS.max_messages || messages.length % 2 !== 1 ||
      messages.some((message, index) => message.role !== (index % 2 === 0 ? "user" : "assistant") || !isText(message.content, CHAT_LIMITS.max_message_chars)) ||
      messages.reduce((total, message) => total + message.content.length, 0) > CHAT_LIMITS.max_total_chars) {
    throw new Error("Invalid chat request");
  }
  const response = await hass.callWS<unknown>({
    type: "ai_orchestrator/chat/send",
    connection_id: connectionId,
    request_id: requestId,
    messages: messages.map(({ role, content }) => ({ role, content })),
  });
  return parseChatResult(response, connectionId, requestId);
}

// Keep whole turns, so a request always starts with a user and ends with this prompt.
export function prepareChatMessages(history: readonly ChatMessage[], prompt: string): { messages: ChatMessage[]; omitted: boolean } {
  const messages: ChatMessage[] = [...history.map((message) => ({ ...message })), { role: "user", content: prompt }];
  let omitted = false;
  while (messages.length > 1 && (messages.length > CHAT_LIMITS.max_messages ||
      messages.reduce((total, message) => total + message.content.length, 0) > CHAT_LIMITS.max_total_chars)) {
    messages.splice(0, 2);
    omitted = true;
  }
  return { messages, omitted };
}
