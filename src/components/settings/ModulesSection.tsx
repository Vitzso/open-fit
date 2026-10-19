"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Puzzle } from "lucide-react";
import { setModuleEnabled } from "@/actions/modules";
import type { ModuleManifest } from "@/lib/modules/types";
import { card } from "@/lib/ui";

/** Settings → Modules: optional add-ons you switch on or off. */
export default function ModulesSection({ modules, enabled }: { modules: ModuleManifest[]; enabled: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(id: string, on: boolean) {
    setBusy(id);
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await setModuleEnabled(id, on);
        if (r.message) setMessage(r.message);
        router.refresh();
      } catch {
        setMessage("Couldn't change that. Check that your PC is reachable.");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <section id="modules" className={`${card} mt-4 scroll-mt-4`}>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Puzzle size={18} /> Modules
      </h2>
      <p className="mb-3 text-[15px] text-muted">Optional extras. Switch on what you want; the app stays simple without them.</p>
      <ul className="space-y-3">
        {modules.map((m) => {
          const on = enabled.includes(m.id);
          return (
            <li key={m.id} className="rounded-xl bg-raised p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-sm text-muted">{m.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${m.name} ${on ? "on" : "off"}`}
                  disabled={busy !== null}
                  onClick={() => toggle(m.id, !on)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-plate-green" : "bg-line"}`}
                >
                  <span className={`absolute top-0.5 flex size-6 items-center justify-center rounded-full bg-white transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`}>
                    {busy === m.id && <LoaderCircle size={14} className="animate-spin text-ink" />}
                  </span>
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {m.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check size={14} className={`mt-0.5 shrink-0 ${on ? "text-plate-green" : "text-faint"}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      {message && (
        <p role="status" className="mt-3 rounded-xl bg-raised p-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
