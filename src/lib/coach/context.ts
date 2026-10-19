// Builds the coach's data block: every section, in the order the model reads them.
import { daysAgoKey, formatDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getEnergyEstimate } from "@/lib/energy-data";
import { getSettings } from "@/lib/settings";
import { formatSafetyFlags, safetyFlags } from "./safety";
import { formatEnergy } from "./sections/energy";
import { nutritionSection } from "./sections/nutrition";
import { progressionSection } from "./sections/progression";
import { formatLeftToday, loadEatenToday } from "./sections/today";
import { trainingSection } from "./sections/training";
import { weightSection } from "./sections/weight";

export interface CoachContext {
  text: string;
  /** The client's own standing instructions from Settings, if any. */
  instructions: string | null;
  stats: {
    workouts7d: number;
    sets7d: number;
    foodDaysLogged7d: number;
    avgCalories7d: number | null;
    latestWeightKg: number | null;
  };
}

/** Bundles training, nutrition, weight trend, energy targets and safety flags into a prompt-ready block. */
export async function buildCoachContext(): Promise<CoachContext> {
  const s = await getSettings();
  const weight = await weightSection(s.weightUnit, s.goalWeightKg);
  const [training, nutrition, energy, progression, eaten, activity] = await Promise.all([
    trainingSection(s.weightUnit),
    nutritionSection(s, weight.latestKg),
    getEnergyEstimate(s),
    progressionSection(s.weightUnit),
    loadEatenToday(),
    prisma.dailyActivity.findMany({ where: { day: { gte: daysAgoKey(7) } }, orderBy: { day: "asc" } }),
  ]);
  const flags = safetyFlags({
    avgCalories: nutrition.avg,
    daysLogged: nutrition.daysLogged,
    proteinPerKg: nutrition.proteinPerKg,
    weeklyPct: weight.weeklyPct,
    notes: training.notes,
  });
  const text = [
    `Today: ${formatDay(daysAgoKey(0), { year: "numeric" })} · Units: ${s.weightUnit}`,
    weight.text,
    nutrition.text,
    `${formatEnergy(energy, s, s.weightUnit)}\n${formatLeftToday(eaten, energy, s)}`,
    training.text,
    activitySection(activity),
    progression,
    formatSafetyFlags(flags),
  ].join("\n\n");

  return {
    text,
    instructions: s.coachInstructions,
    stats: {
      workouts7d: training.sessions,
      sets7d: training.totalSets,
      foodDaysLogged7d: nutrition.daysLogged,
      avgCalories7d: nutrition.avg,
      latestWeightKg: weight.latestKg,
    },
  };
}

/** "## Activity (Apple Health)": steps and active energy sent by the iPhone Shortcut, if any. */
function activitySection(days: { day: string; steps: number | null; activeKcal: number | null }[]): string {
  const steps = days.filter((d) => d.steps != null).map((d) => d.steps!);
  const kcal = days.filter((d) => d.activeKcal != null).map((d) => d.activeKcal!);
  if (!steps.length && !kcal.length) return "## Activity (Apple Health)\n(not connected)";
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  return [
    "## Activity (Apple Health, last 7 days)",
    steps.length ? `Steps: average ${avg(steps).toLocaleString("en-US")} a day over ${steps.length} days` : null,
    kcal.length ? `Active energy: average ${avg(kcal)} kcal a day over ${kcal.length} days` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
