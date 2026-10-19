import { WifiOff } from "lucide-react";
import Reconnect from "./Reconnect";

export const dynamic = "force-static";

/** Shown by the service worker when a page can't be fetched from the PC. */
export default function Offline() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center text-muted">
      <WifiOff size={36} />
      <h1 className="text-lg font-semibold text-fg">Can&apos;t reach your PC</h1>
      <ul className="max-w-xs space-y-1 text-left text-sm">
        <li>• Is the PC on, with the OpenFit launcher window open?</li>
        <li>• Away from home: is your VPN app (Tailscale, WireGuard, ZeroTier, NetBird…) switched on?</li>
        <li>• Just switched between Wi-Fi and mobile data? Give it a few seconds.</li>
      </ul>
      <Reconnect />
    </div>
  );
}
