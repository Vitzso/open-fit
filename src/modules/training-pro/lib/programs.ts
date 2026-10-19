// Your own programs (Pro training module). A workout started from one stores
// templateId "user:<id>", so its plan can be shown like a ready-made one's.
import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { PlannedExercise } from "@/lib/programs";

export const USER_PREFIX = "user:";

/** The program id behind a workout's templateId, or null for ready-made / free-form workouts. */
export const userProgramId = (templateId: string | null | undefined): number | null => {
  const m = templateId?.match(/^user:(\d+)$/);
  return m ? Number(m[1]) : null;
};

export const ProgramInput = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(80),
  notes: z.string().trim().max(500).optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Every exercise needs a name.").max(100),
        sets: z.number().int().min(1).max(20),
        reps: z.string().trim().min(1).max(20),
        restSec: z.number().int().min(0).max(900),
      }),
    )
    .min(1, "Add at least one exercise.")
    .max(30),
});
export type ProgramData = z.infer<typeof ProgramInput>;

export const listUserPrograms = () =>
  prisma.userProgram.findMany({ orderBy: { updatedAt: "desc" }, include: { exercises: { orderBy: { position: "asc" } } } });

export const getUserProgram = (id: number) =>
  prisma.userProgram.findUnique({ where: { id }, include: { exercises: { orderBy: { position: "asc" } } } });

/** The plan for a workout started from one of your programs (null if it isn't one, or was deleted). */
export async function userPlanFor(templateId: string | null | undefined): Promise<PlannedExercise[] | null> {
  const id = userProgramId(templateId);
  if (id === null) return null;
  const p = await getUserProgram(id);
  return p ? p.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, restSec: e.restSec })) : null;
}
