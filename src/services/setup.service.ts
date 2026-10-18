// Setup checklist and the one-tap model download (GET /api/setup/status, POST /api/setup/model).
import { openStream, requestJson, type ApiResult } from "./http";
import { readNdjson } from "./streams";
import type { ModelDownloadEvent, PhoneAddress, SetupItem } from "./types";

/** The setup checklist for this PC. */
export const fetchSetupStatus = () => requestJson<{ items: SetupItem[]; addresses: PhoneAddress[] }>("/api/setup/status");

/** Starts downloading the coach's model; on success, iterate `data` for progress events. */
export async function startModelDownload(signal?: AbortSignal): Promise<ApiResult<AsyncGenerator<ModelDownloadEvent>>> {
  const r = await openStream("/api/setup/model", { method: "POST", signal });
  return r.ok ? { ...r, data: readNdjson<ModelDownloadEvent>(r.data) } : r;
}
