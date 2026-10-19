// All-time personal records per exercise, for the "new PR" celebration. Warm-up sets don't count.
import "server-only";
import { prisma } from "@/lib/db";
import { estimate1RM } from "@/lib/progression";
import { round, toDisplay, type WeightUnit } from "@/lib/units";
import type { Bests } from "./records-shared";

/** Best heaviest weight, estimated 1RM and reps for each exercise (lower-case name), excluding one workout. */
export async function getBests(unit: WeightUnit, excludeWorkoutId?: number): Promise<Record<string, Bests>> {
  const sets = await prisma.workoutSet.findMany({
    where: { kind: { not: "warmup" }, ...(excludeWorkoutId ? { workoutId: { not: excludeWorkoutId } } : {}) },
    select: { weightKg: true, reps: true, exercise: { select: { name: true } } },
  });
  const out: Record<string, Bests> = {};
  for (const s of sets) {
    const k = s.exercise.name.toLowerCase();
    const w = round(toDisplay(s.weightKg, unit), 1);
    const b = (out[k] ??= { weight: 0, e1rm: 0, reps: 0 });
    b.weight = Math.max(b.weight, w);
    b.e1rm = Math.max(b.e1rm, round(estimate1RM(w, s.reps), 1));
    b.reps = Math.max(b.reps, s.reps);
  }
  return out;
}
