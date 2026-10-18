import type { Macros } from "@/lib/nutrition";

export interface MacroGoals {
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
}

/** Protein, carbs and fat eaten vs goal, each with its plate colour. */
export default function MacroSummary({ eaten, goals }: { eaten: Macros; goals: MacroGoals }) {
  const rows = [
    { name: "Protein", v: eaten.protein, goal: goals.proteinGoal, color: "bg-plate-red" },
    { name: "Carbs", v: eaten.carbs, goal: goals.carbsGoal, color: "bg-plate-yellow" },
    { name: "Fat", v: eaten.fat, goal: goals.fatGoal, color: "bg-plate-blue" },
  ];
  return (
    <dl className="mt-5 grid grid-cols-3 gap-3">
      {rows.map((m) => (
        <div key={m.name}>
          <dt className="flex items-center gap-1.5 text-sm text-muted">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
            {m.name}
          </dt>
          <dd className="mt-0.5">
            <span className="font-display text-2xl font-semibold">{Math.round(m.v)}</span>
            <span className="text-sm text-muted"> / {m.goal} g</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
