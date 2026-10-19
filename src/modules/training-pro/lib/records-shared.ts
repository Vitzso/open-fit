// Personal-record checks that also run on the phone (so a PR is celebrated even offline). Pure.
import { estimate1RM } from "@/lib/progression";

/** Bests in the display unit; `e1rm` is the estimated one-rep max (Epley). */
export interface Bests {
  weight: number;
  e1rm: number;
  reps: number;
}

/** What a new set beats, if anything: "weight", "e1rm" (more reps at a weight) or "reps" (bodyweight). */
export function newRecords(best: Bests | undefined, weight: number, reps: number): ("weight" | "e1rm" | "reps")[] {
  if (!best) return []; // first time doing it: not a "record" yet
  const out: ("weight" | "e1rm" | "reps")[] = [];
  if (weight > 0 && weight > best.weight) out.push("weight");
  else if (weight > 0 && estimate1RM(weight, reps) > best.e1rm + 0.05) out.push("e1rm");
  if (weight === 0 && reps > best.reps) out.push("reps");
  return out;
}
