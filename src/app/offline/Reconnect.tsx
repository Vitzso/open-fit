"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { btnPrimary } from "@/lib/ui";
import { pingServer } from "@/services/connectivity.service";

/**
 * Keeps checking whether the PC is reachable and reloads as soon as it is,
 * e.g. once Tailscale reconnects after switching from Wi-Fi to mobile data.
 */
export default function Reconnect() {
  const [tries, setTries] = useState(0);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    if (await pingServer()) {
      // The service worker shows this page in place of whatever URL failed, so
      // reloading retries that page. Opened at /offline itself, go home instead.
      if (location.pathname === "/offline") location.replace("/");
      else location.reload();
      return;
    }
    setChecking(false);
    setTries((t) => t + 1);
  }

  useEffect(() => {
    const timer = setInterval(check, 5000);
    const onBack = () => void check();
    window.addEventListener("online", onBack);
    document.addEventListener("visibilitychange", onBack);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", onBack);
      document.removeEventListener("visibilitychange", onBack);
    };
  }, []);

  return (
    <div className="mt-2 flex flex-col items-center gap-2">
      <button className={btnPrimary} onClick={() => void check()} disabled={checking}>
        {checking ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />} Try again
      </button>
      <p className="text-xs text-faint">
        Retrying automatically every 5 seconds{tries > 0 ? ` · ${tries} ${tries === 1 ? "try" : "tries"}` : ""}
      </p>
    </div>
  );
}
