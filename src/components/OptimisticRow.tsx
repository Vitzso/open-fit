"use client";

import { useState, useTransition } from "react";
import { Trash } from "lucide-react";
import { btnIcon } from "@/lib/ui";

/**
 * A list row with a delete button that hides the row immediately, then deletes
 * on the PC in the background. If the delete fails, the row comes back.
 * Saves a full round trip of "nothing happened" on mobile data.
 */
export default function OptimisticRow({
  onDelete,
  label,
  className,
  iconSize = 16,
  children,
}: {
  onDelete: () => Promise<void>;
  label: string;
  className?: string;
  iconSize?: number;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  if (hidden) return null;
  return (
    <li className={className}>
      {children}
      {failed && <span className="text-xs text-plate-red">Couldn&apos;t delete</span>}
      <button
        type="button"
        className={btnIcon}
        aria-label={label}
        onClick={() => {
          setHidden(true);
          setFailed(false);
          startTransition(async () => {
            try {
              await onDelete();
            } catch {
              setHidden(false);
              setFailed(true);
            }
          });
        }}
      >
        <Trash size={iconSize} />
      </button>
    </li>
  );
}
