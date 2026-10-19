"use server";
// Saves the remote-access choice to .env, where the launcher scripts read it too.
import { setEnvValues } from "@/lib/env-file";
import { asRemoteProvider, isAdapterName, isHostOrIp, isServerUrl } from "@/lib/remote-access";
import { revalidateAll } from "./revalidate";

export interface RemoteSaveResult {
  ok: boolean;
  message: string;
}

const fail = (message: string): RemoteSaveResult => ({ ok: false, message });

/**
 * Validates the Remote access form and writes REMOTE_* to .env. Used with useActionState, so the
 * card updates in place: redirecting back to /settings left the page blank on repeated saves.
 */
export async function saveRemoteAccess(_prev: RemoteSaveResult | null, formData: FormData): Promise<RemoteSaveResult> {
  const field = (k: string) => String(formData.get(k) ?? "").trim();
  const provider = asRemoteProvider(field("provider"));
  const address = field("address");
  const iface = field("interface");
  const loginServer = field("loginServer");

  if (!provider) return fail("Pick a remote access option.");
  if (address && !isHostOrIp(address)) return fail("The away address should be an IP address or a host name, like 100.64.0.5 or my-pc.example.com.");
  if (iface && !isAdapterName(iface)) return fail("The network adapter name has characters Windows doesn't use.");
  if (loginServer && !isServerUrl(loginServer)) return fail("The server address should start with https:// (or http://).");
  if (provider === "custom" && !address) return fail("For Other, enter the address your phone uses when away.");

  try {
    setEnvValues({
      REMOTE_ACCESS: provider,
      REMOTE_ADDRESS: provider === "none" ? "" : address,
      REMOTE_INTERFACE: provider === "none" ? "" : iface,
      REMOTE_LOGIN_SERVER: provider === "tailscale" || provider === "netbird" ? loginServer : "",
    });
  } catch {
    return fail("Couldn't write the .env file on the PC.");
  }
  revalidateAll();
  return {
    ok: true,
    message:
      provider === "none"
        ? "Saved. OpenFit is for your home Wi-Fi only."
        : "Saved. Run Setup on the PC if the app isn't installed yet, then restart OpenFit so the HTTPS certificate includes the new address.",
  };
}
