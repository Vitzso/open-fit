import { Timer } from "lucide-react";
import { fmtRest } from "@/lib/programs";

/** "Rest timer after each set" selector; includes the current value even if it isn't a standard option. */
export default function RestPicker({ value, options, onChange }: { value: number; options: number[]; onChange: (sec: number) => void }) {
  const choices = [...new Set([...options, value])].sort((a, b) => a - b);
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor="rest" className="flex items-center gap-1.5 text-sm text-muted">
        <Timer size={16} /> Rest timer after each set
      </label>
      <select
        id="rest"
        className="h-9 shrink-0 rounded-full bg-raised px-3 text-sm text-fg outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {choices.map((s) => (
          <option key={s} value={s}>
            {fmtRest(s)}
          </option>
        ))}
      </select>
    </div>
  );
}
