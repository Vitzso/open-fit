import Link from "next/link";
import { Sparkles } from "lucide-react";
import { applyCoachTargets } from "@/actions/settings";
import type { EnergyEstimate } from "@/lib/energy";
import { btnPrimary, card } from "@/lib/ui";
import { round, toDisplay, type WeightUnit } from "@/lib/units";

type Goals = { calorieGoal: number; proteinGoal: number; carbsGoal: number; fatGoal: number };

/** True when the app's goals already equal the computed targets. */
const goalsMatch = (e: EnergyEstimate, g: Goals) =>
  e.target === g.calorieGoal && e.protein === g.proteinGoal && e.carbs === g.carbsGoal && e.fat === g.fatGoal;

/** Where the maintenance figure came from, in one clause. */
function basisText(e: EnergyEstimate): string {
  return e.maintenanceSource === "your data"
    ? `, worked out from what you actually ate and how your weight moved over ${e.dataBasis?.days} days.`
    : ", estimated from your profile. Once you've logged 10+ days of food and 4+ weigh-ins, it will be based on your real data.";
}

/** The target, its macros and basis, plus a button to adopt it. */
function Target({ energy, goals, unit }: { energy: EnergyEstimate; goals: Goals; unit: WeightUnit }) {
  return (
    <>
      <p className="font-display leading-none font-bold">
        <span className="text-[44px]">{energy.target!.toLocaleString("en-US")}</span>
        <span className="ml-2 text-xl text-muted">kcal a day</span>
      </p>
      <p className="text-[15px] text-muted">
        Protein {energy.protein} g, carbs {energy.carbs} g, fat {energy.fat} g. That&apos;s about{" "}
        {round(toDisplay(energy.targetKgPerWeek ?? 0, unit), 2)} {unit} of fat loss a week from a maintenance of{" "}
        {energy.maintenance?.toLocaleString("en-US")} kcal
        {basisText(energy)}
        {energy.floorApplied ? " Raised to a safe minimum." : ""}
      </p>
      {goalsMatch(energy, goals) ? (
        <p className="text-[15px] text-plate-green">Your daily goals already match.</p>
      ) : (
        <form action={applyCoachTargets}>
          <button className={`${btnPrimary} w-full`}>Use these as my daily goals</button>
        </form>
      )}
    </>
  );
}

/** What's missing before a target can be computed. */
function MissingInfo({ needsWeighIn }: { needsWeighIn: boolean }) {
  return (
    <p className="text-[15px] text-muted">
      Fill in <span className="text-fg">About you</span> below
      {needsWeighIn ? (
        <>
          {" "}and{" "}
          <Link href="/weight" className="text-fg underline">
            log a weigh-in
          </Link>
        </>
      ) : null}{" "}
      so the coach can work out how many calories you need.
    </p>
  );
}

/** The coach's calorie estimate, with one tap to adopt it. */
export default function CalorieTargetCard({ energy, goals, unit }: { energy: EnergyEstimate; goals: Goals; unit: WeightUnit }) {
  return (
    <section aria-labelledby="estimate" className={`${card} mb-4 space-y-3`}>
      <h2 id="estimate" className="flex items-center gap-2 font-display text-xl font-semibold">
        <Sparkles size={18} className="text-plate-red" /> Your calorie target
      </h2>
      {energy.target ? <Target energy={energy} goals={goals} unit={unit} /> : <MissingInfo needsWeighIn={energy.missing.includes("a weigh-in")} />}
    </section>
  );
}
