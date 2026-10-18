import { ACTIVITY, type Activity } from "@/lib/energy";
import type { AppSettings } from "@/lib/settings";
import { card } from "@/lib/ui";
import { heightToDisplay, heightUnit, round, toDisplay } from "@/lib/units";
import Field from "./Field";
import Select from "./Select";

const PACES = [
  { v: 0.5, label: "Gentle: 0.5% of body weight a week" },
  { v: 0.6, label: "Steady: 0.6% a week (recommended)" },
  { v: 0.75, label: "Faster: 0.75% a week" },
  { v: 1, label: "Fastest safe pace: 1% a week" },
];

/** Body profile used by the calorie engine, plus pace. Height and weight follow the chosen units. */
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
        <Field
          name="height"
          text={`Height (${heightUnit(s.weightUnit)})`}
          value={s.heightCm ? round(heightToDisplay(s.heightCm, s.weightUnit), 1) : ""}
          inputMode="decimal"
          placeholder={s.weightUnit === "lb" ? "70" : "178"}
        />
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
    </section>
  );
}
