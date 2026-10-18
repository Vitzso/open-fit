import { fmtRest, type PlannedExercise } from "@/lib/programs";

/** Ready-made workouts: which set you're on, the exercise, its target and rest. */
export default function PlannedHeader({ planned, doneHere }: { planned: PlannedExercise; doneHere: number }) {
  return (
    <div>
      <p className="text-sm text-muted">
        Set {Math.min(doneHere + 1, planned.sets)} of {planned.sets}
        {doneHere >= planned.sets ? " (extra set)" : ""}
      </p>
      <h2 className="font-display text-[30px] leading-tight font-bold">{planned.name}</h2>
      <p className="mt-0.5 text-[15px]">
        Target {planned.reps} reps<span className="text-muted">, rest {fmtRest(planned.restSec)}</span>
      </p>
    </div>
  );
}
