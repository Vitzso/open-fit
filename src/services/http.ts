// Low-level helpers for calling OpenFit's own API from the browser.
// Every service goes through these, so errors always have the same shape.

/** Result of an API call: the parsed body, or a user-facing error message. */
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; hint?: string; body?: unknown };

/** Shown when the request never reached the server (PC off, Tailscale down). */
export const UNREACHABLE = "Can't reach your PC.";

/** True for errors caused by our own AbortController, which callers ignore. */
export const isAbort = (e: unknown) => e instanceof Error && e.name === "AbortError";

/** Builds the failure result from an error response body (`{ error, hint }`). */
function failure(status: number, body: unknown): ApiResult<never> {
  const b = (body ?? {}) as { error?: unknown; hint?: unknown };
  return {
    ok: false,
    status,
    error: typeof b.error === "string" ? b.error : `HTTP ${status}`,
    hint: typeof b.hint === "string" ? b.hint : undefined,
    body,
  };
}

/** fetch() with OpenFit defaults; a network failure becomes null, an abort is rethrown. */
async function send(url: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { cache: "no-store", credentials: "same-origin", ...init });
  } catch (e) {
    if (isAbort(e)) throw e;
    return null;
  }
}

/** Sends a request and parses the JSON reply. Never throws, except when aborted. */
export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const res = await send(url, init);
  if (!res) return { ok: false, status: 0, error: UNREACHABLE };
  const body = await res.json().catch(() => null);
  return res.ok ? { ok: true, status: res.status, data: body as T } : failure(res.status, body);
}

/** Starts a streaming request; errors before the stream begins come back as a failure result. */
export async function openStream(url: string, init: RequestInit = {}): Promise<ApiResult<ReadableStream<Uint8Array>>> {
  const res = await send(url, init);
  if (!res) return { ok: false, status: 0, error: UNREACHABLE };
  if (res.ok && res.body) return { ok: true, status: res.status, data: res.body };
  return failure(res.status, await res.json().catch(() => null));
}
