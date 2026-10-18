// "Left today …": does the subtraction for the model, against the target in use.
import { prisma } from "@/lib/db";
import { daysAgoKey } from "@/lib/dates";
import type { EnergyEstimate } from "@/lib/energy";
import { sumMacros, type Macros } from "@/lib/nutrition";

/** Formats the line (pure). Uses the computed target when there is one, else the app's goals. */
export function formatLeftToday(eaten: Macros, energy: Pick<EnergyEstimate, "target" | "protein">, goals: { calorieGoal: number; proteinGoal: number }): string {
  const kcal = energy.target ?? goals.calorieGoal;
  const protein = energy.protein ?? goals.proteinGoal;
  const basis = energy.target ? "recommended target" : "goal set in the app";
  return `Left today against the ${basis}: ${Math.round(kcal - eaten.calories)} kcal and ${Math.round(protein - eaten.protein)} g protein (eaten so far: ${Math.round(eaten.calories)} kcal, ${Math.round(eaten.protein)} g protein)`;
}

/** Totals of everything logged today. */
export async function loadEatenToday(): Promise<Macros> {
  return sumMacros(await prisma.foodEntry.findMany({ where: { day: daysAgoKey(0) } }));
}
