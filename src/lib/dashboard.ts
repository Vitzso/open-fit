// Everything the desktop dashboard shows, for one date range: body weight, food and training.
// Also formats a "Period summary" block so the coach's progress report covers the same range.
import "server-only";
import { prisma } from "./db";
import { dayKey, daysAgoKey, formatDay, parseDayKey } from "./dates";
import { sumMacros, type Macros } from "./nutrition";
import { estimate1RM, suggestNext } from "./progression";
import { getSettings } from "./settings";
import { round, toDisplay, type WeightUnit } from "./units";

/** Date ranges offered on the dashboard, in days. */
export const RANGES = [7, 30, 90, 180, 365] as const;
export type RangeDays = (typeof RANGES)[number];
export const DEFAULT_RANGE: RangeDays = 30;

/** Narrows a `?range=` value to one of RANGES. */
export const asRange = (v: string | number | undefined | null): RangeDays =>
  (RANGES as readonly number[]).includes(Number(v)) ? (Number(v) as RangeDays) : DEFAULT_RANGE;

export interface DayFood extends Macros {
  day: string;
}

export interface WeekTraining {
  /** First day of the week (Settings → week start). */
  week: string;
  sessions: number;
  sets: number;
  /** Sum of weight × reps, in the display unit. */
  volume: number;
}

export interface LiftSeries {
  name: string;
  /** "e1rm" for weighted lifts (estimated one-rep max), "reps" for bodyweight ones (best set). */
  metric: "e1rm" | "reps";
  points: { day: string; value: number }[];
  /** Change from the first to the last session in the range, in %. */
  changePct: number | null;
  /** Heaviest set of the last session, e.g. "82.5 kg × 8". */
  lastTop: string;
  /** What to try next time, from the progression rules. */
  next: string | null;
}

export interface DashboardData {
  range: RangeDays;
  from: string;
  to: string;
  unit: WeightUnit;
  goals: { calories: number; protein: number; carbs: number; fat: number; weight: number | null };
  weight: {
    points: { day: string; value: number }[];
    latest: number | null;
    /** Change over the range (last minus first weigh-in in it). */
    change: number | null;
    /** Average change per week over the range. */
    perWeek: number | null;
  };
  food: {
    /** Every day in the range, oldest first; zeros where nothing was logged. */
    days: DayFood[];
    loggedDays: number;
    /** Daily averages over completed logged days (today is left out: it's still in progress). */
    avg: Macros | null;
  };
  training: {
    sessions: number;
    sets: number;
    volume: number;
    weeks: WeekTraining[];
    lifts: LiftSeries[];
  };
}

/** Day keys from `from` to today, oldest first. */
function daysFrom(from: string): string[] {
  const out: string[] = [];
  const d = parseDayKey(from);
  const today = dayKey();
  for (let k = dayKey(d); k <= today; d.setDate(d.getDate() + 1), k = dayKey(d)) out.push(k);
  return out;
}

/** First day of the week containing `day`. */
function weekOf(day: string, weekStart: number): string {
  const d = parseDayKey(day);
  d.setDate(d.getDate() - ((d.getDay() - weekStart + 7) % 7));
  return dayKey(d);
}

const fmt1 = (n: number) => String(round(n, 1));

/** Loads and shapes the dashboard for the last `range` days (including today). */
export async function getDashboardData(range: RangeDays): Promise<DashboardData> {
  const s = await getSettings();
  const unit = s.weightUnit;
  const from = daysAgoKey(range - 1);
  const to = dayKey();
  const [weighIns, food, sets] = await Promise.all([
    prisma.bodyWeight.findMany({ where: { day: { gte: from } }, orderBy: { day: "asc" } }),
    prisma.foodEntry.groupBy({
      by: ["day"],
      where: { day: { gte: from } },
      _sum: { calories: true, protein: true, carbs: true, fat: true },
    }),
    prisma.workoutSet.findMany({
      where: { workout: { day: { gte: from } }, kind: { not: "warmup" } },
      include: { exercise: true, workout: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Body weight.
  const points = weighIns.map((w) => ({ day: w.day, value: round(toDisplay(w.weightKg, unit), 1) }));
  const first = points[0];
  const last = points.at(-1);
  const spanDays = first && last ? (parseDayKey(last.day).getTime() - parseDayKey(first.day).getTime()) / 86_400_000 : 0;
  const change = first && last && first !== last ? round(last.value - first.value, 1) : null;

  // Food: one row per day so gaps show as empty days rather than disappearing.
  const byDay = new Map(food.map((f) => [f.day, f._sum]));
  const days = daysFrom(from).map((day) => {
    const m = byDay.get(day);
    return {
      day,
      calories: Math.round(m?.calories ?? 0),
      protein: round(m?.protein ?? 0, 0),
      carbs: round(m?.carbs ?? 0, 0),
      fat: round(m?.fat ?? 0, 0),
    };
  });
  const completed = days.filter((d) => d.day < to && d.calories > 0);
  const total = sumMacros(completed);
  const avg = completed.length
    ? {
        calories: Math.round(total.calories / completed.length),
        protein: Math.round(total.protein / completed.length),
        carbs: Math.round(total.carbs / completed.length),
        fat: Math.round(total.fat / completed.length),
      }
    : null;

  // Training: weekly totals and per-lift progression.
  const weeks = new Map<string, WeekTraining>();
  for (const k of daysFrom(from)) {
    const w = weekOf(k, s.weekStart);
    if (!weeks.has(w)) weeks.set(w, { week: w, sessions: 0, sets: 0, volume: 0 });
  }
  const workoutIds = new Set<number>();
  const sessionsByLift = new Map<string, Map<number, { day: string; sets: { weight: number; reps: number }[] }>>();
  let volume = 0;
  for (const st of sets) {
    const w = weeks.get(weekOf(st.workout.day, s.weekStart));
    const weight = round(toDisplay(st.weightKg, unit), 1);
    if (w) {
      if (!workoutIds.has(st.workoutId)) w.sessions++;
      w.sets++;
      w.volume += weight * st.reps;
    }
    workoutIds.add(st.workoutId);
    volume += weight * st.reps;
    const lift = sessionsByLift.get(st.exercise.name) ?? new Map();
    const sess = lift.get(st.workoutId) ?? { day: st.workout.day, sets: [] };
    sess.sets.push({ weight, reps: st.reps });
    lift.set(st.workoutId, sess);
    sessionsByLift.set(st.exercise.name, lift);
  }

  const lifts: LiftSeries[] = [...sessionsByLift]
    .map(([name, m]) => ({ name, sessions: [...m.values()] }))
    // The lifts trained most often first; they're the ones with a trend to show.
    .sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map(({ name, sessions }) => {
      const weighted = sessions.some((x) => x.sets.some((y) => y.weight > 0));
      const value = (x: (typeof sessions)[number]) =>
        weighted ? round(Math.max(...x.sets.map((y) => estimate1RM(y.weight, y.reps))), 1) : Math.max(...x.sets.map((y) => y.reps));
      const pts = sessions.map((x) => ({ day: x.day, value: value(x) }));
      const lastSession = sessions.at(-1)!;
      const top = lastSession.sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
      const firstValue = pts[0].value;
      return {
        name,
        metric: weighted ? ("e1rm" as const) : ("reps" as const),
        points: pts,
        changePct: pts.length >= 2 && firstValue > 0 ? round(((pts.at(-1)!.value - firstValue) / firstValue) * 100, 1) : null,
        lastTop: weighted ? `${fmt1(top.weight)} ${unit} × ${top.reps}` : `${top.reps} reps`,
        next: suggestNext(name, lastSession, undefined, unit)?.message ?? null,
      };
    });

  return {
    range,
    from,
    to,
    unit,
    goals: {
      calories: s.calorieGoal,
      protein: s.proteinGoal,
      carbs: s.carbsGoal,
      fat: s.fatGoal,
      weight: s.goalWeightKg != null ? round(toDisplay(s.goalWeightKg, unit), 1) : null,
    },
    weight: {
      points,
      latest: last?.value ?? null,
      change,
      perWeek: change != null && spanDays >= 7 ? round((change / spanDays) * 7, 2) : null,
    },
    food: { days, loggedDays: completed.length, avg },
    training: {
      sessions: workoutIds.size,
      sets: sets.length,
      volume: Math.round(volume),
      weeks: [...weeks.values()].map((w) => ({ ...w, volume: Math.round(w.volume) })),
      lifts,
    },
  };
}

/** "## Period summary (computed, last 30 days)": the dashboard's numbers, for the coach's report. */
export function formatPeriodSummary(d: DashboardData): string {
  const u = d.unit;
  const out = [`## Period summary (computed, last ${d.range} days: ${formatDay(d.from)} to ${formatDay(d.to)})`];
  if (d.weight.points.length === 0) out.push("Body weight: no weigh-ins in this period");
  else {
    out.push(`Body weight: ${d.weight.points.length} weigh-ins, latest ${d.weight.latest} ${u}`);
    if (d.weight.change != null) {
      out.push(
        `Change over the period: ${d.weight.change >= 0 ? "+" : ""}${d.weight.change} ${u}` +
          (d.weight.perWeek != null ? ` (${d.weight.perWeek >= 0 ? "+" : ""}${d.weight.perWeek} ${u}/week)` : ""),
      );
    }
    if (d.goals.weight != null) out.push(`Goal weight: ${d.goals.weight} ${u}`);
  }
  if (d.food.avg) {
    const a = d.food.avg;
    out.push(
      `Food: logged on ${d.food.loggedDays} of ${d.range - 1} completed days; average ${a.calories} kcal · P ${a.protein}g · C ${a.carbs}g · F ${a.fat}g ` +
        `(goal ${d.goals.calories} kcal · P ${d.goals.protein}g)`,
    );
  } else out.push("Food: nothing logged in this period");
  out.push(`Training: ${d.training.sessions} sessions, ${d.training.sets} sets, total volume ${d.training.volume.toLocaleString("en-US")} ${u}`);
  for (const l of d.training.lifts) {
    const metric = l.metric === "e1rm" ? "est. 1RM" : "best set (reps)";
    const change = l.changePct == null ? "" : `, ${metric} ${l.changePct >= 0 ? "+" : ""}${l.changePct}% over the period`;
    out.push(`- ${l.name}: ${l.points.length} sessions, last top set ${l.lastTop}${change}`);
  }
  return out.join("\n");
}
