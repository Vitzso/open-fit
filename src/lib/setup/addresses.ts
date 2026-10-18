// The addresses a phone can use to reach OpenFit on this PC, worked out live
// (so nothing is hard-coded and a changed IP shows up automatically).
import "server-only";
import { execFile } from "node:child_process";
import { networkInterfaces } from "node:os";

export interface PhoneAddress {
  /** e.g. "Home network" or "Anywhere (Tailscale)". */
  label: string;
  url: string;
}

/** Virtual adapters (WSL, Hyper-V, VirtualBox, VPN bridges) that a phone can't reach. */
const VIRTUAL = /vEthernet|VirtualBox|VMware|WSL|Hyper-V|Loopback|Docker|Tailscale/i;
const CACHE_MS = 60_000;
let cache: { ips: string[]; at: number } | null = null;

/** Windows: IPv4 addresses of adapters that have a router (default gateway), i.e. your real network. */
function gatewayAddresses(): Promise<string[] | null> {
  if (process.platform !== "win32") return Promise.resolve(null);
  const script =
    "Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | ForEach-Object { $_.IPv4Address.IPAddress }";
  return new Promise((resolve) => {
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { timeout: 5000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.split(/\s+/).filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip)));
    });
  });
}

/** Fallback when Windows can't be asked: every IPv4 address except obviously virtual adapters. */
function interfaceAddresses(): string[] {
  return Object.entries(networkInterfaces()).flatMap(([name, list]) =>
    (list ?? [])
      .filter((i) => i.family === "IPv4" && !i.internal && !i.address.startsWith("169.254.") && !VIRTUAL.test(name))
      .map((i) => i.address),
  );
}

/** This PC's local-network IPv4 addresses, cached for a minute. */
async function lanAddresses(): Promise<string[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.ips;
  const ips = (await gatewayAddresses()) ?? interfaceAddresses();
  cache = { ips, at: Date.now() };
  return ips;
}

/** Every address to open OpenFit at, using the protocol and port of the current request. */
export async function phoneAddresses(requestUrl: string, tailscaleName?: string): Promise<PhoneAddress[]> {
  const { protocol, port } = new URL(requestUrl);
  const suffix = port ? `:${port}` : "";
  const out = (await lanAddresses()).map((ip) => ({ label: "Home network", url: `${protocol}//${ip}${suffix}` }));
  if (tailscaleName) out.push({ label: "Anywhere (Tailscale)", url: `${protocol}//${tailscaleName}${suffix}` });
  return out;
}
