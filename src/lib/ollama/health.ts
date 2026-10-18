// Quick health check: is Ollama reachable, and is the configured model installed?
import { resolveOllamaConfig } from "./config";
import { deadline } from "./deadline";
import { errorFromResponse, modelNotFound, toOllamaError } from "./errors";
import type { OllamaConfig, OllamaHealth } from "./types";

/** True if `model` is in the list; "llama3.1" also matches the "llama3.1:latest" tag. */
export function isModelInstalled(model: string, installed: string[]): boolean {
  const tagged = model.includes(":") ? model : `${model}:latest`;
  return installed.includes(model) || installed.includes(tagged);
}

/** Lists installed models via GET /v1/models and checks the configured one exists. Never throws. */
export async function checkOllamaHealth(overrides: Partial<OllamaConfig> = {}): Promise<OllamaHealth> {
  const cfg = resolveOllamaConfig(overrides);
  const timer = deadline(4000);
  try {
    const res = await fetch(`${cfg.baseUrl}/v1/models`, { signal: timer.signal, cache: "no-store" });
    if (!res.ok) throw await errorFromResponse(res, cfg);
    const body = (await res.json()) as { data?: { id: string }[] };
    const models = (body.data ?? []).map((m) => m.id).sort();
    const modelInstalled = isModelInstalled(cfg.model, models);
    const hint = `Run \`ollama pull ${cfg.model}\` or pick one of: ${models.join(", ") || "(none installed)"}.`;
    return {
      ok: modelInstalled,
      ...cfg,
      models,
      modelInstalled,
      error: modelInstalled ? undefined : modelNotFound(cfg.model, hint).toJSON(),
    };
  } catch (err) {
    return { ok: false, ...cfg, models: [], modelInstalled: false, error: toOllamaError(err, cfg, timer.fired).toJSON() };
  } finally {
    timer.clear();
  }
}
