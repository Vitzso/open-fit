// "What should I lift today?": double progression from your last session.
// Pure functions, shared by the workout screen and the AI coach's data block.

export interface SessionSet {
  weight: number; // display unit
  reps: number;
}

export interface LastSession {
  day: string;
  sets: SessionSet[];
}

export interface Suggestion {
  kind: "increase" | "repeat" | "reps";
  weight: number;
  reps?: number;
  message: string;
}

// Big lower-body lifts can take bigger jumps.
const LOWER_BODY = /squat|deadlift|leg press|lunge|hip thrust/i;

/** "8" → [8, 8], "6–8" → [6, 8], "As many as you can" / "30 s" → null. */
export function repRange(target: string | undefined): [number, number] | null {
  if (!target || /\bs\b|sec|as many/i.test(target)) return null;
  const nums = target.match(/\d+/g)?.map(Number);
  if (!nums?.length) return null;
  return [nums[0], nums[1] ?? nums[0]];
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** Estimated one-rep max (Epley): weight × (1 + reps / 30). */
export const estimate1RM = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

/**
 * Suggests today's weight from last session:
 * - every set reached the top of the target → add weight (2.5 kg upper, 5 kg lower body);
 * - fell short → stay at the same weight and aim for the target on every set;
 * - bodyweight exercise (weight 0) → aim for one or two more reps.
 */
export function suggestNext(
  exercise: string,
  last: LastSession | undefined,
  plannedReps: string | undefined,
  unit: "kg" | "lb",
): Suggestion | null {
  if (!last || last.sets.length === 0) return null;
  const working = last.sets;
  const top = Math.max(...working.map((s) => s.weight));
  const topSets = working.filter((s) => s.weight === top);
  const range = repRange(plannedReps) ?? [topSets[0].reps, topSets[0].reps];
  const [, high] = range;
  const repsDone = topSets.map((s) => s.reps).join(", ");

  if (top === 0) {
    const best = Math.max(...working.map((s) => s.reps));
    return { kind: "reps", weight: 0, reps: best + 1, message: `Last time your best set was ${best} reps. Aim for ${best + 1} today.` };
  }

  const hitAll = topSets.every((s) => s.reps >= high);
  if (hitAll) {
    const step = LOWER_BODY.test(exercise) ? (unit === "kg" ? 5 : 10) : unit === "kg" ? 2.5 : 5;
    const next = top + step;
    return {
      kind: "increase",
      weight: next,
      reps: range[0],
      message: `Last time you hit all your reps at ${fmt(top)} ${unit}. Try ${fmt(next)} ${unit}.`,
    };
  }
  return {
    kind: "repeat",
    weight: top,
    reps: high,
    message: `Last time: ${repsDone} reps at ${fmt(top)} ${unit}. Stay at ${fmt(top)} ${unit} and aim for ${high} on every set.`,
  };
}
