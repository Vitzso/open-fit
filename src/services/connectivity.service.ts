// Checks whether the OpenFit server on the PC can be reached right now.

/** True if a tiny public file loads. Bypasses caches so it tests the real network path. */
export async function pingServer(): Promise<boolean> {
  try {
    const res = await fetch(`/manifest.webmanifest?ping=${Date.now()}`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
