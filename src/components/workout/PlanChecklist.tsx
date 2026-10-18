import { Check } from "lucide-react";
import type { PlannedExercise } from "@/lib/programs";
import { exKey, type DoneCounts } from "@/lib/workout-plan";

/** The plan as a numbered list; tap an exercise to log it. Small dots show sets done. */
export default function PlanChecklist({
  plan,
  done,
  current,
  onChoose,
}: {
  plan: PlannedExercise[];
  done: DoneCounts;
  current: string;
  onChoose: (name: string) => void;
}) {
  return (
    <section aria-labelledby="plan">
      <h2 id="plan" className="mb-1 font-display text-xl font-semibold">
        Plan
      </h2>
      <p className="mb-2 text-sm text-muted">Tap an exercise to log it.</p>
      <ol className="divide-y divide-line">
        {plan.map((p, i) => (
          <PlanRow key={p.name} index={i} item={p} count={done[exKey(p.name)] ?? 0} current={exKey(p.name) === exKey(current)} onChoose={onChoose} />
        ))}
      </ol>
    </section>
  );
}

/** One exercise in the checklist. */
function PlanRow({
  index,
  item,
  count,
  current,
  onChoose,
}: {
  index: number;
  item: PlannedExercise;
  count: number;
  current: boolean;
  onChoose: (name: string) => void;
}) {
  const complete = count >= item.sets;
  return (
    <li>
      <button
        type="button"
        onClick={() => onChoose(item.name)}
        aria-current={current ? "step" : undefined}
        className="flex w-full items-center gap-3 py-3 text-left active:opacity-70"
      >
        <span
          aria-hidden
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[16px] font-bold ${
            complete ? "bg-plate-blue text-white" : current ? "bg-plate-white text-ink" : "bg-raised text-muted"
          }`}
        >
          {complete ? <Check size={17} strokeWidth={3} /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[17px] ${current ? "font-semibold" : ""}`}>{item.name}</span>
          <span className="block text-sm text-muted">
            {item.sets} × {item.reps}
          </span>
        </span>
        {/* One small plate per set: filled when logged. */}
        <span className="flex shrink-0 gap-1" aria-label={`${Math.min(count, item.sets)} of ${item.sets} sets done`}>
          {Array.from({ length: item.sets }, (_, k) => (
            <span key={k} className={`h-2.5 w-2.5 rounded-full ${k < count ? "bg-plate-blue" : "bg-raised"}`} />
          ))}
        </span>
      </button>
    </li>
  );
}
