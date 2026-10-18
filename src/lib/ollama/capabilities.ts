// Model capabilities ("completion", "thinking", "vision"…) from Ollama's native /api/show.
import type { OllamaConfig } from "./types";

const TTL_MS = 10 * 60_000;
const cache = new Map<string, { caps: string[]; at: number }>();

/** Capabilities of the configured model, cached for 10 minutes. [] if unknown. */
export async function getModelCapabilities(cfg: OllamaConfig): Promise<string[]> {
  const key = `${cfg.baseUrl}|${cfg.model}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.caps;
  try {
    const res = await fetch(`${cfg.baseUrl}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const caps = ((await res.json()) as { capabilities?: string[] }).capabilities ?? [];
    cache.set(key, { caps, at: Date.now() });
    return caps;
  } catch {
    return []; // unknown: the chat request itself will surface real connection errors
  }
}
