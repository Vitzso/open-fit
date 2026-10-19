// Live status of the chosen remote access on this PC: installed, connected, and the address
// the phone should use when away. Mirrors launcher/setup/remote.ps1.
import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { readEnvFile } from "@/lib/env-file";
import { REMOTE_PROVIDERS, remoteConfigFrom, type RemoteConfig, type RemoteProvider } from "@/lib/remote-access";

export interface RemoteStatus {
  config: RemoteConfig;
  label: string;
  installed: boolean;
  connected: boolean;
  /** Where the phone reaches this PC on that network: names first, then IPs. */
  hosts: string[];
}

const WIN = process.platform === "win32";

/** Where each provider's command-line tool (or app) lives, and how its network adapter is named on Windows. */
const LOCAL: Record<Exclude<RemoteProvider, "none">, { exe: string | null; adapter: RegExp | null }> = {
  tailscale: { exe: WIN ? "C:\\Program Files\\Tailscale\\tailscale.exe" : "tailscale", adapter: /tailscale/i },
  wireguard: { exe: WIN ? "C:\\Program Files\\WireGuard\\wireguard.exe" : null, adapter: /wireguard tunnel|^wg\d*$/i },
  zerotier: { exe: WIN ? "C:\\ProgramData\\ZeroTier\\One\\zerotier-one_x64.exe" : null, adapter: /zerotier|^zt/i },
  netbird: { exe: WIN ? "C:\\Program Files\\NetBird\\netbird.exe" : "netbird", adapter: /^wt0$|netbird/i },
  custom: { exe: null, adapter: null },
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Runs a CLI and parses its JSON output; null if it isn't there, fails or prints something else. */
function cliJson<T>(exe: string, args: string[]): Promise<T | null> {
  if (WIN && !existsSync(exe)) return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile(exe, args, { timeout: 4000, windowsHide: true }, (_err, stdout) => {
      try {
        resolve(JSON.parse(stdout) as T);
      } catch {
        resolve(null);
      }
    });
  });
}

interface Adapter {
  name: string;
  description: string;
  ips: string[];
}

let adapterCache: { at: number; list: Adapter[] } | null = null;

/** Network adapters that are up, with their IPv4 addresses (Windows asks PowerShell for the descriptions). */
async function adapters(): Promise<Adapter[]> {
  if (adapterCache && Date.now() - adapterCache.at < 30_000) return adapterCache.list;
  let list: Adapter[] = Object.entries(networkInterfaces()).map(([name, addrs]) => ({
    name,
    description: "",
    ips: (addrs ?? []).filter((a) => a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254.")).map((a) => a.address),
  }));
  if (WIN) {
    const script =
      "Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { [pscustomobject]@{ name = $_.Name; description = $_.InterfaceDescription; " +
      "ips = @(Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | ForEach-Object IPAddress) } } | ConvertTo-Json -Compress";
    const fromPs = await new Promise<Adapter[] | null>((resolve) => {
      execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { timeout: 6000, windowsHide: true }, (err, stdout) => {
        if (err) return resolve(null);
        try {
          const parsed = JSON.parse(stdout);
          resolve((Array.isArray(parsed) ? parsed : [parsed]).map((a) => ({ name: a.name, description: a.description ?? "", ips: [a.ips ?? []].flat() })));
        } catch {
          resolve(null);
        }
      });
    });
    if (fromPs) list = fromPs;
  }
  adapterCache = { at: Date.now(), list };
  return list;
}

/** IPv4 addresses of the up adapters whose name or description matches. */
const adapterIps = async (match: RegExp) =>
  (await adapters()).filter((a) => match.test(a.name) || match.test(a.description)).flatMap((a) => a.ips.filter((ip) => !ip.startsWith("169.254.")));

/** The configured remote access and how it's doing right now. */
export async function getRemoteStatus(): Promise<RemoteStatus> {
  const config = remoteConfigFrom({ ...process.env, ...readEnvFile() });
  const label = REMOTE_PROVIDERS[config.provider].label;
  const result: RemoteStatus = { config, label, installed: false, connected: false, hosts: [] };
  if (config.provider === "none") return result;

  const local = LOCAL[config.provider];
  const names: string[] = [];
  const ips: string[] = [];
  if (config.provider === "tailscale") {
    const st = await cliJson<{ BackendState?: string; Self?: { DNSName?: string; TailscaleIPs?: string[] } }>(local.exe!, ["status", "--json"]);
    result.installed = st !== null || (WIN && existsSync(local.exe!));
    if (st?.BackendState === "Running") {
      result.connected = true;
      if (st.Self?.DNSName) names.push(st.Self.DNSName.replace(/\.$/, ""));
      ips.push(...(st.Self?.TailscaleIPs ?? []).filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip)));
    }
  } else if (config.provider === "netbird") {
    const st = await cliJson<{ management?: { connected?: boolean }; netbirdIp?: string; fqdn?: string }>(local.exe!, ["status", "--json"]);
    result.installed = st !== null || (WIN && existsSync(local.exe!));
    if (st?.management?.connected) {
      result.connected = true;
      if (st.fqdn) names.push(st.fqdn.replace(/\.$/, ""));
      if (st.netbirdIp) ips.push(st.netbirdIp.split("/")[0]);
    }
  } else {
    result.installed = local.exe ? !WIN || existsSync(local.exe) : true;
    const match = config.iface ? new RegExp(escapeRe(config.iface), "i") : local.adapter;
    if (match) ips.push(...(await adapterIps(match)));
    result.connected = ips.length > 0 || (config.provider === "custom" && !!config.address);
  }
  if (config.iface && (config.provider === "tailscale" || config.provider === "netbird")) {
    ips.push(...(await adapterIps(new RegExp(escapeRe(config.iface), "i"))));
  }
  // REMOTE_ADDRESS is the address you chose for the phone, so it goes first.
  result.hosts = [...new Set([config.address, ...names, ...ips].filter(Boolean))];
  return result;
}
