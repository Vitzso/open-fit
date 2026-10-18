import Link from "next/link";
import { LoaderCircle, RefreshCw, Stethoscope, Trash, WifiOff } from "lucide-react";
import { btnIcon, card } from "@/lib/ui";
import type { CoachHealth } from "@/services/types";

/** Green dot / spinner / offline icon for the current status. */
function StatusIcon({ health }: { health: CoachHealth | null }) {
  if (health === null) return <LoaderCircle size={18} className="animate-spin text-muted" />;
  if (health.ok) return <span className="h-2.5 w-2.5 rounded-full bg-plate-green" />;
  return <WifiOff size={18} className="text-red-400" />;
}

/** "Coach is ready", or what's wrong and how to fix it. */
function StatusText({ health }: { health: CoachHealth | null }) {
  if (health === null) return <>Checking the coach…</>;
  if (health.ok) {
    return (
      <>
        <span className="block font-medium">Coach is ready</span>
        <span className="block truncate text-xs text-muted">Using {health.model} on your PC</span>
      </>
    );
  }
  return (
    <>
      <p className="text-red-300">{health.error?.error}</p>
      {health.error?.hint && <p className="mt-0.5 text-xs text-muted">{health.error.hint}</p>}
      <Link href="/settings" className="text-xs text-fg underline">
        Open settings
      </Link>
    </>
  );
}

/** Coach status with refresh, check-up and clear-conversation buttons. */
export default function CoachStatusBar({
  health,
  canClear,
  onRefresh,
  onClear,
}: {
  health: CoachHealth | null;
  canClear: boolean;
  onRefresh: () => void;
  onClear: () => void;
}) {
  return (
    <div className={`${card} flex items-center gap-3 py-3`}>
      <StatusIcon health={health} />
      <div className="min-w-0 flex-1 text-sm">
        <StatusText health={health} />
      </div>
      <button className={btnIcon} onClick={onRefresh} aria-label="Check the coach again">
        <RefreshCw size={16} />
      </button>
      <Link href="/coach/checkup" className={btnIcon} aria-label="AI check-up">
        <Stethoscope size={16} />
      </Link>
      {canClear && (
        <button className={btnIcon} onClick={onClear} aria-label="Clear conversation">
          <Trash size={16} />
        </button>
      )}
    </div>
  );
}
