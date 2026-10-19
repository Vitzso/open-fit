"use server";
// Pro training module: your own programs.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { revalidateWorkouts } from "@/actions/revalidate";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { isModuleEnabled } from "@/lib/modules/server";
import { getUserProgram, ProgramInput, USER_PREFIX, type ProgramData } from "./lib/programs";

const id = z.number().int().positive();

async function requireModule() {
  if (!(await isModuleEnabled("training-pro"))) throw new Error("Pro training is switched off.");
}

/** Creates or updates one of your programs. Returns its id, or a message to show. */
export async function saveProgram(programId: number | null, data: ProgramData): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await requireModule();
  const parsed = ProgramInput.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the program." };
  const { name, notes, exercises } = parsed.data;
  const rows = exercises.map((e, position) => ({ ...e, position }));
  let savedId: number;
  if (programId === null) {
    savedId = (await prisma.userProgram.create({ data: { name, notes: notes || null, exercises: { create: rows } } })).id;
  } else {
    const pid = id.parse(programId);
    await prisma.$transaction([
      prisma.userProgramExercise.deleteMany({ where: { programId: pid } }),
      prisma.userProgram.update({ where: { id: pid }, data: { name, notes: notes || null, exercises: { create: rows } } }),
    ]);
    savedId = pid;
  }
  revalidatePath("/workouts/programs");
  revalidatePath("/workouts");
  return { ok: true, id: savedId };
}

/** Deletes one of your programs (workouts you did with it stay). */
export async function deleteProgram(programId: number) {
  await requireModule();
  await prisma.userProgram.deleteMany({ where: { id: id.parse(programId) } });
  revalidatePath("/workouts/programs");
  revalidatePath("/workouts");
  redirect("/workouts/programs");
}

/** Starts a workout from one of your programs and opens it. */
export async function startProgram(programId: number) {
  await requireModule();
  const p = await getUserProgram(id.parse(programId));
  if (!p) throw new Error("That program was deleted.");
  const w = await prisma.workout.create({ data: { day: dayKey(), name: p.name, templateId: `${USER_PREFIX}${p.id}` } });
  revalidateWorkouts();
  redirect(`/workouts/${w.id}`);
}
