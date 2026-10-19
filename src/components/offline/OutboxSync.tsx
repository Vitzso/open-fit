"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { discard, flush, retry, SYNCED_EVENT, type FlushResult } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";
import { warmOfflineCache } from "@/lib/offline/warm";

/**
 * Sends the phone's outbox to the PC whenever there's a chance it's reachable (app opened or
 * brought back, network back, every 15 s while something waits) and refreshes the page after.
 * Shows a small pill above the tab bar while entries wait, and lists any the PC refused.
 */
export default function OutboxSync() {
  const router = useRouter();
  const items = useOutbox();
  const [state, setState] = useState<FlushResult | "idle">("idle");
  const [open, setOpen] = useState(false);
  const waiting = items.filter((i) => !i.failed);
  const failed = items.filter((i) => i.failed);

  useEffect(() => {
    const run = () => {
      setState("busy");
      void flush().then((result) => {
        setState(result);
        // The PC answered: refresh the copies of the main screens kept for when it can't be reached.
        if (result === "done") void warmOfflineCache();
      });
    };
    const onVisible = () => document.visibilityState === "visible" && run();
    const onSynced = () => router.refresh();
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(SYNCED_EVENT, onSynced);
    const timer = setInterval(() => {
      if (waitingCount() > 0) run();
    }, 15_000);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(SYNCED_EVENT, onSynced);
      clearInterval(timer);
    };
  }, [router]);

  if (items.length === 0) return null;

  const syncing = state === "busy";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-30 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-sm">
        {open && (
          <div className="mb-2 max-h-72 overflow-auto rounded-2xl border border-line bg-surface p-3 text-sm shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Saved on this phone</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted">
                <X size={16} />
              </button>
            </div>
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.id} className="flex items-start gap-2">
                  <span className="flex-1">
                    <span className="block">{i.label}</span>
                    <span className={i.failed ? "text-plate-red" : "text-faint"}>{i.failed ?? `Waiting for your PC · ${i.day}`}</span>
                  </span>
                  {i.failed && (
                    <>
                      <button type="button" className="text-muted underline" onClick={() => retry(i.id)}>
                        Retry
                      </button>
                      <button type="button" className="text-muted underline" onClick={() => discard(i.id)}>
                        Discard
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
            failed.length ? "bg-plate-red/90 text-white" : "bg-raised text-fg"
          }`}
          aria-expanded={open}
        >
          {failed.length ? <TriangleAlert size={16} /> : syncing ? <LoaderCircle size={16} className="animate-spin" /> : <CloudOff size={16} />}
          {failed.length
            ? `${failed.length} couldn't be saved. Tap to see`
            : syncing
              ? `Syncing ${waiting.length}…`
              : `${waiting.length} saved on this phone, waiting for your PC`}
        </button>
      </div>
    </div>
  );
}

/** Read straight from the outbox inside the timer, so the interval doesn't need re-creating. */
function waitingCount() {
  try {
    return (JSON.parse(localStorage.getItem("openfit:outbox:v1") ?? "[]") as { failed?: string }[]).filter((i) => !i.failed).length;
  } catch {
    return 0;
  }
}
