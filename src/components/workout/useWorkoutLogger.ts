"use client";
// State and actions for the workout logger: current exercise, form fields,
// rest timer, progression suggestion, and saving a set.
import { useEffect, useMemo, useState } from "react";
import { dayKey } from "@/lib/dates";
import { enqueue } from "@/lib/offline/outbox";
import { usePending } from "@/lib/offline/useOutbox";
import type { PlannedExercise } from "@/lib/programs";
import { suggestNext, type LastSession } from "@/lib/progression";
import { newRecords, type Bests } from "@/modules/training-pro/lib/records-shared";
import { readStored, writeStored } from "@/lib/storage";
import {
  exKey,
  findPlanned,
  firstOpenExercise,
  initialFields,
  isPlanComplete,
  nextUnfinished,
  supersetNext,
  validateSetFields,
  type DoneCounts,
  type LastSet,
  type SetFields,
} from "@/lib/workout-plan";

export const REST_OPTIONS = [45, 60, 90, 120, 150, 180];
const REST_KEY = "openfit:restSeconds";

export interface WorkoutLoggerInput {
  workoutId: number;
  unit: string;
  last: Record<string, LastSet>;
  plan: PlannedExercise[] | null;
  done: DoneCounts;
  lastSessions: Record<string, LastSession>;
  /** Pro training module (when on): all-time bests per exercise, for personal-record alerts. */
  pro?: { bests: Record<string, Bests> } | null;
}

export type SetKind = "warmup" | "work" | "drop";

/** A personal record just set, for the celebration banner. */
export interface NewRecord {
  exercise: string;
  what: ("weight" | "e1rm" | "reps")[];
  weight: number;
  reps: number;
}

/** Everything the logger UI needs, with handlers. */
export function useWorkoutLogger({ workoutId, unit, last, plan, done: saved, lastSessions, pro }: WorkoutLoggerInput) {
  // Sets saved on the phone that haven't reached the PC yet count as done, so the plan moves on
  // even with no signal in the gym.
  const waiting = usePending(["set"], { workoutId });
  const done = useMemo(() => {
    const out: DoneCounts = { ...saved };
    for (const w of waiting) if (!w.failed && w.exercise && w.payload.kind !== "warmup") out[exKey(w.exercise)] = (out[exKey(w.exercise)] ?? 0) + 1;
    return out;
  }, [saved, waiting]);
  const [error, setError] = useState<string | null>(null);
  const firstOpen = firstOpenExercise(plan, done);
  // Start with the current exercise's planned rest; otherwise your last choice (loaded below).
  const [restLen, setRestLen] = useState(() => findPlanned(plan, firstOpen)?.restSec ?? 90);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [fields, setFields] = useState<SetFields>(() => initialFields(firstOpen, plan, last));
  // Pro training module: set type, and bests that update as you beat them.
  const [kind, setKind] = useState<SetKind>("work");
  const [bests, setBests] = useState<Record<string, Bests>>(() => pro?.bests ?? {});
  const [record, setRecord] = useState<NewRecord | null>(null);

  const planned = findPlanned(plan, fields.exercise);
  const doneHere = done[exKey(fields.exercise)] ?? 0;

  // Only before the first set of this exercise today: after that, your own sets guide you.
  const suggestion = useMemo(
    () =>
      doneHere === 0
        ? suggestNext(fields.exercise, lastSessions[exKey(fields.exercise)], planned?.reps, unit === "lb" ? "lb" : "kg")
        : null,
    [doneHere, fields.exercise, lastSessions, planned?.reps, unit],
  );

  // Free-form workouts remember your preferred rest; ready-made ones use each exercise's planned rest.
  useEffect(() => {
    if (plan) return;
    const saved = Number(readStored(REST_KEY));
    if (REST_OPTIONS.includes(saved)) setRestLen(saved);
  }, [plan]);

  /** Switches to another exercise (keeps typed values if it's the same one). */
  function choose(name: string) {
    setError(null);
    setFields((cur) => (exKey(cur.exercise) === exKey(name) ? cur : initialFields(name, plan, last)));
    const p = findPlanned(plan, name);
    if (p) setRestLen(p.restSec);
  }

  /** Sets and remembers the rest length. */
  function chooseRest(sec: number) {
    setRestLen(sec);
    writeStored(REST_KEY, String(sec));
  }

  /** Updates one form field. */
  const setField = (k: keyof SetFields, value: string) => setFields((cur) => ({ ...cur, [k]: value }));

  /** Fills in the suggested weight and reps. */
  function applySuggestion() {
    if (!suggestion) return;
    setFields((cur) => ({ ...cur, weight: String(suggestion.weight), reps: suggestion.reps ? String(suggestion.reps) : cur.reps }));
  }

  /** After the last planned set of an exercise, opens the next unfinished one. */
  function advanceIfFinished(exercise: string) {
    if (!plan || !planned || doneHere + 1 < planned.sets) return;
    const nextUp = nextUnfinished(plan, { ...done, [exKey(exercise)]: doneHere + 1 });
    if (nextUp) choose(nextUp.name);
  }

  /** Validates and saves the set, then starts the rest timer. */
  function submit() {
    setError(null);
    const v = validateSetFields(fields);
    if (!v.ok) return setError(v.error);
    // Saved on the phone and sent to the PC in the background (it waits if the PC can't be reached).
    const { exerciseName, weight, reps } = v.set;
    const thisKind: SetKind = pro ? kind : "work";
    // Personal records (Pro training): checked here, so they're celebrated even offline.
    if (pro && thisKind !== "warmup") {
      const k = exKey(exerciseName);
      const what = newRecords(bests[k], weight, reps);
      setRecord(what.length ? { exercise: exerciseName, what, weight, reps } : null);
      const e1rm = weight * (1 + reps / 30);
      setBests((b) => ({
        ...b,
        [k]: { weight: Math.max(b[k]?.weight ?? 0, weight), e1rm: Math.max(b[k]?.e1rm ?? 0, reps <= 1 ? weight : e1rm), reps: Math.max(b[k]?.reps ?? 0, reps) },
      }));
    }
    enqueue(
      "set",
      { workoutId, ...v.set, unit: unit === "lb" ? "lb" : "kg", ...(pro ? { kind: thisKind } : {}) },
      { label: `${exerciseName}: ${weight} ${unit} × ${reps}`, day: dayKey(), workoutId, exercise: exerciseName },
    );
    setFields((cur) => ({ ...cur, notes: "" }));
    // Supersets (Pro training programs): straight on to the next exercise of the group, and rest
    // only after a full round.
    const ss = thisKind !== "warmup" ? supersetNext(plan, exerciseName, { ...done, [exKey(exerciseName)]: doneHere + 1 }) : null;
    if (ss) {
      setRestEnd(ss.rest ? Date.now() + restLen * 1000 : null);
      if (exKey(ss.next.name) !== exKey(exerciseName)) choose(ss.next.name);
      return;
    }
    setRestEnd(Date.now() + restLen * 1000);
    // Warm-ups don't use up a planned set; the next set is a work set again.
    if (thisKind !== "warmup") advanceIfFinished(exerciseName);
    if (thisKind === "warmup") setKind("work");
  }

  return {
    fields,
    setField,
    planned,
    doneHere,
    suggestion,
    applySuggestion,
    error,
    pending: false,
    done,
    kind,
    setKind,
    record,
    dismissRecord: () => setRecord(null),
    /** Fills in a warm-up from the plate calculator. */
    applyWarmup: (weight: number, reps: number) => {
      setFields((cur) => ({ ...cur, weight: String(weight), reps: String(reps) }));
      setKind("warmup");
    },
    restLen,
    restEnd,
    setRestEnd,
    choose,
    chooseRest,
    submit,
    allDone: isPlanComplete(plan, done),
  };
}
