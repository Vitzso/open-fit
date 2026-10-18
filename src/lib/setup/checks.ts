// Server-side setup checklist: is each part of OpenFit ready on this PC?
import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { passcodeEnabled } from "@/lib/auth";
import { checkOllamaHealth } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";
import { phoneAddresses, type PhoneAddress } from "./addresses";

export interface SetupItem {
  id: "passcode" | "https" | "ollama" | "model" | "tailscale";
  label: string;
  ok: boolean;
  /** Optional parts (Tailscale) don't count as problems when missing. */
  optional?: boolean;
  detail: string;
  /** What to do about it, when not ok. */
  fix?: string;
}

const TAILSCALE_EXE = "C:\\Program Files\\Tailscale\\tailscale.exe";

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

/** Reads `tailscale status --json`; resolves to null if it can't be read. */
function tailscaleState(): Promise<{ BackendState?: string; Self?: { DNSName?: string } } | null> {
  return new Promise((resolve) => {
    execFile(TAILSCALE_EXE, ["status", "--json"], { timeout: 4000, windowsHide: true }, (_err, stdout) => {
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(null);
      }
    });
  });
}

type TailscaleState = Awaited<ReturnType<typeof tailscaleState>>;

/** Optional remote access through Tailscale. */
function tailscaleItem(st: TailscaleState): SetupItem {
  if (!existsSync(TAILSCALE_EXE)) {
    return { id: "tailscale", label: "Away-from-home access (Tailscale)", ok: false, optional: true, detail: "Not installed. OpenFit works on your home Wi-Fi.", fix: "Optional: run Setup on the PC and say yes to Tailscale." };
  }
  const ok = st?.BackendState === "Running";
  return {
    id: "tailscale",
    label: "Away-from-home access (Tailscale)",
    ok,
    optional: true,
    detail: ok ? `Connected as ${st?.Self?.DNSName?.replace(/\.$/, "") ?? "this PC"}.` : "Installed but not connected.",
    fix: ok ? undefined : "Open Tailscale from the Start menu on the PC and sign in.",
  };
}

/** Tailscale's name for this PC when connected (e.g. "my-pc.tailnet.ts.net"), else undefined. */
const tailscaleName = (st: TailscaleState) => (st?.BackendState === "Running" ? st.Self?.DNSName?.replace(/\.$/, "") : undefined);

/** The full checklist plus the addresses to open on a phone, worked out from the request that asked. */
export async function getSetupStatus(requestUrl: string): Promise<{ items: SetupItem[]; addresses: PhoneAddress[] }> {
  const isHttps = new URL(requestUrl).protocol === "https:";
  const [ollama, ts] = await Promise.all([ollamaItems(), existsSync(TAILSCALE_EXE) ? tailscaleState() : Promise.resolve(null)]);
  return {
    items: [passcodeItem(), httpsItem(isHttps), ...ollama, tailscaleItem(ts)],
    addresses: await phoneAddresses(requestUrl, tailscaleName(ts)),
  };
}
