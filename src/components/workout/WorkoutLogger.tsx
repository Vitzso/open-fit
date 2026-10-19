"use client";

import { LoaderCircle, Plus, Trophy, X } from "lucide-react";
import type { PlannedExercise } from "@/lib/programs";
import type { LastSession } from "@/lib/progression";
import { btnPrimary, card, input, label } from "@/lib/ui";
import LibraryPicker from "@/modules/training-pro/components/LibraryPicker";
import PlateCalculator from "@/modules/training-pro/components/PlateCalculator";
import type { Bests } from "@/modules/training-pro/lib/records-shared";
import { parseDecimal } from "@/lib/units";
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
  /** Pro training module, when switched on: all-time bests (PR alerts) and library photos by lower-case name. */
  pro?: { bests: Record<string, Bests>; media: Record<string, { start: string; end: string }> } | null;
}) {
  const { unit, exercises, last, plan, pro } = props;
  const s = useWorkoutLogger(props);
  const what = { weight: "heaviest weight", e1rm: "best estimated 1RM", reps: "most reps" } as const;

  return (
    <div className="space-y-6">
      {s.restEnd && <RestTimer end={s.restEnd} onAdjust={(d) => s.setRestEnd(s.restEnd! + d * 1000)} onDone={() => s.setRestEnd(null)} />}

      {s.record && (
        <div role="status" className="flex items-start gap-3 rounded-[var(--radius-card)] bg-plate-yellow/20 p-4">
          <Trophy size={22} className="mt-0.5 shrink-0 text-plate-yellow" />
          <p className="flex-1 text-[15px]">
            <span className="font-semibold">New personal record!</span> {s.record.exercise}: {s.record.weight > 0 ? `${s.record.weight} ${unit} × ` : ""}
            {s.record.reps}, your {s.record.what.map((w) => what[w]).join(" and ")} ever.
          </p>
          <button type="button" onClick={s.dismissRecord} aria-label="Dismiss" className="text-muted">
            <X size={16} />
          </button>
        </div>
      )}

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
          pro ? (
            <LibraryPicker value={s.fields.exercise} onChange={s.choose} recent={exercises} />
          ) : (
            <ExercisePicker value={s.fields.exercise} exercises={exercises} onChange={s.choose} />
          )
        )}
        <ExerciseGuide exercise={s.fields.exercise} prev={last[exKey(s.fields.exercise)]} media={pro?.media[exKey(s.fields.exercise)]} />
        {s.suggestion && <SuggestionChip suggestion={s.suggestion} onUse={s.applySuggestion} />}
        <SetFields fields={s.fields} unit={unit} onChange={s.setField} />
        {pro && (
          <div className="grid grid-cols-2 items-end gap-2.5">
            <div>
              <label htmlFor="set-kind" className={label}>
                Set type
              </label>
              <select id="set-kind" className={input} value={s.kind} onChange={(e) => s.setKind(e.target.value as typeof s.kind)}>
                <option value="work">Work set</option>
                <option value="warmup">Warm-up</option>
                <option value="drop">Drop set</option>
              </select>
            </div>
            <PlateCalculator weight={parseDecimal(s.fields.weight)} unit={unit} onUseWarmup={s.applyWarmup} />
          </div>
        )}
        {s.error && <p className="text-[15px] text-plate-red">{s.error}</p>}

        <button className={`${btnPrimary} w-full text-[17px]`} disabled={s.pending}>
          {s.pending ? <LoaderCircle size={19} className="animate-spin" /> : <Plus size={19} />} Log set
        </button>
        <RestPicker value={s.restLen} options={REST_OPTIONS} onChange={s.chooseRest} />
        <p className="text-xs text-faint">Effort (RPE) is how hard the set felt: 10 means you couldn&apos;t do another rep.</p>
      </form>

      {plan && <PlanChecklist plan={plan} done={s.done} current={s.fields.exercise} onChoose={s.choose} />}
    </div>
  );
}
