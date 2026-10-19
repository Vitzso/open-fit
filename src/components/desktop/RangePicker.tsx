import Link from "next/link";
import { RANGES, type RangeDays } from "@/lib/dashboard";

const LABEL: Record<RangeDays, string> = { 7: "7 days", 30: "30 days", 90: "3 months", 180: "6 months", 365: "1 year" };

/** Date-range presets. Every chart, number and the coach report below use the selected range. */
export default function RangePicker({ value }: { value: RangeDays }) {
  return (
    <nav aria-label="Date range" className="inline-flex rounded-full bg-surface p-1">
      {RANGES.map((r) => {
        const active = r === value;
        return (
          <Link
            key={r}
            href={`/desktop?range=${r}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-plate-white text-ink" : "text-muted hover:bg-raised hover:text-fg"
            }`}
          >
            {LABEL[r]}
          </Link>
        );
      })}
    </nav>
  );
}
