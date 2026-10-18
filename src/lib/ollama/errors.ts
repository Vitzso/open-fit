// Typed Ollama errors with plain-language fix-it hints, and mapping from raw failures.
import type { OllamaConfig, OllamaErrorCode, OllamaErrorJson } from "./types";

export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly code: OllamaErrorCode,
    public readonly hint?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OllamaError";
  }

  /** Status to send back to our own client. */
  get httpStatus(): number {
    switch (this.code) {
      case "TIMEOUT":
        return 504;
      case "MODEL_NOT_FOUND":
        return 424;
      case "ABORTED":
        return 499;
      default:
        return 502;
    }
  }

  /** The `{ error, code, hint }` body the API routes return. */
  toJSON(): OllamaErrorJson {
    return { error: this.message, code: this.code, hint: this.hint };
  }
}

const NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

const UNREACHABLE_HINT =
  "Make sure Ollama is running (`ollama serve` or the tray app), the URL in Settings is right, " +
  "and — if Ollama is on another machine — that OLLAMA_HOST=0.0.0.0 is set and port 11434 is allowed through the firewall.";

/** "Model X is not installed" with the pull command as the hint. */
export function modelNotFound(model: string, hint = `Run \`ollama pull ${model}\` on the PC, or choose an installed model in Settings.`) {
  return new OllamaError(`Model "${model}" is not installed in Ollama.`, "MODEL_NOT_FOUND", hint, 404);
}

/** Turns any thrown value (fetch failure, timeout, abort…) into an OllamaError. */
export function toOllamaError(err: unknown, cfg: OllamaConfig, timedOut: boolean): OllamaError {
  if (err instanceof OllamaError) return err;
  if (timedOut) {
    return new OllamaError(
      `Ollama at ${cfg.baseUrl} did not respond in time.`,
      "TIMEOUT",
      `The model may still be loading. Try again, or pick a smaller model than "${cfg.model}".`,
    );
  }
  const e = err as { name?: string; cause?: { code?: string } };
  if (e?.name === "AbortError") return new OllamaError("Request cancelled.", "ABORTED");
  const code = e?.cause?.code;
  if (e?.name === "TypeError" || (code && NETWORK_CODES.has(code))) {
    return new OllamaError(`Cannot reach Ollama at ${cfg.baseUrl}${code ? ` (${code})` : ""}.`, "UNREACHABLE", UNREACHABLE_HINT);
  }
  return new OllamaError(err instanceof Error ? err.message : "Unknown Ollama error.", "BAD_RESPONSE");
}

/** Builds an OllamaError from a non-2xx Ollama response, recognising "model not found". */
export async function errorFromResponse(res: Response, cfg: OllamaConfig): Promise<OllamaError> {
  let detail = "";
  try {
    const body = (await res.json()) as { error?: { message?: string } | string };
    detail = typeof body.error === "string" ? body.error : (body.error?.message ?? "");
  } catch {
    /* body wasn't JSON */
  }
  if (res.status === 404 && /model/i.test(detail || "model")) return modelNotFound(cfg.model);
  return new OllamaError(`Ollama returned HTTP ${res.status}${detail ? `: ${detail}` : ""}.`, "HTTP_ERROR", undefined, res.status);
}
