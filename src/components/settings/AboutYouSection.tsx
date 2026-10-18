import { ACTIVITY, type Activity } from "@/lib/energy";
import type { AppSettings } from "@/lib/settings";
import { card, input, label } from "@/lib/ui";
import { round, toDisplay } from "@/lib/units";
import Field from "./Field";

const PACES = [
  { v: 0.5, label: "Gentle: 0.5% of body weight a week" },
  { v: 0.6, label: "Steady: 0.6% a week (recommended)" },
  { v: 0.75, label: "Faster: 0.75% a week" },
  { v: 1, label: "Fastest safe pace: 1% a week" },
];

/** A labelled <select> with uncontrolled default value. */
function Select({ name, text, value, children }: { name: string; text: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className={label}>
        {text}
      </label>
      <select id={name} name={name} className={input} defaultValue={value}>
        {children}
      </select>
    </div>
  );
}

/** Body profile used by the calorie engine, plus pace and units. */
export default function AboutYouSection({ s }: { s: AppSettings }) {
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="font-display text-xl font-semibold">About you</h2>
      <p className="-mt-2 text-sm text-muted">Used only on your PC to estimate your calorie needs.</p>
      <div className="grid grid-cols-2 gap-3">
        <Select name="sex" text="Sex" value={s.sex ?? ""}>
          <option value="">Choose</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </Select>
        <Field name="birthYear" text="Birth year" value={s.birthYear} placeholder="1990" />
        <Field name="heightCm" text="Height (cm)" value={s.heightCm} inputMode="decimal" placeholder="178" />
        <Field
          name="goalWeight"
          text={`Goal weight (${s.weightUnit})`}
          value={s.goalWeightKg ? round(toDisplay(s.goalWeightKg, s.weightUnit), 1) : ""}
          inputMode="decimal"
        />
      </div>
      <Select name="activityLevel" text="Daily activity (outside your workouts too)" value={s.activityLevel ?? ""}>
        <option value="">Choose</option>
        {(Object.keys(ACTIVITY) as Activity[]).map((a) => (
          <option key={a} value={a}>
            {ACTIVITY[a].label}: {ACTIVITY[a].hint}
          </option>
        ))}
      </Select>
      <Select name="weeklyLossPct" text="How fast do you want to lose fat?" value={String(s.weeklyLossPct)}>
        {PACES.map((p) => (
          <option key={p.v} value={String(p.v)}>
            {p.label}
          </option>
        ))}
      </Select>
      <Select name="weightUnit" text="Weight units" value={s.weightUnit}>
        <option value="kg">Kilograms (kg)</option>
        <option value="lb">Pounds (lb)</option>
      </Select>
    </section>
  );
}
