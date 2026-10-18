import type { ManualFood } from "@/lib/food-entry";
import type { Meal } from "@/lib/nutrition";
import { input, label } from "@/lib/ui";
import MealSelect from "./MealSelect";

const MACROS = ["calories", "protein", "carbs", "fat"] as const;

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
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <span className={label}>Food</span>
        <input className={input} placeholder="e.g. Chicken breast, 200 g" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      {MACROS.map((k) => (
        <div key={k}>
          <span className={label}>{k === "calories" ? "Calories (kcal)" : `${k} (g)`}</span>
          <input className={input} inputMode="decimal" value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
        </div>
      ))}
      <MealSelect meal={meal} onChange={onMeal} />
    </div>
  );
}
