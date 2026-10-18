// Check 4: a real generation, for correctness, cold-start time and speed.
import { errText, postJson, timed } from "../probe";
import type { Check, CheckStep } from "../types";

interface ChatResponse {
  message?: { content?: string };
  load_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/** Long enough output (~60 tokens) for a meaningful tokens/s figure; timing a one-word reply is wildly off. */
const PROMPT = "Reply with the word ready, then the numbers 1 to 30 separated by spaces.";

/** Asks the model a fixed prompt via /api/chat; records `generated` so the GPU check can run. */
export const checkGeneration: CheckStep = async (state) => {
  if (!state.installed) return [];
  try {
    const [r, ms] = await timed(() =>
      postJson<ChatResponse>(
        `${state.cfg.baseUrl}/api/chat`,
        {
          model: state.installed!.name,
          stream: false,
          ...(state.caps.includes("thinking") ? { think: false } : {}),
          messages: [{ role: "user", content: PROMPT }],
          options: { temperature: 0, num_predict: 120 },
        },
        180_000, // first load of a large model can take a while
      ),
    );
    state.generated = true;
    return [correctness(r, ms), speed(r)];
  } catch (e) {
    return [
      {
        id: "generate",
        label: "Model answers correctly",
        status: "fail",
        detail: `Generation failed (${errText(e)}).`,
        fix: "Check that the PC has enough free RAM/VRAM for this model, or pick a smaller one.",
      },
    ];
  }
};

/** Did it follow a trivial instruction? */
function correctness(r: ChatResponse, ms: number): Check {
  const text = (r.message?.content ?? "").trim();
  const followed = /\bready\b/i.test(text);
  return {
    id: "generate",
    label: "Model answers correctly",
    status: followed ? "pass" : "warn",
    detail: followed ? `Replied "${text.slice(0, 40)}"` : `Expected "ready", got "${text.slice(0, 80) || "(empty)"}"`,
    fix: followed ? undefined : "The model may be too small to follow instructions reliably. Try a larger model.",
    ms,
  };
}

/** Tokens per second, plus model load time when it was a cold start. */
function speed(r: ChatResponse): Check {
  // Below ~20 tokens, fixed per-request overhead dominates and the rate is meaningless.
  const tps = r.eval_count && r.eval_count >= 20 && r.eval_duration ? r.eval_count / (r.eval_duration / 1e9) : undefined;
  const load = (r.load_duration ?? 0) / 1e9;
  return {
    id: "speed",
    label: "Generation speed",
    status: tps !== undefined && tps >= 8 ? "pass" : "warn",
    detail:
      tps === undefined
        ? "Ollama didn't report timing."
        : `${tps.toFixed(1)} tokens/s · a ~300-word reply takes ≈${Math.round(400 / tps)} s${
            load > 1 ? ` · model load ${load.toFixed(1)} s (cold start)` : ""
          }`,
    fix: tps !== undefined && tps < 8 ? "Slow. Use a smaller model, or check the GPU check below." : undefined,
  };
}
