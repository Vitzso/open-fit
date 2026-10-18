// Check 2: the configured model is installed.
import { errText, gb, getJson, withTag } from "../probe";
import type { Check, CheckStep, TagModel } from "../types";

/** Lists models via /api/tags; records `installed` when the configured one is there. */
export const checkModel: CheckStep = async (state) => {
  const { baseUrl, model } = state.cfg;
  if (!state.reachable) {
    return [{ id: "model", label: "Model is installed", status: "skip", detail: "Skipped because Ollama isn't reachable." }];
  }
  try {
    const { models } = await getJson<{ models: TagModel[] }>(`${baseUrl}/api/tags`);
    const all = models ?? [];
    state.installed = all.find((m) => m.name === model || m.name === withTag(model));
    return [state.installed ? found(model, state.installed) : missing(model, all)];
  } catch (e) {
    return [{ id: "model", label: "Model is installed", status: "fail", detail: `Couldn't list models (${errText(e)}).` }];
  }
};

/** Pass line: size, parameters and quantization. */
function found(model: string, m: TagModel): Check {
  const detail = [m.details?.parameter_size, m.details?.quantization_level, gb(m.size)].filter(Boolean).join(" · ");
  return { id: "model", label: `Model "${model}" is installed`, status: "pass", detail };
}

/** Fail line listing what is installed instead. */
function missing(model: string, all: TagModel[]): Check {
  const others = all.map((m) => m.name).join(", ") || "none";
  return {
    id: "model",
    label: `Model "${model}" is installed`,
    status: "fail",
    detail: `Not found. Installed models: ${others}.`,
    fix: all.length
      ? `Set the model in Settings to one of: ${others} — or run \`ollama pull ${model}\`.`
      : `Run \`ollama pull ${model}\`.`,
  };
}
