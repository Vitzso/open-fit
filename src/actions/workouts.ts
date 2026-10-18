"use server";
// Workout and set actions.
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { findOrCreateExercise } from "@/lib/exercises";
import { getTemplate } from "@/lib/programs";
import { getSettings } from "@/lib/settings";
import { fromDisplay } from "@/lib/units";
import { revalidateWorkout, revalidateWorkouts } from "./revalidate";
import { id, SetInput } from "./schemas";

/** Starts an empty workout (optionally named) and opens it. */
export async function startWorkout(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100) || null;
  const w = await prisma.workout.create({ data: { day: dayKey(), name } });
  revalidateWorkouts();
  redirect(`/workouts/${w.id}`);
}

/** Starts a ready-made workout from src/lib/programs.ts and opens it. */
export async function startWorkoutFromTemplate(templateId: string) {
  const template = getTemplate(z.string().max(40).parse(templateId));
  if (!template) throw new Error("Unknown workout template.");
  const w = await prisma.workout.create({ data: { day: dayKey(), name: template.name, templateId: template.id } });
  revalidateWorkouts();
  redirect(`/workouts/${w.id}`);
}

/** Deletes a workout and its sets, then returns to the workout list. */
export async function deleteWorkout(workoutId: number) {
  await prisma.workout.deleteMany({ where: { id: id.parse(workoutId) } });
  revalidateWorkouts();
  redirect("/workouts");
}

/** Logs one set. The weight arrives in the user's display unit and is stored in kg. */
export async function addSet(input: z.input<typeof SetInput>) {
  const data = SetInput.parse(input);
  const [{ weightUnit }, workout] = await Promise.all([
    getSettings(),
    prisma.workout.findUnique({ where: { id: data.workoutId }, select: { id: true } }),
  ]);
  if (!workout) throw new Error("This workout was deleted.");
  const exercise = await findOrCreateExercise(data.exerciseName);
  await prisma.workoutSet.create({
    data: {
      workoutId: data.workoutId,
      exerciseId: exercise.id,
      reps: data.reps,
      weightKg: fromDisplay(data.weight, weightUnit),
      rpe: data.rpe ?? null,
      notes: data.notes || null,
    },
  });
  revalidateWorkout(data.workoutId);
}

/** Deletes one set. */
export async function deleteSet(setId: number, workoutId: number) {
  await prisma.workoutSet.deleteMany({ where: { id: id.parse(setId) } });
  revalidateWorkout(id.parse(workoutId));
}
