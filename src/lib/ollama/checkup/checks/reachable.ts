// Check 1: Ollama answers at the configured URL.
import { errText, getJson, timed } from "../probe";
import type { CheckStep } from "../types";

/** Calls /api/version; records `reachable` for the checks that follow. */
export const checkReachable: CheckStep = async (state) => {
  const { baseUrl } = state.cfg;
  const label = "Ollama is running";
  try {
    const [v, ms] = await timed(() => getJson<{ version: string }>(`${baseUrl}/api/version`));
    state.reachable = true;
    return [{ id: "reachable", label, status: "pass", detail: `Version ${v.version} at ${baseUrl}`, ms }];
  } catch (e) {
    return [
      {
        id: "reachable",
        label,
        status: "fail",
        detail: `Can't reach ${baseUrl} (${errText(e)}).`,
        fix: "Start Ollama from the Start menu (or run `ollama serve`), and check the Ollama URL in Settings.",
      },
    ];
  }
};
