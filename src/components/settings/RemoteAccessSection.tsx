"use client";

import { startTransition, useActionState, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { saveRemoteAccess } from "@/actions/remote-access";
import { REMOTE_PROVIDER_IDS, REMOTE_PROVIDERS, type RemoteConfig, type RemoteProvider } from "@/lib/remote-access";
import { btnSecondary, card, input, label } from "@/lib/ui";

/**
 * How the phone reaches the PC away from home: Tailscale, WireGuard, ZeroTier, NetBird,
 * your own address, or nothing. Saved to .env so Setup and the launcher use it too.
 */
export default function RemoteAccessSection({
  config,
  status,
}: {
  config: RemoteConfig;
  status: { connected: boolean; installed: boolean; hosts: string[] };
}) {
  const [provider, setProvider] = useState<RemoteProvider>(config.provider);
  // Saves in place (no redirect) and shows the result inside the card. Submitted by hand rather than
  // with <form action>, because React then resets the form: the dropdown jumped back to the provider
  // from when the page loaded, and a refused save wiped what you typed.
  const [result, formAction, saving] = useActionState(saveRemoteAccess, null);
  const info = REMOTE_PROVIDERS[provider];
  const current = provider === config.provider;
  const showDetails = provider !== "none";

  return (
    <section id="remote" className={`${card} mt-4 scroll-mt-4`}>
      <h2 className="font-display text-xl font-semibold">Remote access</h2>
      <p className="mb-3 text-[15px] text-muted">
        Use OpenFit away from home. Your PC and iPhone join the same private network, so OpenFit is never open to the internet.
      </p>

      {current && config.provider !== "none" && (
        <p className={`mb-3 rounded-xl p-3 text-[15px] ${status.connected ? "bg-plate-green/15" : "bg-plate-yellow/15"}`}>
          {status.connected
            ? `${REMOTE_PROVIDERS[config.provider].label} is connected. Away from home, open OpenFit at ${status.hosts[0] ?? "this PC's address"}.`
            : !status.installed
              ? `${REMOTE_PROVIDERS[config.provider].label} isn't installed on the PC yet. Run Setup (Setup.cmd) to install it.`
              : `${REMOTE_PROVIDERS[config.provider].label} is installed but not connected on the PC.`}
        </p>
      )}

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        <div>
          <label htmlFor="remoteProvider" className={label}>
            Private network
          </label>
          <select id="remoteProvider" name="provider" className={input} value={provider} onChange={(e) => setProvider(e.target.value as RemoteProvider)}>
            {REMOTE_PROVIDER_IDS.map((id) => (
              <option key={id} value={id}>
                {REMOTE_PROVIDERS[id].label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-sm text-muted">
            {info.blurb}{" "}
            {info.site && (
              <a href={info.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fg underline">
                Website <ExternalLink size={12} />
              </a>
            )}
          </p>
        </div>

        {showDetails && (
          <div>
            <label htmlFor="remoteAddress" className={label}>
              {provider === "custom" ? "Address your phone uses when away" : "Away address (optional)"}
            </label>
            <input
              id="remoteAddress"
              name="address"
              className={input}
              defaultValue={config.address}
              placeholder={provider === "custom" ? "e.g. 10.8.0.1 or my-pc.example.com" : "Detected automatically"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        )}

        {showDetails && (
          <details className="text-sm" open={Boolean(config.iface || config.loginServer)}>
            <summary className="cursor-pointer text-muted">Advanced</summary>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="remoteInterface" className={label}>
                  Network adapter on the PC (optional)
                </label>
                <input
                  id="remoteInterface"
                  name="interface"
                  className={input}
                  defaultValue={config.iface}
                  placeholder="e.g. wg0 or OpenVPN TAP"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="mt-1 text-muted">Which adapter to read this PC&apos;s address from, if it has several tunnels.</p>
              </div>
              {info.loginServer && (
                <div>
                  <label htmlFor="remoteLoginServer" className={label}>
                    {info.loginServer}
                  </label>
                  <input
                    id="remoteLoginServer"
                    name="loginServer"
                    className={input}
                    defaultValue={config.loginServer}
                    placeholder="https://"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </details>
        )}

        <button className={`${btnSecondary} w-full`} disabled={saving}>
          {saving && <LoaderCircle size={16} className="animate-spin" />}
          Save remote access
        </button>
        {result ? (
          <p role="status" className={`rounded-xl p-3 text-[15px] ${result.ok ? "bg-plate-green/15" : "bg-plate-red/15"}`}>
            {result.ok ? result.message : `Not saved: ${result.message}`}
          </p>
        ) : (
          <p className="text-sm text-faint">
            After a change, run Setup on the PC to install the app if needed, then restart OpenFit so the HTTPS certificate covers the new address.
          </p>
        )}
      </form>
    </section>
  );
}
