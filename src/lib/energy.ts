// Calorie needs: a textbook estimate from your profile, refined by your own
// data (what you ate vs. how your weight moved). Pure functions, no I/O.

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "very";

export const ACTIVITY: Record<Activity, { factor: number; label: string; hint: string }> = {
  sedentary: { factor: 1.2, label: "Mostly sitting", hint: "Desk job, few steps" },
  light: { factor: 1.375, label: "Lightly active", hint: "Some walking, training 1–3 days a week" },
  moderate: { factor: 1.55, label: "Active", hint: "On your feet a lot, or training 3–5 days a week" },
  very: { factor: 1.725, label: "Very active", hint: "Physical job, or hard training most days" },
};

export const asSex = (s: string | null | undefined): Sex | null => (s === "male" || s === "female" ? s : null);
export const asActivity = (a: string | null | undefined): Activity | null => (a && a in ACTIVITY ? (a as Activity) : null);

const KCAL_PER_KG = 7700; // energy in ~1 kg of body-weight change

/** Resting burn (Mifflin-St Jeor). */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161));
}

/** Least-squares slope of weight over time, in kg per day. */
function slopeKgPerDay(points: { t: number; kg: number }[]): number {
  const n = points.length;
  const mt = points.reduce((a, p) => a + p.t, 0) / n;
  const mk = points.reduce((a, p) => a + p.kg, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.t - mt) * (p.kg - mk);
    den += (p.t - mt) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export interface EnergyInput {
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  activity: Activity | null;
  weeklyLossPct: number; // e.g. 0.6
  latestWeightKg: number | null;
  /** Calories per fully logged day over the last ~4 weeks (one entry per day with food). */
  dailyIntake: number[];
  /** Weigh-ins over the same window. day = "YYYY-MM-DD". */
  weighIns: { day: string; kg: number }[];
  today?: Date;
}

export interface EnergyEstimate {
  bmr: number | null;
  formulaMaintenance: number | null;
  dataMaintenance: number | null;
  dataBasis: { days: number; weighIns: number; kgPerWeek: number } | null;
  maintenance: number | null;
  maintenanceSource: "your data" | "formula" | null;
  target: number | null;
  targetKgPerWeek: number | null;
  floorApplied: boolean;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  /** Profile fields still needed for the formula estimate. */
  missing: string[];
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export function estimateEnergy(x: EnergyInput): EnergyEstimate {
  const missing: string[] = [];
  if (!x.sex) missing.push("sex");
  if (!x.birthYear) missing.push("birth year");
  if (!x.heightCm) missing.push("height");
  if (!x.activity) missing.push("activity level");
  if (!x.latestWeightKg) missing.push("a weigh-in");

  const year = (x.today ?? new Date()).getFullYear();
  const restBurn =
    x.sex && x.birthYear && x.heightCm && x.latestWeightKg ? bmr(x.sex, x.latestWeightKg, x.heightCm, year - x.birthYear) : null;
  const formulaMaintenance = restBurn && x.activity ? round10(restBurn * ACTIVITY[x.activity].factor) : null;

  // From your data: needs ≥10 logged days and ≥4 weigh-ins spread over ≥10 days.
  let dataMaintenance: number | null = null;
  let dataBasis: EnergyEstimate["dataBasis"] = null;
  const sorted = [...x.weighIns].sort((a, b) => a.day.localeCompare(b.day));
  const spanDays =
    sorted.length >= 2 ? (Date.parse(sorted.at(-1)!.day) - Date.parse(sorted[0].day)) / 86_400_000 : 0;
  if (x.dailyIntake.length >= 10 && sorted.length >= 4 && spanDays >= 10) {
    const avgIntake = x.dailyIntake.reduce((a, b) => a + b, 0) / x.dailyIntake.length;
    const t0 = Date.parse(sorted[0].day);
    const kgPerDay = slopeKgPerDay(sorted.map((w) => ({ t: (Date.parse(w.day) - t0) / 86_400_000, kg: w.kg })));
    let est = avgIntake - kgPerDay * KCAL_PER_KG;
    // Guard against noisy data: stay within ±35% of the formula when we have one.
    if (formulaMaintenance) est = Math.min(Math.max(est, formulaMaintenance * 0.65), formulaMaintenance * 1.35);
    dataMaintenance = round10(est);
    dataBasis = { days: x.dailyIntake.length, weighIns: sorted.length, kgPerWeek: Math.round(kgPerDay * 7 * 100) / 100 };
  }

  const maintenance = dataMaintenance ?? formulaMaintenance;
  const maintenanceSource = dataMaintenance ? "your data" : formulaMaintenance ? "formula" : null;

  let target: number | null = null;
  let targetKgPerWeek: number | null = null;
  let floorApplied = false;
  let protein: number | null = null;
  let fat: number | null = null;
  let carbs: number | null = null;
  if (maintenance && x.latestWeightKg) {
    targetKgPerWeek = Math.round(x.latestWeightKg * (x.weeklyLossPct / 100) * 100) / 100;
    const raw = maintenance - (targetKgPerWeek * KCAL_PER_KG) / 7;
    const floor = Math.max(1200, restBurn ?? 0);
    floorApplied = raw < floor;
    target = round10(Math.max(raw, floor));
    protein = Math.round(1.8 * x.latestWeightKg);
    fat = Math.round(0.8 * x.latestWeightKg);
    carbs = Math.max(50, Math.round((target - protein * 4 - fat * 9) / 4));
  }

  return {
    bmr: restBurn,
    formulaMaintenance,
    dataMaintenance,
    dataBasis,
    maintenance,
    maintenanceSource,
    target,
    targetKgPerWeek,
    floorApplied,
    protein,
    fat,
    carbs,
    missing,
  };
}
