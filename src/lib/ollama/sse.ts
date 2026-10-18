// Parses the OpenAI-style server-sent-event stream from /v1/chat/completions into text tokens.
import { OllamaError } from "./errors";

interface CompletionChunk {
  error?: { message?: string };
  choices?: { delta?: { content?: string } }[];
}

/**
 * Yields each content token. `onData` is called for every network chunk (used
 * to push back the idle timeout). Stops at "[DONE]"; throws on an error event.
 */
export async function* readSseTokens(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onData: () => void,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    onData();
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      const chunk = parseChunk(payload);
      if (!chunk) continue; // keep-alives / partial garbage
      if (chunk.error) throw new OllamaError(chunk.error.message ?? "Ollama stream error.", "HTTP_ERROR");
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) yield token;
    }
  }
}

/** JSON.parse that returns null instead of throwing. */
function parseChunk(payload: string): CompletionChunk | null {
  try {
    return JSON.parse(payload) as CompletionChunk;
  } catch {
    return null;
  }
}
