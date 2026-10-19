// Previews and writes an ImportPlan. Anything already in your log is skipped, so importing the
// same file twice adds nothing; existing weigh-ins are never overwritten.
import "server-only";
import { prisma } from "@/lib/db";
import type { ImportPlan } from "./types";

export interface ImportSummary {
  foods: { new: number; duplicate: number };
  workouts: { new: number; duplicate: number; sets: number };
  weights: { new: number; duplicate: number };
  from: string | null;
  to: string | null;
  skipped: string[];
}

const foodKey = (f: { day: string; meal: string; name: string; calories: number }) => `${f.day}|${f.meal}|${f.name.toLowerCase()}|${Math.round(f.calories)}`;
const workoutKey = (w: { day: string; name: string | null }) => `${w.day}|${(w.name ?? "workout").toLowerCase()}`;

/** Splits the plan into what's new and what's already there. */
async function sortOut(plan: ImportPlan) {
  const days = [...plan.foods.map((f) => f.day), ...plan.workouts.map((w) => w.day), ...plan.weights.map((w) => w.day)].sort();
  const from = days[0] ?? null;
  const to = days.at(-1) ?? null;
  const range = from && to ? { gte: from, lte: to } : undefined;
  const [foods, workouts, weights] = await Promise.all([
    range ? prisma.foodEntry.findMany({ where: { day: range }, select: { day: true, meal: true, name: true, calories: true } }) : [],
    range ? prisma.workout.findMany({ where: { day: range }, select: { day: true, name: true } }) : [],
    range ? prisma.bodyWeight.findMany({ where: { day: range }, select: { day: true } }) : [],
  ]);
  const haveFood = new Set(foods.map(foodKey));
  const haveWorkout = new Set(workouts.map(workoutKey));
  const haveWeight = new Set(weights.map((w) => w.day));

  // Also de-duplicate inside the file itself.
  const newFoods = plan.foods.filter((f) => !haveFood.has(foodKey(f)) && (haveFood.add(foodKey(f)), true));
  const newWorkouts = plan.workouts.filter((w) => w.sets.length > 0 && !haveWorkout.has(workoutKey(w)) && (haveWorkout.add(workoutKey(w)), true));
  const newWeights = plan.weights.filter((w) => !haveWeight.has(w.day) && (haveWeight.add(w.day), true));
  return { from, to, newFoods, newWorkouts, newWeights };
}

/** What importing would add, without writing anything. */
export async function previewImport(plan: ImportPlan): Promise<ImportSummary> {
  const s = await sortOut(plan);
  return summary(plan, s);
}

function summary(plan: ImportPlan, s: Awaited<ReturnType<typeof sortOut>>): ImportSummary {
  return {
    foods: { new: s.newFoods.length, duplicate: plan.foods.length - s.newFoods.length },
    workouts: {
      new: s.newWorkouts.length,
      duplicate: plan.workouts.filter((w) => w.sets.length > 0).length - s.newWorkouts.length,
      sets: s.newWorkouts.reduce((n, w) => n + w.sets.length, 0),
    },
    weights: { new: s.newWeights.length, duplicate: plan.weights.length - s.newWeights.length },
    from: s.from,
    to: s.to,
    skipped: plan.skipped.slice(0, 20),
  };
}

/** Writes everything new, in one transaction (all or nothing). */
export async function commitImport(plan: ImportPlan): Promise<ImportSummary> {
  const s = await sortOut(plan);
  await prisma.$transaction(
    async (tx) => {
      if (s.newFoods.length) await tx.foodEntry.createMany({ data: s.newFoods.map((f) => ({ ...f, grams: f.grams ?? null })) });
      if (s.newWeights.length) await tx.bodyWeight.createMany({ data: s.newWeights });

      // Exercises by name (ignoring case), creating the ones you don't have yet.
      const exercises = new Map((await tx.exercise.findMany()).map((e) => [e.name.toLowerCase(), e.id]));
      for (const w of s.newWorkouts) {
        for (const set of w.sets) {
          const key = set.exercise.trim().toLowerCase();
          if (!exercises.has(key)) exercises.set(key, (await tx.exercise.create({ data: { name: set.exercise.trim().slice(0, 100) } })).id);
        }
        const workout = await tx.workout.create({ data: { day: w.day, name: w.name.slice(0, 100), notes: w.notes?.slice(0, 500) ?? null } });
        await tx.workoutSet.createMany({
          data: w.sets.map((set) => ({
            workoutId: workout.id,
            exerciseId: exercises.get(set.exercise.trim().toLowerCase())!,
            reps: set.reps,
            weightKg: Math.round(set.weightKg * 1000) / 1000,
            rpe: set.rpe ?? null,
            notes: set.notes?.slice(0, 500) ?? null,
            kind: set.kind ?? "work",
          })),
        });
      }
    },
    { timeout: 120_000 },
  );
  return summary(plan, s);
}
