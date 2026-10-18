// Check 6: the coach's full prompt fits the model's context window.
import type { CheckStep } from "../types";

/** Rough chars-per-token for English prompts with numbers. */
const CHARS_PER_TOKEN = 3.5;
/** Tokens kept free for the coach's reply. */
const REPLY_ROOM = 700;

/** Compares the prompt size with the runtime context (or OLLAMA_CONTEXT_LENGTH / 4096 if unknown). */
export const checkContextFit: CheckStep = async ({ coachPromptChars, installed, runtimeCtx, modelMaxCtx }) => {
  if (!coachPromptChars || !installed) return [];
  const promptTokens = Math.ceil(coachPromptChars / CHARS_PER_TOKEN);
  const ctx = runtimeCtx ?? (Number(process.env.OLLAMA_CONTEXT_LENGTH) || 4096);
  const fits = promptTokens + REPLY_ROOM <= ctx;
  return [
    {
      id: "context",
      label: "Coach prompt fits the context window",
      status: fits ? "pass" : "fail",
      detail: `Coach prompt ≈${promptTokens.toLocaleString()} tokens + reply room vs ${runtimeCtx !== undefined ? "" : "assumed "}context ${ctx.toLocaleString()}`,
      fix: fits
        ? undefined
        : `Ollama would silently cut off the start of the prompt (the coach's instructions). Set the environment variable OLLAMA_CONTEXT_LENGTH=8192 and restart Ollama${
            modelMaxCtx ? ` (this model supports up to ${modelMaxCtx.toLocaleString()})` : ""
          }.`,
    },
  ];
};
