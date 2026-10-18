import { NextResponse } from "next/server";
import { checkPasscode, passcodeEnabled, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Brute-force protection: 5 wrong guesses per 10 minutes per client, and 30 in total.
const WINDOW_MS = 10 * 60 * 1000;
const PER_CLIENT = 5;
const GLOBAL = 30;
const failures = new Map<string, { count: number; until: number }>();

function tooMany(key: string): boolean {
  const now = Date.now();
  for (const [k, v] of failures) if (v.until < now) failures.delete(k);
  const total = [...failures.values()].reduce((t, v) => t + v.count, 0);
  return (failures.get(key)?.count ?? 0) >= PER_CLIENT || total >= GLOBAL;
}

function recordFailure(key: string) {
  const entry = failures.get(key) ?? { count: 0, until: Date.now() + WINDOW_MS };
  entry.count++;
  failures.set(key, entry);
}

/** Only allow redirects back into this app, never to another site. */
const safeNext = (n: unknown) =>
  typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/";

/**
 * Relative redirect. Don't build an absolute URL from req.url: behind the
 * HTTPS server (which listens on 0.0.0.0) it becomes https://0.0.0.0:3443/…,
 * which the phone can't reach. A relative Location always resolves against
 * the address the phone actually used (LAN IP or Tailscale name).
 */
const seeOther = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });

export async function POST(req: Request) {
  // The login page submits with fetch and asks for JSON; a plain no-JS form post gets redirects.
  const wantsJson = req.headers.get("accept")?.includes("application/json") ?? false;
  const form = await req.formData().catch(() => null);
  const next = safeNext(form?.get("next"));
  const fail = (error: "wrong" | "locked", status: number) =>
    wantsJson
      ? NextResponse.json({ error }, { status })
      : seeOther(`/login?error=${error}&next=${encodeURIComponent(next)}`);

  if (!passcodeEnabled()) return wantsJson ? NextResponse.json({ ok: true, next }) : seeOther(next);

  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(key)) return fail("locked", 429);

  if (!(await checkPasscode(String(form?.get("passcode") ?? "")))) {
    recordFailure(key);
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return fail("wrong", 401);
  }
  failures.delete(key);

  // For fetch logins the cookie arrives on a plain 200 response, which iOS
  // always stores before the page reloads (cookies on redirects can lag in
  // Home Screen apps).
  const res = wantsJson ? NextResponse.json({ ok: true, next }) : seeOther(next);
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
