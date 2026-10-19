import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Plate } from "@/components/PageHeader";
import type { Section } from "@/lib/ui";

/**
 * A headline number: label, value, and an optional change whose colour says whether
 * it's going the right way (green) or not (red), always with an arrow and words.
 */
export default function StatTile({
  section,
  label,
  value,
  unit,
  delta,
  detail,
}: {
  section: Section;
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; direction: "up" | "down" | "flat"; good: boolean | null } | null;
  detail?: string;
}) {
  const Arrow = delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : ArrowRight;
  const tone = delta?.good == null ? "text-muted" : delta.good ? "text-plate-green" : "text-plate-red";
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-muted">
        <Plate section={section} size={10} />
        {label}
      </p>
      <p className="mt-2 text-4xl font-semibold tracking-tight">
        {value}
        {unit && <span className="ml-1.5 text-lg font-medium text-muted">{unit}</span>}
      </p>
      {delta && (
        <p className={`mt-1.5 flex items-center gap-1 text-sm font-medium ${tone}`}>
          <Arrow size={16} aria-hidden />
          {delta.text}
        </p>
      )}
      {detail && <p className="mt-1 text-sm text-faint">{detail}</p>}
    </div>
  );
}
