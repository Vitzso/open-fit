"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

/** Shown instead of a blank crash page when a page or action fails. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <TriangleAlert size={36} className="text-amber-400" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-xs text-sm text-muted">
        Your data is safe. This is usually a lost connection to your PC or a value that couldn&apos;t be saved.
      </p>
      {error.digest && <p className="text-xs text-faint">Error ref: {error.digest}</p>}
      <div className="flex gap-2">
        <button className={btnPrimary} onClick={reset}>
          <RefreshCw size={16} /> Try again
        </button>
        <Link href="/" className={btnSecondary}>
          Home
        </Link>
      </div>
    </div>
  );
}
