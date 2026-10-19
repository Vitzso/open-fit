import { useId } from "react";
import { MEALS, type Meal } from "@/lib/nutrition";
import { input, label } from "@/lib/ui";

/** Breakfast / Lunch / Dinner / Snack picker. */
export default function MealSelect({ meal, onChange }: { meal: Meal; onChange: (m: Meal) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={label}>
        Meal
      </label>
      <select id={id} className={input} value={meal} onChange={(e) => onChange(e.target.value as Meal)}>
        {MEALS.map((m) => (
          <option key={m} value={m}>
            {m[0].toUpperCase() + m.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
