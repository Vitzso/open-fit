// Keeps the phone's saved copies of the main screens fresh, so they open with no signal even if you
// haven't visited them lately. Runs when the PC answers (OutboxSync calls it after each sync), at most
// every 20 minutes, one page at a time; the service worker's "pages" rule stores each response.

const PAGES = ["/", "/nutrition", "/nutrition/add", "/workouts", "/weight", "/coach", "/settings"];
const KEY = "openfit:warmed-at";
const EVERY_MS = 20 * 60_000;

let running = false;

export async function warmOfflineCache(): Promise<void> {
  if (running || typeof navigator === "undefined" || !navigator.serviceWorker?.controller || !navigator.onLine) return;
  try {
    if (Date.now() - Number(localStorage.getItem(KEY) ?? 0) < EVERY_MS) return;
  } catch {
    return;
  }
  running = true;
  try {
    for (const page of PAGES) {
      const res = await fetch(page, {
        headers: { Accept: "text/html" },
        credentials: "same-origin",
        signal: AbortSignal.timeout(10_000),
      });
      // Signed out (sent to /login) or the PC isn't answering: try again next time.
      if (!res.ok || res.redirected) return;
      await res.arrayBuffer();
    }
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Offline or timed out: the next sync tries again.
  } finally {
    running = false;
  }
}
