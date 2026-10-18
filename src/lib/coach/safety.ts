// Safety thresholds computed in code rather than left for the model to infer:
// small local models follow an explicit flag far more reliably than they spot
// a threshold crossing in a table of numbers.
import { round } from "@/lib/units";

const SYMPTOMS = /\b(dizz\w*|faint\w*|light-?headed|chest pain|palpitations?|black(ed)? out|nause\w*|shaky|weak(ness)?)\b/i;

export interface SafetyInputs {
  avgCalories: number | null;
  daysLogged: number;
  proteinPerKg: number | null;
  weeklyPct: number | null;
  notes: string[];
}

/** Plain-language flags for every crossed threshold (empty when all is fine). */
export function safetyFlags(x: SafetyInputs): string[] {
  const flags: string[] = [];
  const enoughFood = x.daysLogged >= 3;
  if (enoughFood && x.avgCalories != null && x.avgCalories < 1200) {
    flags.push(`Average intake ${x.avgCalories} kcal/day is below the 1,200 kcal safety threshold.`);
  }
  if (x.weeklyPct != null && x.weeklyPct < -1) {
    flags.push(`Losing ${round(Math.abs(x.weeklyPct), 2)}% of body weight per week, faster than the 1% safety limit.`);
  }
  if (enoughFood && x.proteinPerKg != null && x.proteinPerKg < 1.2) {
    flags.push(`Protein ${round(x.proteinPerKg, 2)} g/kg is below the 1.2 g/kg minimum.`);
  }
  const symptomNote = x.notes.find((n) => SYMPTOMS.test(n));
  if (symptomNote) flags.push(`A training note mentions a possible symptom: "${symptomNote.slice(0, 120)}".`);
  return flags;
}

/** The "Safety flags (computed)" block that ends the coach's data. */
export const formatSafetyFlags = (flags: string[]) =>
  `## Safety flags (computed)\n${flags.length ? flags.map((f) => `- ${f}`).join("\n") : "None"}`;
