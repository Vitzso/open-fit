// Exercise records.
import { prisma } from "./db";

/** Finds an exercise by name, ignoring case ("bench press" reuses "Bench Press"), or creates it. */
export async function findOrCreateExercise(name: string): Promise<{ id: number; name: string }> {
  const all = await prisma.exercise.findMany({ select: { id: true, name: true } });
  const existing = all.find((e) => e.name.toLowerCase() === name.toLowerCase());
  return existing ?? prisma.exercise.create({ data: { name }, select: { id: true, name: true } });
}
