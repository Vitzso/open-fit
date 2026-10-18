// Check 3: the model can chat; also reads its max context and whether it's a thinking model.
import { reasoningEffortFromEnv } from "../../config";
import { errText, postJson } from "../probe";
import type { CheckStep } from "../types";

interface ShowResponse {
  model_info?: Record<string, unknown>;
  capabilities?: string[];
}

/** Reads /api/show; records `caps` and `modelMaxCtx`. */
export const checkCapabilities: CheckStep = async (state) => {
  if (!state.installed) return [];
  const label = "Model supports chat";
  try {
    const show = await postJson<ShowResponse>(`${state.cfg.baseUrl}/api/show`, { model: state.installed.name });
    const ctxKey = Object.keys(show.model_info ?? {}).find((k) => k.endsWith(".context_length"));
    state.modelMaxCtx = ctxKey ? Number(show.model_info![ctxKey]) : undefined;
    state.caps = show.capabilities ?? [];
    const canChat = state.caps.length === 0 || state.caps.includes("completion");
    return [
      {
        id: "capabilities",
        label,
        status: canChat ? "pass" : "fail",
        detail: describe(state.caps, state.modelMaxCtx),
        fix: canChat ? undefined : "This looks like an embedding-only model. Pick a chat model in Settings.",
      },
    ];
  } catch (e) {
    return [{ id: "capabilities", label, status: "warn", detail: `Couldn't read model info (${errText(e)}).` }];
  }
};

/** "Capabilities: … · max context … · thinking model (…)". */
function describe(caps: string[], maxCtx?: number): string {
  const parts = [caps.length ? `Capabilities: ${caps.join(", ")}` : "Capabilities not reported"];
  if (maxCtx) parts.push(`max context ${maxCtx.toLocaleString()} tokens`);
  if (caps.includes("thinking")) parts.push(`thinking model (OpenFit reasoning effort: "${reasoningEffortFromEnv()}")`);
  return parts.join(" · ");
}
