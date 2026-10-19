// Superset letters for your own programs. Pure (tested in supersets.test.ts).
import type { PlannedExercise } from "@/lib/programs";

/**
 * Plan rows with superset letters: a run of exercises chained by supersetWithNext gets one letter
 * (A, B, …); exercises on their own get none.
 */
export function withSupersetGroups(rows: { name: string; sets: number; reps: string; restSec: number; supersetWithNext: boolean }[]): PlannedExercise[] {
  let letter = 0;
  return rows.map((e, i) => {
    const chainedFromPrev = i > 0 && rows[i - 1].supersetWithNext;
    const inGroup = chainedFromPrev || (e.supersetWithNext && i < rows.length - 1);
    if (inGroup && !chainedFromPrev) letter++;
    return { name: e.name, sets: e.sets, reps: e.reps, restSec: e.restSec, ...(inGroup ? { group: String.fromCharCode(64 + letter) } : {}) };
  });
}
