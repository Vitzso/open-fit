// Pure logic for logging a workout against a plan (no React, no database).
import type { PlannedExercise } from "./programs";
import { parseDecimal } from "./units";

/** Your previous set of an exercise, shown as "Last time: …". */
export interface LastSet {
  weight: number; // display unit
  reps: number;
  label: string; // e.g. "80 kg × 8 on 17 Oct"
}

/** What's typed into the set form. */
export interface SetFields {
  exercise: string;
  weight: string;
  reps: string;
  rpe: string;
  notes: string;
}

/** Sets logged so far in this workout, by `exKey(name)`. */
export type DoneCounts = Record<string, number>;

/** Case- and space-insensitive key for matching exercise names. */
export const exKey = (name: string) => name.trim().toLowerCase();

/** "8–10" → "8", "30 s" → "30", "As many as you can" → "". */
export const firstNumber = (reps: string) => reps.match(/\d+/)?.[0] ?? "";

/** The plan entry for an exercise, if it's in the plan. */
export const findPlanned = (plan: PlannedExercise[] | null, name: string) => plan?.find((p) => exKey(p.name) === exKey(name));

/** The first planned exercise that still has sets to do. */
export const nextUnfinished = (plan: PlannedExercise[], done: DoneCounts) => plan.find((p) => (done[exKey(p.name)] ?? 0) < p.sets);

/** True once every planned exercise has all its sets. */
export const isPlanComplete = (plan: PlannedExercise[] | null, done: DoneCounts) =>
  plan ? plan.every((p) => (done[exKey(p.name)] ?? 0) >= p.sets) : false;

/** Exercise to open first: the first unfinished one, else the first in the plan. */
export const firstOpenExercise = (plan: PlannedExercise[] | null, done: DoneCounts) =>
  (plan && nextUnfinished(plan, done)?.name) ?? plan?.[0]?.name ?? "";

/** Pre-fills the form: last weight, and the plan's target reps (or last reps). */
export function initialFields(name: string, plan: PlannedExercise[] | null, last: Record<string, LastSet>): SetFields {
  const planned = findPlanned(plan, name);
  const prev = last[exKey(name)];
  const prevReps = prev ? String(prev.reps) : "";
  return {
    exercise: name,
    weight: prev ? String(prev.weight) : "",
    reps: planned ? firstNumber(planned.reps) || prevReps : prevReps,
    rpe: "",
    notes: "",
  };
}

/** A set ready to save. */
export interface ValidSet {
  exerciseName: string;
  reps: number;
  weight: number;
  rpe: number | null;
  notes: string | null;
}

/** Checks the form and converts it to numbers, or returns the message to show. */
export function validateSetFields(f: SetFields): { ok: true; set: ValidSet } | { ok: false; error: string } {
  const reps = Number(f.reps.trim());
  const weight = f.weight.trim() ? parseDecimal(f.weight) : 0;
  if (!f.exercise.trim()) return { ok: false, error: "Choose an exercise first." };
  if (!f.reps.trim() || !Number.isInteger(reps) || reps < 0) return { ok: false, error: "Enter reps as a whole number." };
  if (!Number.isFinite(weight) || weight < 0) return { ok: false, error: "Enter the weight as a number, or 0 for bodyweight." };
  return {
    ok: true,
    set: { exerciseName: f.exercise.trim(), reps, weight, rpe: f.rpe ? Number(f.rpe) : null, notes: f.notes || null },
  };
}

/**
 * Supersets: after a work set of an exercise in a superset group, the next exercise of the group
 * that still has sets left, and whether to rest first (only after a full round, i.e. when it wraps
 * back to an earlier exercise). null when the exercise isn't in a group or the group is finished.
 */
export function supersetNext(plan: PlannedExercise[] | null, current: string, doneAfter: DoneCounts): { next: PlannedExercise; rest: boolean } | null {
  const p = findPlanned(plan, current);
  if (!plan || !p?.group) return null;
  const members = plan.filter((e) => e.group === p.group);
  const i = members.findIndex((e) => exKey(e.name) === exKey(current));
  for (let k = 1; k <= members.length; k++) {
    const m = members[(i + k) % members.length];
    if ((doneAfter[exKey(m.name)] ?? 0) < m.sets) return { next: m, rest: i + k >= members.length };
  }
  return null;
}
