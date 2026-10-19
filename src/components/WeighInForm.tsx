"use client";

import { useState } from "react";
import { dayKey } from "@/lib/dates";
import { enqueue } from "@/lib/offline/outbox";
import { btnPrimary, card, input, label } from "@/lib/ui";
import { parseDecimal } from "@/lib/units";

/**
 * Logs a weigh-in. Saved on the phone first and sent to the PC in the background, so it works
 * with no connection; one per day, so the same day again replaces it.
 */
export default function WeighInForm({ unit, placeholder, first }: { unit: string; placeholder: string; first: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(dayKey());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const weight = parseDecimal(value);
    if (!(weight > 0 && weight <= 1500)) return setError("Enter your weight.");
    if (date > dayKey()) return setError("The date can't be in the future.");
    setError(null);
    enqueue("weight", { weight, unit, day: date }, { label: `Weigh-in: ${weight} ${unit}`, day: date });
    setValue("");
  }

  return (
    <form onSubmit={submit} className={`${card} mb-8`}>
      <h2 className="mb-1 font-display text-xl font-semibold">{first ? "Log your first weigh-in" : "Log a weigh-in"}</h2>
      {first ? <p className="mb-3 text-[15px] text-muted">After two weigh-ins you&apos;ll see your trend here.</p> : <div className="mb-3" />}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="min-w-0">
          <label htmlFor="weight" className={label}>
            Weight ({unit})
          </label>
          <input
            id="weight"
            name="weight"
            className={`${input} font-display text-xl`}
            inputMode="decimal"
            required
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="date" className={label}>
            Date
          </label>
          <input id="date" name="date" type="date" className={input} value={date} max={dayKey()} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {error && <p className="mt-2 text-[15px] text-plate-red">{error}</p>}
      <button className={`${btnPrimary} mt-3 w-full`}>Save weigh-in</button>
    </form>
  );
}
