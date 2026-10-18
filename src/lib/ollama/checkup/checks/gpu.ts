// Check 5: how much of the loaded model sits in GPU memory (needs the model loaded by check 4).
import { errText, gb, getJson } from "../probe";
import type { Check, CheckStep } from "../types";

interface LoadedModel {
  name: string;
  size: number;
  size_vram: number;
  context_length?: number;
}

/** Reads /api/ps; records the runtime context length for the context check. */
export const checkGpu: CheckStep = async (state) => {
  if (!state.generated || !state.installed) return [];
  try {
    const { models } = await getJson<{ models: LoadedModel[] }>(`${state.cfg.baseUrl}/api/ps`);
    const loaded = models?.find((m) => m.name === state.installed!.name);
    if (!loaded) return [];
    state.runtimeCtx = loaded.context_length;
    return [gpuLine(loaded, state.installed.size)];
  } catch (e) {
    return [{ id: "gpu", label: "Running on GPU", status: "warn", detail: `Couldn't read loaded models (${errText(e)}).` }];
  }
};

/** Percent in VRAM, with advice when part of it runs on the CPU. */
function gpuLine(loaded: LoadedModel, fileSize: number): Check {
  const pct = loaded.size > 0 ? Math.round((loaded.size_vram / loaded.size) * 100) : 0;
  return {
    id: "gpu",
    label: "Running on GPU",
    status: pct >= 90 ? "pass" : "warn",
    // Some Ollama runners under-report loaded size (e.g. 0.5 GB for a 6 GB model);
    // the GPU/total ratio is still right, so only show sizes when they're plausible.
    detail:
      loaded.size >= fileSize * 0.5
        ? `${pct}% in GPU memory (${gb(loaded.size_vram)} of ${gb(loaded.size)})`
        : `${pct}% of the model is in GPU memory`,
    fix:
      pct >= 90
        ? undefined
        : pct === 0
          ? "Running on CPU only, which makes replies slow. Check GPU drivers, or use a smaller model."
          : "The model doesn't fit fully in VRAM, so part runs on CPU. A smaller model or quantization will be faster.",
  };
}
