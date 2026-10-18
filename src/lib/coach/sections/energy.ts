// "## Energy and targets (computed)": the calorie engine's result as plain lines.
import type { EnergyEstimate } from "@/lib/energy";
import { round, toDisplay, type WeightUnit } from "@/lib/units";

export interface EnergyGoals {
  calorieGoal: number;
  proteinGoal: number;
  weeklyLossPct: number;
}

/** Formats the energy estimate for the coach (pure; the self-tests use it too). */
export function formatEnergy(e: EnergyEstimate, s: EnergyGoals, unit: WeightUnit): string {
  const perWeek = (kg: number) => `${round(toDisplay(kg, unit), 2)} ${unit}/week`;
  const lines = ["## Energy and targets (computed)"];
  if (e.bmr) lines.push(`Resting burn (BMR, Mifflin-St Jeor): ${e.bmr} kcal/day`);
  if (e.formulaMaintenance) lines.push(`Maintenance from profile and activity level: ${e.formulaMaintenance} kcal/day`);
  if (e.dataMaintenance && e.dataBasis) {
    const b = e.dataBasis;
    lines.push(
      `Maintenance from the client's own data: ${e.dataMaintenance} kcal/day (average intake over ${b.days} logged days vs. weight trend of ${b.kgPerWeek > 0 ? "+" : ""}${perWeek(b.kgPerWeek)} from ${b.weighIns} weigh-ins)`,
    );
  } else {
    lines.push("Maintenance from the client's own data: not enough data yet (needs 10+ logged days and 4+ weigh-ins over 10+ days)");
  }
  if (e.target && e.maintenance && e.targetKgPerWeek) {
    lines.push(
      `Recommended daily target: ${e.target} kcal (maintenance ${e.maintenance} from ${e.maintenanceSource}, minus a deficit for ${perWeek(e.targetKgPerWeek)}, which is ${s.weeklyLossPct}% of body weight)${e.floorApplied ? ". Raised to the safe minimum" : ""}`,
    );
    lines.push(`Recommended macros: protein ${e.protein} g, fat ${e.fat} g, carbs ${e.carbs} g`);
    lines.push(`Goals currently set in the app: ${s.calorieGoal} kcal, protein ${s.proteinGoal} g`);
  } else {
    lines.push("Recommended daily target: unavailable");
  }
  if (e.missing.length) lines.push(`Profile details missing (add in Settings for a better estimate): ${e.missing.join(", ")}`);
  return lines.join("\n");
}
