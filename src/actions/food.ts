"use server";
// Food log actions. The writes themselves live in src/lib/log/writes.ts (shared with /api/log).
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeFood, writeRelog } from "@/lib/log/writes";
import { revalidateFood } from "./revalidate";
import { FoodEntryInput, id } from "./schemas";

/** Logs a food entry (scanned or typed in). */
export async function addFoodEntry(input: z.input<typeof FoodEntryInput>) {
  await writeFood(input);
  revalidateFood();
}

/** Logs a copy of an earlier entry, for one-tap "ate this again". */
export async function relogFoodEntry(entryId: number, meal: string, day?: string) {
  await writeRelog({ entryId, meal: meal as never, day });
  revalidateFood();
}

/** Deletes an entry. deleteMany doesn't throw if it's already gone (e.g. a double tap). */
export async function deleteFoodEntry(entryId: number) {
  await prisma.foodEntry.deleteMany({ where: { id: id.parse(entryId) } });
  revalidateFood();
}
