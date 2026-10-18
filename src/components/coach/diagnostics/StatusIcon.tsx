import { CircleCheck, CircleMinus, CircleX, TriangleAlert } from "lucide-react";
import type { CheckStatus } from "@/services/types";

/** Coloured icon for a check result. */
export default function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "pass":
      return <CircleCheck size={18} className="shrink-0 text-plate-green" />;
    case "warn":
      return <TriangleAlert size={18} className="shrink-0 text-amber-400" />;
    case "fail":
      return <CircleX size={18} className="shrink-0 text-red-400" />;
    default:
      return <CircleMinus size={18} className="shrink-0 text-muted" />;
  }
}

/** Milliseconds as "850 ms" or "2.4 s". */
export const fmtDuration = (ms?: number) => (ms === undefined ? "" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
