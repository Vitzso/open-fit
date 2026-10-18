// Chat completions over Ollama's OpenAI-compatible API (/v1/chat/completions).
// Runs on the Next.js server; the phone never calls Ollama directly, which
// avoids CORS and HTTPS→HTTP mixed-content blocking in Safari.
import { getModelCapabilities } from "./capabilities";
import { reasoningEffortFromEnv, resolveOllamaConfig } from "./config";
import { deadline } from "./deadline";
import { errorFromResponse, OllamaError, toOllamaError } from "./errors";
import { readSseTokens } from "./sse";
import type { ChatMessage, ChatOptions, OllamaConfig, ReasoningEffort } from "./types";

/**
 * Request body. Thinking models (gemma4, qwen3, deepseek-r1…) reason silently
 * before answering, which on a home GPU can mean a long blank wait, so
 * `reasoning_effort` is sent, but only to models that support it.
 */
async function requestBody(cfg: OllamaConfig, messages: ChatMessage[], opts: ChatOptions) {
  const effort: ReasoningEffort = opts.reasoningEffort ?? reasoningEffortFromEnv();
  const thinks = (await getModelCapabilities(cfg)).includes("thinking");
  return JSON.stringify({
    model: cfg.model,
    messages,
    stream: true,
    temperature: opts.temperature ?? 0.5, // natural but still consistent; checkups pass their own
    ...(thinks ? { reasoning_effort: effort } : {}),
  });
}

/**
 * Streams the assistant's reply token by token. Errors before the first token
 * (unreachable, missing model…) are thrown from the first `next()` call, so
 * callers can map them to an HTTP status before committing to a stream.
 */
export async function* streamChatCompletion(messages: ChatMessage[], opts: ChatOptions = {}): AsyncGenerator<string, void, void> {
  const cfg = resolveOllamaConfig(opts);
  const { firstTokenTimeoutMs = 180_000, idleTimeoutMs = 60_000 } = opts;
  const timer = deadline(firstTokenTimeoutMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timer.signal]) : timer.signal;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const res = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await requestBody(cfg, messages, opts),
      signal,
      cache: "no-store",
    });
    if (!res.ok) throw await errorFromResponse(res, cfg);
    if (!res.body) throw new OllamaError("Ollama sent an empty response.", "BAD_RESPONSE");
    reader = res.body.getReader();
    yield* readSseTokens(reader, () => timer.reset(idleTimeoutMs));
  } catch (err) {
    throw toOllamaError(err, cfg, timer.fired);
  } finally {
    timer.clear();
    // If the consumer stopped early (client hung up), close the upstream
    // connection so Ollama stops generating tokens nobody will read.
    reader?.cancel().catch(() => {});
  }
}

/** Non-streaming convenience wrapper: the whole reply as one string. */
export async function chatCompletion(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  let out = "";
  for await (const token of streamChatCompletion(messages, opts)) out += token;
  return out;
}
