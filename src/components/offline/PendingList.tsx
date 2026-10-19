"use client";

import { CloudOff } from "lucide-react";
import type { OutboxKind } from "@/lib/offline/outbox";
import { usePending } from "@/lib/offline/useOutbox";

/**
 * Entries logged on this phone that haven't reached the PC yet, shown on the screen they
 * belong to so nothing seems lost. They move into the normal list once they sync.
 */
export default function PendingList({
  kinds,
  day,
  workoutId,
  className = "",
}: {
  kinds: OutboxKind[];
  day?: string;
  workoutId?: number;
  className?: string;
}) {
  const items = usePending(kinds, { day, workoutId }).filter((i) => !i.failed);
  if (items.length === 0) return null;
  return (
    <section aria-label="Waiting to sync" className={`rounded-2xl border border-dashed border-line p-3 ${className}`}>
      <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted">
        <CloudOff size={15} /> Saved on this phone, waiting for your PC
      </p>
      <ul className="space-y-1 text-[15px]">
        {items.map((i) => (
          <li key={i.id}>{i.label}</li>
        ))}
      </ul>
    </section>
  );
}
