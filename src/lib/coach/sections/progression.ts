// "## Lift progression (computed)": last three sessions of each lift, trend and what to try next.
import { prisma } from "@/lib/db";
import { daysAgoKey } from "@/lib/dates";
import { estimate1RM, suggestNext, type LastSession, type SessionSet } from "@/lib/progression";
import { round, toDisplay, type WeightUnit } from "@/lib/units";

/** Exercise name → its sessions in order (weights already in the display unit). */
type SessionsByExercise = Map<string, LastSession[]>;

/** Sets from the last 6 weeks, grouped into sessions per exercise. */
async function loadSessions(unit: WeightUnit): Promise<SessionsByExercise> {
  const sets = await prisma.workoutSet.findMany({
    where: { workout: { day: { gte: daysAgoKey(42) } }, kind: { not: "warmup" } },
    include: { exercise: true, workout: true },
    orderBy: { createdAt: "asc" },
  });
  const byExercise = new Map<string, Map<number, LastSession>>();
  for (const st of sets) {
    const sessions = byExercise.get(st.exercise.name) ?? new Map<number, LastSession>();
    const sess = sessions.get(st.workoutId) ?? { day: st.workout.day, sets: [] };
    sess.sets.push({ weight: round(toDisplay(st.weightKg, unit), 1), reps: st.reps });
    sessions.set(st.workoutId, sess);
    byExercise.set(st.exercise.name, sessions);
  }
  return new Map([...byExercise].map(([name, s]) => [name, [...s.values()]]));
}

/** Best estimated 1RM within a session. */
const best1RM = (s: { sets: SessionSet[] }) => Math.max(...s.sets.map((x) => estimate1RM(x.weight, x.reps)));

/** Heaviest set of a session (more reps breaks ties). */
const topSet = (sets: SessionSet[]) => sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));

/** "- Bench Press: 10-10 82.5kgx8 → …; est. 1RM +3% …; next: …" */
function liftLine(name: string, sessions: LastSession[], unit: WeightUnit): string {
  const recent = sessions.slice(-3);
  const tops = recent.map((s) => {
    const top = topSet(s.sets);
    return `${s.day.slice(5)} ${top.weight}${unit}x${top.reps}`;
  });
  const trend = recent.length >= 2 ? Math.round(((best1RM(recent.at(-1)!) - best1RM(recent[0])) / best1RM(recent[0])) * 1000) / 10 : null;
  const next = suggestNext(name, recent.at(-1), undefined, unit);
  return `- ${name}: ${tops.join(" → ")}${trend === null ? "" : `; est. 1RM ${trend >= 0 ? "+" : ""}${trend}% over these sessions`}${next ? `; next: ${next.message}` : ""}`;
}

/** Formats the block (pure). */
export function formatProgression(byExercise: SessionsByExercise, unit: WeightUnit): string {
  if (byExercise.size === 0) return "## Lift progression (computed)\n(no lifts logged in the last 6 weeks)";
  return ["## Lift progression (computed, last 6 weeks)", ...[...byExercise].map(([name, s]) => liftLine(name, s, unit))].join("\n");
}

/** Loads and formats the progression block. */
export async function progressionSection(unit: WeightUnit): Promise<string> {
  return formatProgression(await loadSessions(unit), unit);
}
