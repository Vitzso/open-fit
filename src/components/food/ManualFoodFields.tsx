import { useId } from "react";
import type { ManualFood } from "@/lib/food-entry";
import type { Meal } from "@/lib/nutrition";
import { input, label } from "@/lib/ui";
import MealSelect from "./MealSelect";

const MACROS = ["calories", "protein", "carbs", "fat"] as const;
const LABEL: Record<(typeof MACROS)[number], string> = {
  calories: "Calories (kcal)",
  protein: "Protein (g)",
  carbs: "Carbs (g)",
  fat: "Fat (g)",
};

/** For food without a barcode match: name, calories, macros and meal. */
export default function ManualFoodFields({
  value,
  onChange,
  meal,
  onMeal,
}: {
  value: ManualFood;
  onChange: (v: ManualFood) => void;
  meal: Meal;
  onMeal: (m: Meal) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label htmlFor={`${id}-name`} className={label}>
          Food
        </label>
        <input id={`${id}-name`} className={input} placeholder="e.g. Chicken breast, 200 g" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      {MACROS.map((k) => (
        <div key={k}>
          <label htmlFor={`${id}-${k}`} className={label}>
            {LABEL[k]}
          </label>
          <input id={`${id}-${k}`} className={input} inputMode="decimal" value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
        </div>
      ))}
      <MealSelect meal={meal} onChange={onMeal} />
    </div>
  );
}
