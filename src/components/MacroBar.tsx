/** One macro's progress towards its daily goal, e.g. "Protein 96 of 150 g". */
export default function MacroBar({
  label,
  value,
  goal,
  unit = "g",
  color,
}: {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  /** A Tailwind background class, e.g. "bg-plate-red". */
  color: string;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = goal > 0 && value > goal;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] font-medium">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${color}`} />
          {label}
        </span>
        <span className="text-sm text-muted">
          <span className={`font-display text-lg font-semibold ${over ? "text-plate-yellow" : "text-fg"}`}>{Math.round(value)}</span> / {goal}
          {unit}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={goal} aria-label={label}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
