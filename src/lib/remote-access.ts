// The remote-access choices (how the phone reaches this PC away from home) and their settings.
// Pure: shared by the Settings form, the setup checklist and the save action.
// The PowerShell side (launcher/setup/remote.ps1) keeps the same ids and .env keys.

export const REMOTE_PROVIDERS = {
  tailscale: {
    label: "Tailscale",
    blurb: "Easiest. Free for personal use; also works with Headscale, its open-source server.",
    loginServer: "Headscale server URL (optional)",
    site: "https://tailscale.com",
  },
  wireguard: {
    label: "WireGuard",
    blurb: "Open source. You set up the tunnel yourself (on your router or a server) and import it on the PC and iPhone.",
    loginServer: null,
    site: "https://www.wireguard.com",
  },
  zerotier: {
    label: "ZeroTier",
    blurb: "Open source. Join the same network on the PC and the iPhone; works with your own controller too.",
    loginServer: null,
    site: "https://www.zerotier.com",
  },
  netbird: {
    label: "NetBird",
    blurb: "Open source, WireGuard-based, with a free cloud or your own server.",
    loginServer: "Self-hosted management URL (optional)",
    site: "https://netbird.io",
  },
  custom: {
    label: "Other",
    blurb: "Anything else (OpenVPN, Nebula, a router VPN, a port forward): enter the address your phone uses.",
    loginServer: null,
    site: null,
  },
  none: {
    label: "None",
    blurb: "Home Wi-Fi only.",
    loginServer: null,
    site: null,
  },
} as const;

export type RemoteProvider = keyof typeof REMOTE_PROVIDERS;
export const REMOTE_PROVIDER_IDS = Object.keys(REMOTE_PROVIDERS) as RemoteProvider[];

export interface RemoteConfig {
  provider: RemoteProvider;
  /** False when REMOTE_ACCESS isn't set (then it means Tailscale, as before the option existed). */
  explicit: boolean;
  /** REMOTE_ADDRESS: the IP or name the phone uses when away. */
  address: string;
  /** REMOTE_INTERFACE: the network adapter to read this PC's address from. */
  iface: string;
  /** REMOTE_LOGIN_SERVER: Headscale / self-hosted NetBird URL. */
  loginServer: string;
}

export const asRemoteProvider = (v: string | null | undefined): RemoteProvider | null =>
  REMOTE_PROVIDER_IDS.includes((v ?? "").trim().toLowerCase() as RemoteProvider) ? ((v ?? "").trim().toLowerCase() as RemoteProvider) : null;

/** Builds the config from .env-style values. */
export function remoteConfigFrom(env: Record<string, string | undefined>): RemoteConfig {
  const chosen = asRemoteProvider(env.REMOTE_ACCESS);
  return {
    provider: chosen ?? "tailscale",
    explicit: chosen !== null,
    address: (env.REMOTE_ADDRESS ?? "").trim(),
    iface: (env.REMOTE_INTERFACE ?? "").trim(),
    loginServer: (env.REMOTE_LOGIN_SERVER ?? "").trim(),
  };
}

/** An IPv4 address or a DNS name (letters, digits, dots, hyphens). Nothing that could break .env. */
export const isHostOrIp = (s: string) => /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?)*$/.test(s);

/** An adapter name as Windows shows it, e.g. "wg0" or "OpenVPN TAP-Windows6". */
export const isAdapterName = (s: string) => /^[A-Za-z0-9 ()._#*-]{1,64}$/.test(s);

/** An http(s) URL with no spaces or quotes. */
export const isServerUrl = (s: string) => /^https?:\/\/[^\s"'\\]{1,200}$/.test(s);
