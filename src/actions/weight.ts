"use server";
// Body-weight actions.
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { fromDisplay } from "@/lib/units";
import { revalidateWeight } from "./revalidate";
import { decimal, id, pastDay } from "./schemas";

const WeighInForm = z.object({ weight: decimal(1500).refine((w) => w > 0, "Enter your weight"), date: pastDay });

/** Logs a weigh-in. One per day: logging the same day again overwrites it. */
export async function logBodyWeight(formData: FormData) {
  const { weight, date } = WeighInForm.parse({ weight: formData.get("weight"), date: formData.get("date") || undefined });
  const { weightUnit } = await getSettings();
  const weightKg = fromDisplay(weight, weightUnit);
  const day = date ?? dayKey();
  await prisma.bodyWeight.upsert({ where: { day }, update: { weightKg }, create: { day, weightKg } });
  revalidateWeight();
}

/** Deletes a weigh-in. */
export async function deleteBodyWeight(weighInId: number) {
  await prisma.bodyWeight.deleteMany({ where: { id: id.parse(weighInId) } });
  revalidateWeight();
}
