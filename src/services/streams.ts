// Readers for the two streaming formats the API uses: plain text (coach
// replies) and newline-delimited JSON (coach self-test progress).

/** Yields decoded text chunks as they arrive. Cancels the stream if the caller stops early. */
export async function* readText(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) yield chunk;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** Yields one parsed object per non-empty line of an NDJSON stream. */
export async function* readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  let buffer = "";
  for await (const chunk of readText(body)) {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as T;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as T;
}
