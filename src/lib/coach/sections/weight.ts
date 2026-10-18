// "## Body weight": latest weigh-in, weekly averages and trend.
import { prisma } from "@/lib/db";
import { daysAgoKey, formatDay } from "@/lib/dates";
import { round, toDisplay, type WeightUnit } from "@/lib/units";

interface WeighIn {
  day: string;
  weightKg: number;
}

export interface WeightSection {
  text: string;
  latestKg: number | null;
  /** Week-over-week change of 7-day averages, in % (negative = losing). */
  weeklyPct: number | null;
}

/** Weigh-ins from the last 30 days, plus the latest one ever if none are that recent. */
async function loadWeighIns(): Promise<{ rows: WeighIn[]; latest: WeighIn | null }> {
  const rows = await prisma.bodyWeight.findMany({ where: { day: { gte: daysAgoKey(29) } }, orderBy: { day: "asc" } });
  const latest = rows.at(-1) ?? (await prisma.bodyWeight.findFirst({ orderBy: { day: "desc" } })) ?? null;
  return { rows, latest };
}

/** Mean weight of the given rows, or null if there are none. */
const average = (xs: WeighIn[]) => (xs.length ? xs.reduce((t, r) => t + r.weightKg, 0) / xs.length : null);

/** Signed number with a leading "+" for gains. */
const signed = (n: number, text: string) => `${n >= 0 ? "+" : ""}${text}`;

/**
 * Plain-language verdict on the weekly rate of change against the 0.5–1% fat-loss
 * target. Computed here because small models often get "0.4 vs 0.5" comparisons wrong.
 */
export function describePace(weeklyPct: number): string {
  const loss = -weeklyPct;
  if (loss <= 0) return "Pace vs target (computed): not losing weight this week (target: losing 0.5–1% a week)";
  if (loss < 0.5) return `Pace vs target (computed): losing ${round(loss, 2)}% a week, slower than the 0.5–1% target`;
  if (loss <= 1) return `Pace vs target (computed): losing ${round(loss, 2)}% a week, within the 0.5–1% target`;
  return `Pace vs target (computed): losing ${round(loss, 2)}% a week, faster than the 0.5–1% target`;
}

/** Formats the block (pure). */
export function formatWeight(rows: WeighIn[], latest: WeighIn | null, unit: WeightUnit, goalWeightKg: number | null): WeightSection {
  if (!latest) return { text: `## Body weight\n(no weigh-ins logged)`, latestKg: null, weeklyPct: null };
  const w = (kg: number) => `${round(toDisplay(kg, unit), 1)} ${unit}`;
  const thisWeek = average(rows.filter((r) => r.day >= daysAgoKey(6)));
  const lastWeek = average(rows.filter((r) => r.day >= daysAgoKey(13) && r.day < daysAgoKey(6)));
  const first = rows[0];
  let weeklyPct: number | null = null;

  const out = [`## Body weight`, `Latest: ${w(latest.weightKg)} (${formatDay(latest.day)})`];
  if (thisWeek != null) out.push(`7-day average: ${w(thisWeek)}`);
  if (thisWeek != null && lastWeek != null) {
    const delta = thisWeek - lastWeek;
    weeklyPct = (delta / lastWeek) * 100;
    out.push(`Week-over-week change of averages: ${signed(delta, w(delta))} (${round(weeklyPct, 2)}%/week)`);
    out.push(describePace(weeklyPct));
  }
  if (first && first.day !== latest.day) {
    const change = latest.weightKg - first.weightKg;
    out.push(`Change since ${formatDay(first.day)}: ${signed(change, w(change))} over ${rows.length} weigh-ins`);
  }
  if (goalWeightKg) out.push(`Goal weight: ${w(goalWeightKg)} (${w(Math.abs(latest.weightKg - goalWeightKg))} to go)`);
  out.push(`Recent weigh-ins: ${rows.slice(-10).map((r) => `${r.day.slice(5)} ${round(toDisplay(r.weightKg, unit), 1)}`).join(", ")}`);
  return { text: out.join("\n"), latestKg: latest.weightKg, weeklyPct };
}

/** Loads and formats the body-weight block. */
export async function weightSection(unit: WeightUnit, goalWeightKg: number | null): Promise<WeightSection> {
  const { rows, latest } = await loadWeighIns();
  return formatWeight(rows, latest, unit, goalWeightKg);
}
