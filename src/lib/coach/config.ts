// The coach's Ollama options from the Settings row. Blank fields fall back to .env.
import type { ChatOptions, ReasoningEffort } from "@/lib/ollama";

export const REASONING_LEVELS = ["none", "low", "medium", "high"] as const;

/** Narrows a stored string to a reasoning level, or undefined (= use OLLAMA_REASONING_EFFORT). */
export const asReasoning = (v: string | null | undefined): ReasoningEffort | undefined =>
  (REASONING_LEVELS as readonly string[]).includes(v ?? "") ? (v as ReasoningEffort) : undefined;

/** Base URL, model and thinking level to use for every coach request. */
export function coachOptions(s: { ollamaBaseUrl: string | null; ollamaModel: string | null; ollamaReasoning: string | null }): Pick<
  ChatOptions,
  "baseUrl" | "model" | "reasoningEffort"
> {
  return {
    baseUrl: s.ollamaBaseUrl ?? undefined,
    model: s.ollamaModel ?? undefined,
    reasoningEffort: asReasoning(s.ollamaReasoning),
  };
}
