import "server-only";
import { prisma } from "./db";
import { dayKey, daysAgoKey } from "./dates";
import { asActivity, asSex, estimateEnergy, type EnergyEstimate } from "./energy";
import type { AppSettings } from "./settings";

/** Loads the last 4 weeks of food and weigh-ins and estimates calorie needs. */
export async function getEnergyEstimate(s: AppSettings): Promise<EnergyEstimate> {
  const from = daysAgoKey(28);
  const today = dayKey();
  const [food, weights, latest] = await Promise.all([
    // Today is still in progress, so it's left out of the averages.
    prisma.foodEntry.groupBy({ by: ["day"], where: { day: { gte: from, lt: today } }, _sum: { calories: true } }),
    prisma.bodyWeight.findMany({ where: { day: { gte: from } }, orderBy: { day: "asc" } }),
    prisma.bodyWeight.findFirst({ orderBy: { day: "desc" } }),
  ]);
  return estimateEnergy({
    sex: asSex(s.sex),
    birthYear: s.birthYear,
    heightCm: s.heightCm,
    activity: asActivity(s.activityLevel),
    weeklyLossPct: s.weeklyLossPct,
    latestWeightKg: latest?.weightKg ?? null,
    // Days with under 800 kcal logged are probably incomplete logs; skip them.
    dailyIntake: food.map((d) => d._sum.calories ?? 0).filter((kcal) => kcal >= 800),
    weighIns: weights.map((w) => ({ day: w.day, kg: w.weightKg })),
  });
}
