// "## Training — last 7 days": every session, grouped by exercise.
import { prisma } from "@/lib/db";
import { daysAgoKey, formatDay } from "@/lib/dates";
import { estimate1RM } from "@/lib/progression";
import { round, toDisplay, type WeightUnit } from "@/lib/units";

interface LoggedSet {
  weightKg: number;
  reps: number;
  rpe: number | null;
  notes: string | null;
  exercise: { name: string };
}

interface LoggedWorkout {
  day: string;
  name: string | null;
  sets: LoggedSet[];
}

export interface TrainingSection {
  text: string;
  sessions: number;
  totalSets: number;
  /** All set notes, for the symptom safety check. */
  notes: string[];
}

/** Workouts from the last 7 days with their sets, oldest first. */
function loadRecentWorkouts(): Promise<LoggedWorkout[]> {
  return prisma.workout.findMany({
    where: { day: { gte: daysAgoKey(6) } },
    orderBy: [{ day: "asc" }, { startedAt: "asc" }],
    include: { sets: { include: { exercise: true }, orderBy: { createdAt: "asc" } } },
  });
}

/** Groups sets by exercise name, keeping the order they were first done. */
function groupByExercise(sets: LoggedSet[]): Map<string, LoggedSet[]> {
  const groups = new Map<string, LoggedSet[]>();
  for (const s of sets) groups.set(s.exercise.name, [...(groups.get(s.exercise.name) ?? []), s]);
  return groups;
}

/** "Bench Press: 3 sets [...]; top set …; est 1RM …; avg RPE …" */
function exerciseLine(name: string, sets: LoggedSet[], unit: WeightUnit): string {
  const w = (kg: number) => `${round(toDisplay(kg, unit), 1)}${unit}`;
  const top = sets.reduce((a, b) => (estimate1RM(b.weightKg, b.reps) > estimate1RM(a.weightKg, a.reps) ? b : a));
  const rpes = sets.map((s) => s.rpe).filter((r): r is number => r != null);
  return (
    `    ${name}: ${sets.length} sets [${sets.map((s) => `${w(s.weightKg)}x${s.reps}`).join(", ")}]` +
    `; top set ${w(top.weightKg)}x${top.reps}${top.rpe ? ` @RPE${top.rpe}` : ""}` +
    `; est 1RM ${w(estimate1RM(top.weightKg, top.reps))}` +
    (rpes.length ? `; avg RPE ${round(rpes.reduce((a, b) => a + b) / rpes.length, 1)}` : "")
  );
}

/** Formats the block and totals (pure, no database access). */
export function formatTraining(workouts: LoggedWorkout[], unit: WeightUnit): TrainingSection {
  const lines: string[] = [];
  const notes: string[] = [];
  let totalSets = 0;
  let totalVolumeKg = 0;

  const done = workouts.filter((wo) => wo.sets.length > 0);
  for (const wo of done) {
    lines.push(`- ${formatDay(wo.day)}${wo.name ? ` "${wo.name}"` : ""}:`);
    for (const [name, sets] of groupByExercise(wo.sets)) {
      totalSets += sets.length;
      totalVolumeKg += sets.reduce((v, s) => v + s.weightKg * s.reps, 0);
      lines.push(exerciseLine(name, sets, unit));
      const setNotes = sets.map((s) => s.notes).filter((n): n is string => Boolean(n));
      if (setNotes.length) lines.push(`      notes: ${setNotes.join(" | ")}`);
      notes.push(...setNotes);
    }
  }

  const header =
    `## Training — last 7 days\n` +
    `Sessions: ${done.length} · Working sets: ${totalSets} · Total volume: ${round(toDisplay(totalVolumeKg, unit), 0)} ${unit}`;
  return {
    text: done.length ? `${header}\n${lines.join("\n")}` : `${header}\n(no workouts logged)`,
    sessions: done.length,
    totalSets,
    notes,
  };
}

/** Loads and formats the training block. */
export async function trainingSection(unit: WeightUnit): Promise<TrainingSection> {
  return formatTraining(await loadRecentWorkouts(), unit);
}
