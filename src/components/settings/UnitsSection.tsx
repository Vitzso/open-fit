import { WEEKDAYS } from "@/lib/dates";
import type { AppSettings } from "@/lib/settings";
import { card } from "@/lib/ui";
import Select from "./Select";

/** Display preferences: weight units (which also set height units) and the first day of the week. */
export default function UnitsSection({ s }: { s: AppSettings }) {
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="font-display text-xl font-semibold">Units and calendar</h2>
      <div className="grid grid-cols-2 gap-3">
        <Select name="weightUnit" text="Units" value={s.weightUnit}>
          <option value="kg">Metric (kg, cm)</option>
          <option value="lb">Imperial (lb, in)</option>
        </Select>
        <Select name="weekStart" text="Week starts on" value={String(s.weekStart)}>
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-sm text-muted">Your log is stored in kg and converted, so you can switch any time.</p>
    </section>
  );
}
