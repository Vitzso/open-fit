import Link from "next/link";
import { Plus, ScanBarcode } from "lucide-react";
import { fmtInt, greeting } from "@/lib/format";
import type { Macros } from "@/lib/nutrition";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import MacroSummary, { type MacroGoals } from "./MacroSummary";

/** "You have 1,291 kcal left today" (or "over"), as one big sentence. */
function KcalSentence({ left }: { left: number }) {
  const over = left < 0;
  return (
    <p className="font-display leading-[0.95] font-bold">
      <span className="block text-[26px] text-muted">{over ? "You're" : "You have"}</span>
      <span className={`block text-[76px] tracking-tight ${over ? "text-plate-yellow" : ""}`}>{fmtInt(Math.abs(left))}</span>
      <span className="block text-[26px] text-muted">{over ? "kcal over today" : "kcal left today"}</span>
    </p>
  );
}

/** The one bold element on Today: calories left, progress bar, macros and quick food buttons. */
export default function FuelHero({ eaten, goals }: { eaten: Macros; goals: MacroGoals & { calorieGoal: number } }) {
  const left = goals.calorieGoal - eaten.calories;
  const eatenPct = Math.min(100, (eaten.calories / goals.calorieGoal) * 100);
  return (
    <section aria-label="Today's food" className="mb-8">
      <h1 className="mb-4 font-display text-[22px] font-semibold text-muted">{greeting()}.</h1>
      <KcalSentence left={left} />
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-raised" aria-hidden>
        <div className={`h-full rounded-full ${left >= 0 ? "bg-plate-green" : "bg-plate-yellow"}`} style={{ width: `${eatenPct}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {fmtInt(eaten.calories)} eaten of your {fmtInt(goals.calorieGoal)} kcal goal
      </p>
      <MacroSummary eaten={eaten} goals={goals} />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href="/nutrition/scan" className={btnPrimary}>
          <ScanBarcode size={19} /> Scan food
        </Link>
        <Link href="/nutrition/add" className={btnSecondary}>
          <Plus size={19} /> Add food
        </Link>
      </div>
    </section>
  );
}
