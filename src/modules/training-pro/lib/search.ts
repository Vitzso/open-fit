// Ranking for exercise-library search. Pure (unit tested in search.test.ts).
import type { LibraryExercise } from "./library";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** What lifters type → what the library calls it (matched on the normalised query, whole words). */
const ALIASES: [RegExp, string][] = [
  [/\bback squats?\b/, "barbell squat"],
  [/\bohp\b|\boverhead press\b/, "standing military press"],
  [/\brdls?\b/, "romanian deadlift"],
  [/\bpull ?ups?\b/, "pullups"],
  [/\bpush ?ups?\b|\bpress ?ups?\b/, "pushups"],
  [/\bskull ?crushers?\b/, "lying triceps press"],
  [/\bbent ?over rows?\b/, "bent over barbell row"],
  [/\bhip thrusts?\b/, "barbell hip thrust"],
];

/** Rewrites common gym names to the library's, so "back squat" finds Barbell Squat. */
export const applyAliases = (q: string) => ALIASES.reduce((t, [re, to]) => t.replace(re, to), norm(q));

/** Gym staples: shown before obscure variations ("incline bench" → the barbell press, not "Incline Bench Pull"). */
const STAPLES = new Set([
  "Barbell_Bench_Press_-_Medium_Grip", "Barbell_Incline_Bench_Press_-_Medium_Grip", "Incline_Dumbbell_Press", "Dumbbell_Bench_Press",
  "Close-Grip_Barbell_Bench_Press", "Barbell_Squat", "Front_Barbell_Squat", "Goblet_Squat", "Bodyweight_Squat", "Barbell_Deadlift",
  "Romanian_Deadlift", "Standing_Military_Press", "Dumbbell_Shoulder_Press", "Bent_Over_Barbell_Row", "One-Arm_Dumbbell_Row", "Pullups",
  "Chin-Up", "Wide-Grip_Lat_Pulldown", "Seated_Cable_Rows", "Leg_Press", "Lying_Leg_Curls", "Leg_Extensions", "Barbell_Curl",
  "Dumbbell_Bicep_Curl", "Hammer_Curls", "Triceps_Pushdown", "Dips_-_Triceps_Version", "Side_Lateral_Raise", "Face_Pull",
  "Barbell_Hip_Thrust", "Barbell_Lunge", "Dumbbell_Lunges", "Standing_Calf_Raises", "Plank", "Hanging_Leg_Raise", "Pushups",
  "Cable_Crossover", "Barbell_Shrug", "Kettlebell_One-Legged_Deadlift",
]);

/**
 * Search by words in the name, muscles or equipment. Best first: an exact name, exercises you've
 * logged before (`prefer`, names), gym staples, then names containing every word; strength work
 * before stretches and cardio.
 */
export function rankExercises(
  library: LibraryExercise[],
  q: string,
  opts: { muscle?: string; equipment?: string; limit?: number; prefer?: Iterable<string> } = {},
): LibraryExercise[] {
  const words = applyAliases(q).split(" ").filter(Boolean);
  const phrase = words.join(" ");
  const prefer = new Set([...(opts.prefer ?? [])].map(norm));
  const scored = library
    .filter((e) => (!opts.muscle || e.primaryMuscles.includes(opts.muscle)) && (!opts.equipment || (e.equipment ?? "none") === opts.equipment))
    .map((e) => {
      const name = norm(e.name);
      const hay = `${name} ${norm(e.primaryMuscles.join(" "))} ${norm(e.equipment ?? "")}`;
      if (!words.every((w) => hay.includes(w))) return null;
      let score = name.length / 1000;
      if (name === phrase) score -= 10;
      if (prefer.has(name)) score -= 4;
      if (STAPLES.has(e.id)) score -= 2;
      if (words.every((w) => name.includes(w))) score -= 1;
      if (name.includes(phrase)) score -= 0.5;
      // Bigger than the name-match bonus: "chest" should find chest exercises before a chest stretch.
      if (e.category !== "strength" && e.category !== "powerlifting") score += 2;
      return { e, score };
    })
    .filter((x): x is { e: LibraryExercise; score: number } => x !== null)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, opts.limit ?? 30).map((x) => x.e);
}
