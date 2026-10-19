/**
 * Optional passcode lock. Set APP_PASSCODE in .env to require it on every
 * device. The session cookie holds a hash derived from the passcode, so
 * changing the passcode signs every device out.
 *
 * Uses Web Crypto so it runs both in Edge middleware and in Node route handlers.
 */

export const SESSION_COOKIE = "openfit_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // stay signed in on your phone for a year

export const passcodeEnabled = () => Boolean(process.env.APP_PASSCODE);

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function sessionToken(): Promise<string> {
  return sha256Hex(`openfit-session:v1:${process.env.APP_PASSCODE ?? ""}`);
}

/** Constant-time comparison: hash both sides so lengths match, then compare every byte. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!passcodeEnabled()) return true;
  return !!cookieValue && safeEqual(cookieValue, await sessionToken());
}

export async function checkPasscode(attempt: string): Promise<boolean> {
  return passcodeEnabled() && safeEqual(attempt, process.env.APP_PASSCODE!);
}

/**
 * Blocks DNS-rebinding attacks: a malicious website can point its own domain
 * at your PC's IP, which would make it "same-origin" with OpenFit. Real
 * visits use an IP address, localhost, a .local mDNS name, or a host you list
 * in ALLOWED_HOSTS.
 */
export function isAllowedHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.replace(/:\d+$/, "").toLowerCase();
  // ALLOWED_HOSTS, plus the away-from-home address chosen under Remote access.
  const extra = [...(process.env.ALLOWED_HOSTS ?? "").split(","), process.env.REMOTE_ADDRESS ?? ""]
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    /^\[[0-9a-f:.]+\]$/.test(host) ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    // Tailscale MagicDNS and NetBird peer names only resolve inside your own private
    // network, so an outside website can't point one at this PC.
    host.endsWith(".ts.net") ||
    host.endsWith(".netbird.cloud") ||
    extra.includes(host)
  );
}
