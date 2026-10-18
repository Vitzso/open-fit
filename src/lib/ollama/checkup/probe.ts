// Small helpers the checks share: HTTP probing, timing and formatting.

/** GET/POST a JSON endpoint with a timeout; throws "HTTP 500: …" on error responses. */
export async function getJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 5000, ...rest } = init;
  const res = await fetch(url, { cache: "no-store", ...rest, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
  }
  return (await res.json()) as T;
}

/** POSTs a JSON body to an Ollama endpoint. */
export const postJson = <T>(url: string, payload: unknown, timeoutMs?: number) =>
  getJson<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), timeoutMs });

/** Runs `fn` and returns its result with the elapsed milliseconds. */
export async function timed<T>(fn: () => Promise<T>): Promise<readonly [T, number]> {
  const t = Date.now();
  const v = await fn();
  return [v, Date.now() - t] as const;
}

/** Short reason for a failed probe: "timed out", "ECONNREFUSED", or the message. */
export function errText(e: unknown): string {
  const err = e as { name?: string; message?: string; cause?: { code?: string } };
  if (err?.name === "TimeoutError") return "timed out";
  return err?.cause?.code ?? err?.message ?? "unknown error";
}

/** Bytes as "4.7 GB". */
export const gb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;

/** "llama3.1" → "llama3.1:latest", as Ollama lists it. */
export const withTag = (m: string) => (m.includes(":") ? m : `${m}:latest`);
