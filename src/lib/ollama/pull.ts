// Downloads a model through Ollama's native /api/pull, streaming progress.
import { resolveOllamaConfig } from "./config";
import { errorFromResponse, OllamaError, toOllamaError } from "./errors";
import type { OllamaConfig } from "./types";

/** One progress update from Ollama ("pulling manifest", "downloading", "success"…). */
export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
}

/** Turns Ollama's raw pull error into a plain-language one ("file does not exist" means no such model). */
function pullError(raw: string, model: string): OllamaError {
  if (/does not exist|not found|manifest unknown/i.test(raw)) {
    return new OllamaError(`Ollama has no model called "${model}". Check the model name in Settings → AI coach connection.`, "MODEL_NOT_FOUND");
  }
  return new OllamaError(`The download failed: ${raw}`, "HTTP_ERROR");
}

/** Yields progress updates until the download finishes; throws an OllamaError on failure. */
export async function* pullModel(overrides: Partial<OllamaConfig> = {}, signal?: AbortSignal): AsyncGenerator<PullProgress> {
  const cfg = resolveOllamaConfig(overrides);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const res = await fetch(`${cfg.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model, stream: true }),
      signal,
      cache: "no-store",
    });
    if (!res.ok) throw await errorFromResponse(res, cfg);
    if (!res.body) throw new OllamaError("Ollama sent an empty response.", "BAD_RESPONSE");
    reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const msg = JSON.parse(line) as PullProgress & { error?: string };
        if (msg.error) throw pullError(msg.error, cfg.model);
        yield { status: msg.status, completed: msg.completed, total: msg.total };
      }
    }
  } catch (err) {
    throw toOllamaError(err, cfg, false);
  } finally {
    reader?.cancel().catch(() => {});
  }
}
