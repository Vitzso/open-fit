import type { AppSettings } from "@/lib/settings";
import { card } from "@/lib/ui";
import Field from "./Field";

/** Calories and macro goals, set by hand. */
export default function DailyGoalsSection({ s }: { s: AppSettings }) {
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="font-display text-xl font-semibold">Daily goals</h2>
      <p className="-mt-2 text-sm text-muted">Set them yourself, or use the coach&apos;s target above.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field name="calorieGoal" text="Calories (kcal)" value={s.calorieGoal} required />
        <Field name="proteinGoal" text="Protein (g)" value={s.proteinGoal} required />
        <Field name="carbsGoal" text="Carbs (g)" value={s.carbsGoal} required />
        <Field name="fatGoal" text="Fat (g)" value={s.fatGoal} required />
      </div>
    </section>
  );
}
