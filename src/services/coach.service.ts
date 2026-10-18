// The AI coach chat: Ollama status, conversation history and streamed replies.
import { openStream, requestJson, type ApiResult } from "./http";
import { readText } from "./streams";
import type { ChatHistoryMessage, CoachHealth } from "./types";

/** Ollama status plus the exact data block the coach sees. Overrides test settings before saving them. */
export function fetchCoachHealth(overrides?: { baseUrl: string; model: string }) {
  const query = overrides ? `?${new URLSearchParams(overrides)}` : "";
  return requestJson<{ health?: CoachHealth; context?: { text?: string } }>(`/api/coach/health${query}`);
}

/** The saved conversation, oldest first (empty if it can't be loaded). */
export async function fetchChatHistory(): Promise<ChatHistoryMessage[]> {
  const r = await requestJson<{ messages?: ChatHistoryMessage[] }>("/api/coach");
  return r.ok && Array.isArray(r.data.messages) ? r.data.messages : [];
}

/** Deletes the whole conversation. */
export async function clearChatHistory(): Promise<boolean> {
  return (await requestJson("/api/coach", { method: "DELETE" })).ok;
}

/** Asks the coach a question; on success, iterate `data` to read the reply as it's written. */
export async function askCoach(message: string, signal?: AbortSignal): Promise<ApiResult<AsyncGenerator<string>>> {
  const r = await openStream("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });
  return r.ok ? { ...r, data: readText(r.data) } : r;
}
