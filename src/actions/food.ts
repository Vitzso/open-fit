"use server";
// Food log actions.
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { revalidateFood } from "./revalidate";
import { FoodEntryInput, id, pastDay } from "./schemas";

/** Logs a food entry (scanned or typed in). */
export async function addFoodEntry(input: z.input<typeof FoodEntryInput>) {
  const data = FoodEntryInput.parse(input);
  await prisma.foodEntry.create({ data: { ...data, day: data.day ?? dayKey() } });
  revalidateFood();
}

/** Logs a copy of an earlier entry, for one-tap "ate this again". */
export async function relogFoodEntry(entryId: number, meal: string, day?: string) {
  const args = z.object({ entryId: id, meal: z.enum(MEALS), day: pastDay }).parse({ entryId, meal, day });
  const src = await prisma.foodEntry.findUnique({ where: { id: args.entryId } });
  if (!src) return;
  const { id: _omit, createdAt: _c, ...copy } = src;
  await prisma.foodEntry.create({ data: { ...copy, meal: args.meal, day: args.day ?? dayKey() } });
  revalidateFood();
}

/** Deletes an entry. deleteMany doesn't throw if it's already gone (e.g. a double tap). */
export async function deleteFoodEntry(entryId: number) {
  await prisma.foodEntry.deleteMany({ where: { id: id.parse(entryId) } });
  revalidateFood();
}
