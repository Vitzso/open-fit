"use client";
// State and actions for the workout logger: current exercise, form fields,
// rest timer, progression suggestion, and saving a set.
import { useEffect, useMemo, useState, useTransition } from "react";
import { addSet } from "@/actions/workouts";
import type { PlannedExercise } from "@/lib/programs";
import { suggestNext, type LastSession } from "@/lib/progression";
import { readStored, writeStored } from "@/lib/storage";
import {
  exKey,
  findPlanned,
  firstOpenExercise,
  initialFields,
  isPlanComplete,
  nextUnfinished,
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
}

/** Everything the logger UI needs, with handlers. */
export function useWorkoutLogger({ workoutId, unit, last, plan, done, lastSessions }: WorkoutLoggerInput) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const firstOpen = firstOpenExercise(plan, done);
  // Start with the current exercise's planned rest; otherwise your last choice (loaded below).
  const [restLen, setRestLen] = useState(() => findPlanned(plan, firstOpen)?.restSec ?? 90);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [fields, setFields] = useState<SetFields>(() => initialFields(firstOpen, plan, last));

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
    startTransition(async () => {
      try {
        await addSet({ workoutId, ...v.set });
        setFields((cur) => ({ ...cur, notes: "" }));
        setRestEnd(Date.now() + restLen * 1000);
        advanceIfFinished(v.set.exerciseName);
      } catch {
        setError("That set wasn't saved. Check your connection and try again.");
      }
    });
  }

  return {
    fields,
    setField,
    planned,
    doneHere,
    suggestion,
    applySuggestion,
    error,
    pending,
    restLen,
    restEnd,
    setRestEnd,
    choose,
    chooseRest,
    submit,
    allDone: isPlanComplete(plan, done),
  };
}
