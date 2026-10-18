import { lenientNumber } from "@/lib/food-entry";
import type { Per100g } from "@/lib/nutrition";
import { input, label } from "@/lib/ui";

const KEYS = ["kcal", "protein", "carbs", "fat"] as const;

/** Shown when Open Food Facts lacks some values: lets you type them from the label. */
export default function MissingNutritionFields({ per100g, onChange }: { per100g: Per100g; onChange: (v: Per100g) => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
      Open Food Facts is missing some nutrition values for this product. Check the label and fill in per-100 g values:
      <div className="mt-2 grid grid-cols-4 gap-2">
        {KEYS.map((k) => (
          <div key={k}>
            <span className={label}>{k}</span>
            <input
              className={input}
              inputMode="decimal"
              defaultValue={per100g[k] || ""}
              onChange={(e) => onChange({ ...per100g, [k]: lenientNumber(e.target.value) })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
