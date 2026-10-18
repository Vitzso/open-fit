"use client";

import { LoaderCircle, Plus } from "lucide-react";
import type { PlannedExercise } from "@/lib/programs";
import type { LastSession } from "@/lib/progression";
import { btnPrimary, card } from "@/lib/ui";
import { exKey, type DoneCounts, type LastSet } from "@/lib/workout-plan";
import ExerciseGuide from "./ExerciseGuide";
import ExercisePicker from "./ExercisePicker";
import PlanChecklist from "./PlanChecklist";
import PlannedHeader from "./PlannedHeader";
import RestPicker from "./RestPicker";
import RestTimer from "./RestTimer";
import SetFields from "./SetFields";
import SuggestionChip from "./SuggestionChip";
import { REST_OPTIONS, useWorkoutLogger } from "./useWorkoutLogger";

/**
 * Logs sets for one workout. With a plan (ready-made workout) it shows the
 * current exercise, its target and tip, a checklist of the plan, and moves on
 * to the next exercise when you finish the last set.
 */
export default function WorkoutLogger(props: {
  workoutId: number;
  unit: string;
  exercises: string[];
  last: Record<string, LastSet>;
  plan: PlannedExercise[] | null;
  /** Sets already logged in this workout, by lower-case exercise name. */
  done: DoneCounts;
  /** Each exercise's most recent previous session, by lower-case name, for progression tips. */
  lastSessions: Record<string, LastSession>;
}) {
  const { unit, exercises, last, plan, done } = props;
  const s = useWorkoutLogger(props);

  return (
    <div className="space-y-6">
      {s.restEnd && <RestTimer end={s.restEnd} onAdjust={(d) => s.setRestEnd(s.restEnd! + d * 1000)} onDone={() => s.setRestEnd(null)} />}

      {s.allDone && (
        <p className="rounded-[var(--radius-card)] bg-plate-blue/15 p-4 text-[15px]">
          <span className="font-semibold">Plan complete.</span> Nice work. Add extra sets below if you like.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          s.submit();
        }}
        className={`${card} space-y-4`}
      >
        {plan && s.planned ? (
          <PlannedHeader planned={s.planned} doneHere={s.doneHere} />
        ) : (
          <ExercisePicker value={s.fields.exercise} exercises={exercises} onChange={s.choose} />
        )}
        <ExerciseGuide exercise={s.fields.exercise} prev={last[exKey(s.fields.exercise)]} />
        {s.suggestion && <SuggestionChip suggestion={s.suggestion} onUse={s.applySuggestion} />}
        <SetFields fields={s.fields} unit={unit} onChange={s.setField} />
        {s.error && <p className="text-[15px] text-plate-red">{s.error}</p>}

        <button className={`${btnPrimary} w-full text-[17px]`} disabled={s.pending}>
          {s.pending ? <LoaderCircle size={19} className="animate-spin" /> : <Plus size={19} />} Log set
        </button>
        <RestPicker value={s.restLen} options={REST_OPTIONS} onChange={s.chooseRest} />
        <p className="text-xs text-faint">Effort (RPE) is how hard the set felt: 10 means you couldn&apos;t do another rep.</p>
      </form>

      {plan && <PlanChecklist plan={plan} done={done} current={s.fields.exercise} onChoose={s.choose} />}
    </div>
  );
}
