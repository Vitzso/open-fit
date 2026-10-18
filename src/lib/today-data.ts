// Everything the Today screen shows, loaded in one round of queries.
import { prisma } from "./db";
import { currentWeek, dayKey, daysAgoKey } from "./dates";
import { sumMacros, type Macros } from "./nutrition";
import { nextTemplate, type WorkoutTemplate } from "./programs";
import { getSettings, type AppSettings } from "./settings";
import { round, toDisplay } from "./units";

export interface TodayData {
  today: string;
  /** This calendar week, Sunday to Saturday (later days have no data yet). */
  week: string[];
  settings: AppSettings;
  eaten: Macros;
  /** The workout started today, if any, with its number of sets. */
  todaysWorkout: { id: number; name: string | null; sets: number } | null;
  /** The next ready-made workout in the rotation. */
  next: WorkoutTemplate;
  trainedDays: Set<string>;
  foodDays: Set<string>;
  /** Weigh-ins of the last 30 days in the display unit, oldest first. */
  weights: { day: string; value: number }[];
  /** Change since about a week ago, in the display unit; null without two weigh-ins. */
  weightDelta: number | null;
}

/** Runs the Today screen's queries in parallel and derives what it displays. */
export async function getTodayData(): Promise<TodayData> {
  const today = dayKey();
  const week = currentWeek();
  const [settings, food, weekFoodDays, weighIns, weekWorkouts, lastTemplated] = await Promise.all([
    getSettings(),
    prisma.foodEntry.findMany({ where: { day: today } }),
    prisma.foodEntry.findMany({ where: { day: { gte: week[0] } }, select: { day: true }, distinct: ["day"] }),
    prisma.bodyWeight.findMany({ where: { day: { gte: daysAgoKey(29) } }, orderBy: { day: "asc" } }),
    prisma.workout.findMany({
      where: { day: { gte: week[0] } },
      orderBy: { startedAt: "desc" },
      include: { _count: { select: { sets: true } } },
    }),
    prisma.workout.findFirst({ where: { templateId: { not: null } }, orderBy: { startedAt: "desc" } }),
  ]);

  const disp = (kg: number) => round(toDisplay(kg, settings.weightUnit), 1);
  const latest = weighIns.at(-1);
  const weekAgo = [...weighIns].reverse().find((w) => w.day <= daysAgoKey(7));
  const started = weekWorkouts.find((w) => w.day === today);

  return {
    today,
    week,
    settings,
    eaten: sumMacros(food),
    todaysWorkout: started ? { id: started.id, name: started.name, sets: started._count.sets } : null,
    next: nextTemplate(lastTemplated?.templateId),
    trainedDays: new Set(weekWorkouts.filter((w) => w._count.sets > 0).map((w) => w.day)),
    foodDays: new Set(weekFoodDays.map((f) => f.day)),
    weights: weighIns.map((w) => ({ day: w.day, value: disp(w.weightKg) })),
    weightDelta: latest && weekAgo ? round(disp(latest.weightKg) - disp(weekAgo.weightKg), 1) : null,
  };
}
