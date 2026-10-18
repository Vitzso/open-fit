// Passcode sign-in and sign-out (POST / DELETE /api/login).
import { requestJson, type ApiResult } from "./http";

/** Posts the login form; on success the server sets the session cookie and says where to go. */
export function signIn(form: HTMLFormElement): Promise<ApiResult<{ next?: string }>> {
  return requestJson("/api/login", {
    method: "POST",
    body: new FormData(form),
    headers: { Accept: "application/json" },
  });
}

/** Clears the session cookie on the server. */
export async function signOut(): Promise<void> {
  await requestJson("/api/login", { method: "DELETE" });
}
