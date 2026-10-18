// Check 8: can arbitrary websites call Ollama from the browser (CORS)?
import { errText } from "../probe";
import type { CheckStep } from "../types";

const LABEL = "Websites can't use your Ollama";

/** Sends a request with a foreign Origin and looks for Access-Control-Allow-Origin. */
export const checkCors: CheckStep = async ({ cfg, reachable }) => {
  if (!reachable) return [];
  try {
    const res = await fetch(`${cfg.baseUrl}/api/version`, {
      headers: { Origin: "http://openfit-cors-probe.example" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    const acao = res.headers.get("access-control-allow-origin");
    if (!acao) {
      return [
        { id: "cors", label: LABEL, status: "pass", detail: "Browser requests from other websites are refused (OLLAMA_ORIGINS isn't opened up)." },
      ];
    }
    return [
      {
        id: "cors",
        label: LABEL,
        status: "warn",
        detail: `Ollama allows browser requests from any website (Access-Control-Allow-Origin: ${acao}). A web page you visit could send prompts to your models.`,
        fix: "Remove OLLAMA_ORIGINS (or set it to only the origins you need) and restart Ollama. OpenFit doesn't need it.",
      },
    ];
  } catch (e) {
    return [{ id: "cors", label: LABEL, status: "skip", detail: `Probe failed (${errText(e)}).` }];
  }
};
