"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleDashed, CircleX, Download, LoaderCircle, RefreshCw } from "lucide-react";
import { btnIcon, btnPrimary, btnSecondary, card } from "@/lib/ui";
import { fetchSetupStatus } from "@/services/setup.service";
import type { PhoneAddress, SetupItem } from "@/services/types";
import { useModelDownload, type DownloadState } from "./useModelDownload";

/** Green check, grey dashed circle for optional parts, red cross for problems. */
function ItemIcon({ item }: { item: SetupItem }) {
  if (item.ok) return <CircleCheck size={18} className="mt-0.5 shrink-0 text-plate-green" />;
  if (item.optional) return <CircleDashed size={18} className="mt-0.5 shrink-0 text-muted" />;
  return <CircleX size={18} className="mt-0.5 shrink-0 text-plate-red" />;
}

/** Download button, or progress while the model downloads. */
function ModelDownload({ state, onStart, onCancel }: { state: DownloadState; onStart: () => void; onCancel: () => void }) {
  if (!state.running) {
    return (
      <>
        <button type="button" className={`${btnPrimary} mt-2 w-full`} onClick={onStart}>
          <Download size={16} /> Download model
        </button>
        {state.error && <p className="mt-1 text-sm text-plate-red">{state.error}</p>}
      </>
    );
  }
  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-2 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-plate-green transition-all" style={{ width: `${state.percent ?? 5}%` }} />
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {state.status}
          {state.percent !== null ? ` · ${state.percent}%` : ""}
        </span>
        <button type="button" className="underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** One checklist row with its detail and what to do about it. */
function Row({ item, download }: { item: SetupItem; download?: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <ItemIcon item={item} />
      <div className="min-w-0 flex-1 text-[15px]">
        <p className="font-medium">{item.label}</p>
        <p className="text-sm text-muted">{item.detail}</p>
        {!item.ok && item.fix && <p className="text-sm text-muted">→ {item.fix}</p>}
        {download}
      </div>
    </li>
  );
}

/** The addresses to type on a phone, detected live so a changed IP shows up by itself. */
function PhoneAddresses({ addresses }: { addresses: PhoneAddress[] }) {
  if (addresses.length === 0) return null;
  return (
    <div className="rounded-xl bg-raised p-3">
      <p className="text-sm font-medium">Open OpenFit on your phone at</p>
      <ul className="mt-1 space-y-0.5">
        {addresses.map((a) => (
          <li key={a.url} className="text-sm">
            <span className="font-mono text-fg select-all">{a.url}</span>
            <span className="text-muted"> · {a.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Setup" card: what's ready on the PC, phone addresses, and one-tap model download. */
export default function SetupChecklist() {
  const [items, setItems] = useState<SetupItem[] | null>(null);
  const [addresses, setAddresses] = useState<PhoneAddress[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** Re-runs every check. */
  const refresh = useCallback(async () => {
    setError(null);
    const r = await fetchSetupStatus();
    if (r.ok) {
      setItems(r.data.items);
      setAddresses(r.data.addresses ?? []);
    } else setError(r.error);
  }, []);

  const download = useModelDownload(() => void refresh());
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const problems = items?.filter((i) => !i.ok && !i.optional).length ?? 0;
  return (
    <section aria-labelledby="setup" className={`${card} mt-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <h2 id="setup" className="font-display text-xl font-semibold">
          Setup
        </h2>
        <button type="button" className={btnIcon} onClick={() => void refresh()} aria-label="Check setup again">
          <RefreshCw size={16} />
        </button>
      </div>
      {items === null && !error && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle size={16} className="animate-spin" /> Checking…
        </p>
      )}
      {error && <p className="text-sm text-plate-red">{error}</p>}
      {items && (
        <>
          <p className="-mt-1 text-sm text-muted">{problems === 0 ? "Everything needed is ready." : `${problems} thing${problems === 1 ? "" : "s"} to set up.`}</p>
          <ul className="space-y-3">
            {items.map((item) => (
              <Row
                key={item.id}
                item={item}
                download={item.id === "model" && !item.ok && items.some((i) => i.id === "ollama" && i.ok) ? (
                  <ModelDownload state={download.state} onStart={() => void download.start()} onCancel={download.cancel} />
                ) : undefined}
              />
            ))}
          </ul>
          <PhoneAddresses addresses={addresses} />
          <p className="text-xs text-faint">
            Missing something on the PC? Double-click <span className="text-muted">Setup.cmd</span> in the OpenFit folder. It installs what&apos;s missing and skips the rest.
          </p>
        </>
      )}
      {download.state.done && <p className={`${btnSecondary} pointer-events-none w-full`}>Model downloaded. The coach is ready.</p>}
    </section>
  );
}
