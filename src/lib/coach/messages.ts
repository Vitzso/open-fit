// Assembles the chat messages sent to the model: instructions + data + recent conversation.
import type { ChatMessage } from "@/lib/ollama";
import { formatCoachInstructions } from "./instructions";
import { COACH_SYSTEM_PROMPT } from "./prompt";

/** What the system message is built from: the data block and the client's optional instructions. */
export interface CoachPromptInput {
  text: string;
  instructions?: string | null;
}

/** Max characters of earlier conversation sent with each question, so the prompt fits the context window. */
export const HISTORY_CHAR_BUDGET = 6000;

/** Keeps the most recent turns that fit the character budget (oldest dropped first). */
export function trimHistory(history: { role: string; content: string }[], budget: number): ChatMessage[] {
  const out: ChatMessage[] = [];
  let used = 0;
  for (const m of [...history].reverse()) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (used + m.content.length > budget) break;
    used += m.content.length;
    out.unshift({ role: m.role, content: m.content });
  }
  // A conversation should start with the client's turn, not a dangling coach reply.
  while (out[0]?.role === "assistant") out.shift();
  return out;
}

/** Instructions, then the client's preferences, then the data block wrapped in <client_data> tags. */
export function coachSystemMessage({ text, instructions }: CoachPromptInput): ChatMessage {
  // Neutralise any literal closing tag a user typed into a note.
  const safe = text.replace(/<\/?client_data>/gi, "");
  const prefs = formatCoachInstructions(instructions);
  return {
    role: "system",
    content: `${COACH_SYSTEM_PROMPT}${prefs ? `\n\n${prefs}` : ""}\n\n<client_data>\n${safe}\n</client_data>`,
  };
}

/** System prompt + fresh data block + recent conversation + the new question. */
export function buildCoachMessages(
  context: CoachPromptInput,
  history: { role: string; content: string }[],
  question: string,
): ChatMessage[] {
  return [coachSystemMessage(context), ...trimHistory(history, HISTORY_CHAR_BUDGET), { role: "user", content: question }];
}
