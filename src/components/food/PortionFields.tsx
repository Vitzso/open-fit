import { useId } from "react";
import type { Macros, Meal } from "@/lib/nutrition";
import { input, label } from "@/lib/ui";
import MacroStat from "./MacroStat";
import MealSelect from "./MealSelect";

/** For a scanned product: amount, meal, and a live preview of the scaled macros. */
export default function PortionFields({
  grams,
  onGrams,
  meal,
  onMeal,
  scaled,
}: {
  grams: string;
  onGrams: (v: string) => void;
  meal: Meal;
  onMeal: (m: Meal) => void;
  scaled: Macros;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor={id} className={label}>
          Amount (g / ml)
        </label>
        <input id={id} className={input} inputMode="decimal" value={grams} onChange={(e) => onGrams(e.target.value)} />
      </div>
      <MealSelect meal={meal} onChange={onMeal} />
      <div className="col-span-2 grid grid-cols-4 gap-2 rounded-xl bg-raised p-3 text-center">
        <MacroStat name="kcal" value={scaled.calories} />
        <MacroStat name="protein" value={scaled.protein} />
        <MacroStat name="carbs" value={scaled.carbs} />
        <MacroStat name="fat" value={scaled.fat} />
      </div>
    </div>
  );
}
