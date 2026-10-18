// Coach diagnostics: the Ollama checkup and the coach behaviour self-test.
import { openStream, requestJson, type ApiResult } from "./http";
import { readNdjson } from "./streams";
import type { CheckupReport, SelfTestEvent } from "./types";

/** Runs every Ollama check on the PC and returns the report. */
export const runOllamaCheckup = () => requestJson<CheckupReport>("/api/coach/checkup");

/** Starts the self-test; on success, iterate `data` for an event as each case is graded. */
export async function startSelfTest(signal?: AbortSignal): Promise<ApiResult<AsyncGenerator<SelfTestEvent>>> {
  const r = await openStream("/api/coach/selftest", { method: "POST", signal });
  return r.ok ? { ...r, data: readNdjson<SelfTestEvent>(r.data) } : r;
}
