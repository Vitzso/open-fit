// "## Nutrition — last 7 days": daily totals and averages over completed days.
import { prisma } from "@/lib/db";
import { formatDay, lastNDays } from "@/lib/dates";
import { sumMacros, type Macros } from "@/lib/nutrition";
import type { AppSettings } from "@/lib/settings";
import { round } from "@/lib/units";

type Entry = Macros & { day: string };
type Goals = Pick<AppSettings, "calorieGoal" | "proteinGoal" | "carbsGoal" | "fatGoal">;

export interface NutritionSection {
  text: string;
  daysLogged: number;
  avg: number | null;
  proteinPerKg: number | null;
}

/** "1870 kcal · P 130 · C 185 · F 60" */
const macroLine = (m: Macros) =>
  `${Math.round(m.calories)} kcal · P ${Math.round(m.protein)} · C ${Math.round(m.carbs)} · F ${Math.round(m.fat)}`;

/** Food entries from the 7 completed days before today, plus today. */
async function loadEntries(): Promise<{ days: string[]; today: string; entries: Entry[] }> {
  // Today is still in progress, so it's reported separately instead of dragging the averages down.
  const days = lastNDays(8);
  const today = days.pop()!;
  const entries = await prisma.foodEntry.findMany({ where: { day: { gte: days[0] } } });
  return { days, today, entries };
}

/** Formats the block (pure). `latestWeightKg` turns protein into g/kg. */
export function formatNutrition(days: string[], today: string, entries: Entry[], goals: Goals, latestWeightKg: number | null): NutritionSection {
  const perDay = days.map((day) => ({ day, ...sumMacros(entries.filter((e) => e.day === day)) })).filter((d) => d.calories > 0);
  const todayLine = `Today so far (in progress, excluded from averages): ${macroLine(sumMacros(entries.filter((e) => e.day === today)))}`;
  const goal = `Goals: ${goals.calorieGoal} kcal · P ${goals.proteinGoal}g · C ${goals.carbsGoal}g · F ${goals.fatGoal}g`;
  if (perDay.length === 0) {
    return { text: `## Nutrition — last 7 days\n${goal}\n(no food logged)\n${todayLine}`, daysLogged: 0, avg: null, proteinPerKg: null };
  }

  const n = perDay.length;
  const total = sumMacros(perDay);
  const a = {
    calories: Math.round(total.calories / n),
    protein: Math.round(total.protein / n),
    carbs: Math.round(total.carbs / n),
    fat: Math.round(total.fat / n),
  };
  const diff = a.calories - goals.calorieGoal;
  const perKg = latestWeightKg ? ` (${round(a.protein / latestWeightKg, 2)} g/kg body weight)` : "";
  const text = [
    `## Nutrition — last 7 days`,
    goal,
    `Days logged: ${n}/7 (averages are over logged days only; unlogged days may be under-reported)`,
    `Average/day: ${a.calories} kcal · P ${a.protein}g${perKg} · C ${a.carbs}g · F ${a.fat}g`,
    `Average vs calorie goal: ${diff >= 0 ? "+" : ""}${diff} kcal/day`,
    ...perDay.map((d) => `- ${formatDay(d.day)}: ${macroLine(d)}`),
    todayLine,
  ].join("\n");
  return { text, daysLogged: n, avg: a.calories, proteinPerKg: latestWeightKg ? a.protein / latestWeightKg : null };
}

/** Loads and formats the nutrition block. */
export async function nutritionSection(goals: Goals, latestWeightKg: number | null): Promise<NutritionSection> {
  const { days, today, entries } = await loadEntries();
  return formatNutrition(days, today, entries, goals, latestWeightKg);
}
