// Reads and validates Ollama settings (from .env, the Settings page or a health-check request).
import type { OllamaConfig, ReasoningEffort } from "./types";

const DEFAULT_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "gemma4:latest";

/** Merges overrides with .env defaults and normalizes the URL ("…/", "…/v1" → origin). */
export function resolveOllamaConfig(overrides: Partial<OllamaConfig> = {}): OllamaConfig {
  const raw = overrides.baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_URL;
  return {
    baseUrl: raw.trim().replace(/\/+$/, "").replace(/\/v1$/, ""),
    model: overrides.model || process.env.OLLAMA_MODEL || DEFAULT_MODEL,
  };
}

/**
 * Validates a user-supplied Ollama base URL. The server fetches this URL, so
 * only plain http(s) origins are accepted: no credentials, query strings,
 * other schemes, or cloud-metadata addresses. Returns the normalized URL or null.
 */
export function validateOllamaUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password || u.search || u.hash) return null;
  if (/^169\.254\./.test(u.hostname) || u.hostname === "metadata.google.internal") return null;
  if (u.pathname !== "/" && u.pathname !== "/v1" && u.pathname !== "/v1/") return null;
  return `${u.protocol}//${u.host}`;
}

/** Ollama model tags: letters, digits and . - _ / : only. */
export const isValidModelName = (m: string) => /^[\w.\-/:]{1,100}$/.test(m);

/** OLLAMA_REASONING_EFFORT in .env; defaults to "none" so replies start streaming right away. */
export function reasoningEffortFromEnv(): ReasoningEffort {
  const v = process.env.OLLAMA_REASONING_EFFORT;
  return v === "low" || v === "medium" || v === "high" ? v : "none";
}
