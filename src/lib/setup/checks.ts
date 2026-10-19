// Server-side setup checklist: is each part of OpenFit ready on this PC?
import "server-only";
import { passcodeEnabled } from "@/lib/auth";
import { checkOllamaHealth } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";
import { phoneAddresses, type PhoneAddress } from "./addresses";
import { getRemoteStatus, type RemoteStatus } from "./remote-status";

export interface SetupItem {
  id: "passcode" | "https" | "ollama" | "model" | "remote";
  label: string;
  ok: boolean;
  /** Optional parts (remote access) don't count as problems when missing. */
  optional?: boolean;
  detail: string;
  /** What to do about it, when not ok. */
  fix?: string;
}

/** Whether a device passcode protects the app. */
function passcodeItem(): SetupItem {
  const ok = passcodeEnabled();
  return {
    id: "passcode",
    label: "Passcode lock",
    ok,
    detail: ok ? "Every device has to sign in once." : "Anyone on your Wi-Fi can open OpenFit.",
    fix: ok ? undefined : "Run Setup on the PC (Setup.cmd) and choose a passcode.",
  };
}

/** Whether this page was served over HTTPS (needed for the iPhone camera and Home Screen app). */
function httpsItem(isHttps: boolean): SetupItem {
  return {
    id: "https",
    label: "HTTPS",
    ok: isHttps,
    detail: isHttps ? "Live barcode scanning and the Home Screen app work." : "The iPhone camera needs HTTPS.",
    fix: isHttps ? undefined : "Run Setup on the PC; it creates the certificates. Then restart OpenFit.",
  };
}

/** Ollama reachable, and the coach's model downloaded. */
async function ollamaItems(): Promise<SetupItem[]> {
  const s = await getSettings();
  const h = await checkOllamaHealth(coachOptions(s));
  const reachable = h.ok || h.error?.code === "MODEL_NOT_FOUND";
  return [
    {
      id: "ollama",
      label: "AI coach engine (Ollama)",
      ok: reachable,
      detail: reachable ? `Running at ${h.baseUrl}.` : (h.error?.error ?? "Not reachable."),
      fix: reachable ? undefined : "Run Setup on the PC; it installs and starts Ollama.",
    },
    {
      id: "model",
      label: `Coach model (${h.model})`,
      ok: h.modelInstalled,
      detail: h.modelInstalled ? "Downloaded." : reachable ? "Not downloaded yet." : "Needs Ollama first.",
      fix: h.modelInstalled || !reachable ? undefined : "Tap Download below (several GB, one time).",
    },
  ];
}

/** Optional away-from-home access through the remote access chosen in Settings (or .env). */
function remoteItem(st: RemoteStatus): SetupItem {
  const label = `Away-from-home access (${st.label})`;
  if (st.config.provider === "none") {
    return {
      id: "remote",
      label: "Away-from-home access",
      ok: false,
      optional: true,
      detail: "Off. OpenFit works on your home Wi-Fi.",
      fix: "Optional: pick Tailscale, WireGuard, ZeroTier, NetBird or your own under Remote access.",
    };
  }
  if (!st.installed) {
    return { id: "remote", label, ok: false, optional: true, detail: "Not installed on the PC.", fix: `Run Setup on the PC; it installs ${st.label}.` };
  }
  if (st.config.provider === "custom" && !st.config.address) {
    return { id: "remote", label, ok: false, optional: true, detail: "No address set.", fix: "Enter the address your phone uses when away, under Remote access." };
  }
  return {
    id: "remote",
    label,
    ok: st.connected,
    optional: true,
    detail: st.connected ? `Reachable at ${st.hosts[0] ?? "this PC"}.` : "Installed but not connected.",
    fix: st.connected ? undefined : `Open ${st.label} on the PC and connect, and turn it on on your iPhone.`,
  };
}

/** The full checklist plus the addresses to open on a phone, worked out from the request that asked. */
export async function getSetupStatus(requestUrl: string): Promise<{ items: SetupItem[]; addresses: PhoneAddress[] }> {
  const isHttps = new URL(requestUrl).protocol === "https:";
  const [ollama, remote] = await Promise.all([ollamaItems(), getRemoteStatus()]);
  const away = remote.connected && remote.hosts[0] ? { label: remote.label, host: remote.hosts[0] } : undefined;
  return {
    items: [passcodeItem(), httpsItem(isHttps), ...ollama, remoteItem(remote)],
    addresses: await phoneAddresses(requestUrl, away),
  };
}
