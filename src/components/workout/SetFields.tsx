import { input, label } from "@/lib/ui";
import type { SetFields as Fields } from "@/lib/workout-plan";

const RPES = ["", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"];

/** Weight, reps, effort (RPE) and an optional note for one set. */
export default function SetFields({ fields, unit, onChange }: { fields: Fields; unit: string; onChange: (k: keyof Fields, v: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <label htmlFor="w" className={label}>
            Weight ({unit})
          </label>
          <input
            id="w"
            className={`${input} font-display text-xl`}
            inputMode="decimal"
            value={fields.weight}
            onChange={(e) => onChange("weight", e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor="r" className={label}>
            Reps
          </label>
          <input
            id="r"
            className={`${input} font-display text-xl`}
            inputMode="numeric"
            value={fields.reps}
            onChange={(e) => onChange("reps", e.target.value)}
            placeholder="8"
          />
        </div>
        <div>
          <label htmlFor="rpe" className={label}>
            Effort (RPE)
          </label>
          <select id="rpe" className={input} value={fields.rpe} onChange={(e) => onChange("rpe", e.target.value)}>
            {RPES.map((r) => (
              <option key={r} value={r}>
                {r || "–"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <input
        className={input}
        value={fields.notes}
        onChange={(e) => onChange("notes", e.target.value)}
        placeholder="Note (optional)"
        maxLength={500}
        aria-label="Note"
      />
    </>
  );
}
