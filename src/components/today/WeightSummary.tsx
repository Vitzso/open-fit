import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Plate } from "@/components/PageHeader";
import WeightChart from "@/components/WeightChart";
import { fmtSigned } from "@/lib/format";

/** The line under the weight: the weekly change, or what to do next. */
function trendText(hasWeighIn: boolean, delta: number | null, unit: string): string {
  if (delta != null) return `${fmtSigned(delta)} ${unit} since last week`;
  return hasWeighIn ? "Weigh in again next week to see your trend." : "No weigh-ins yet. Tap to log one.";
}

/** Latest weight, weekly change and a mini chart; links to the Weight screen. */
export default function WeightSummary({ weights, delta, unit }: { weights: { day: string; value: number }[]; delta: number | null; unit: string }) {
  const latest = weights.at(-1);
  return (
    <Link href="/weight" className="group mb-2 block" aria-label="Body weight">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Plate section="weight" size={12} /> Weight
        </h2>
        <ChevronRight size={20} className="text-faint" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <p>
          <span className="font-display text-4xl font-bold">{latest ? latest.value : "–"}</span>
          <span className="ml-1 text-muted">{unit}</span>
          <span className="block text-sm text-muted">{trendText(!!latest, delta, unit)}</span>
        </p>
        <div className="w-32 shrink-0">
          <WeightChart points={weights} unit={unit} height={56} compact />
        </div>
      </div>
    </Link>
  );
}
