// Turns exports from MyFitnessPal, Strong, Hevy and OpenFit itself into an ImportPlan. Pure.
import { isDayKey } from "@/lib/dates";
import type { Meal } from "@/lib/nutrition";
import { csvObjects, num } from "./csv";
import type { ImportFood, ImportPlan, ImportSet, ImportSource, ImportWeight, ImportWorkout } from "./types";

const LB = 0.45359237;
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The calendar day of a date as apps write it: "2024-01-15", "2024-01-15 07:30:00",
 * "15 Jan 2024, 07:00", "Jan 15, 2024", "01/15/2024". null if it can't be read.
 */
export function toDay(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return isDayKey(`${m[1]}-${m[2]}-${m[3]}`) ? `${m[1]}-${m[2]}-${m[3]}` : null;
  m = t.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(Number(m[1]))}`;
  m = t.match(/^([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(Number(m[2]))}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // US style, which is what MyFitnessPal writes
  if (m) return `${m[3]}-${pad(Number(m[1]))}-${pad(Number(m[2]))}`;
  return null;
}

const MEAL_MAP: Record<string, Meal> = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "snack", snacks: "snack" };
const asMeal = (s: string): Meal => MEAL_MAP[s.trim().toLowerCase()] ?? "snack";
const nz = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * MyFitnessPal "Nutrition" export (Meal-level CSV): one row per meal per day with totals,
 * e.g. Date, Meal, Calories, Fat (g), …, Carbohydrates (g), …, Protein (g).
 * MyFitnessPal doesn't export individual foods, so each meal becomes one entry.
 */
function parseMyFitnessPal(text: string): ImportPlan {
  const plan: ImportPlan = { source: "myfitnesspal", foods: [], workouts: [], weights: [], skipped: [] };
  for (const [i, r] of csvObjects(text).entries()) {
    const day = toDay(r["date"] ?? "");
    const calories = num(r["calories"]);
    if (!day || !Number.isFinite(calories)) {
      plan.skipped.push(`Row ${i + 2}: no date or calories`);
      continue;
    }
    const meal = asMeal(r["meal"] ?? "");
    plan.foods.push({
      day,
      meal,
      name: `${(r["meal"] || "Meal").trim()} (from MyFitnessPal)`,
      calories: Math.round(nz(calories)),
      protein: nz(num(r["protein (g)"] ?? r["protein"])),
      carbs: nz(num(r["carbohydrates (g)"] ?? r["carbohydrates"] ?? r["carbs"])),
      fat: nz(num(r["fat (g)"] ?? r["fat"])),
    });
  }
  return plan;
}

/** Groups set rows into workouts by start time + workout name. */
function groupWorkouts(rows: { key: string; day: string; name: string; notes?: string | null; set: ImportSet }[]): ImportWorkout[] {
  const map = new Map<string, ImportWorkout>();
  for (const r of rows) {
    const w = map.get(r.key) ?? { day: r.day, name: r.name, notes: r.notes ?? null, sets: [] };
    w.sets.push(r.set);
    map.set(r.key, w);
  }
  return [...map.values()];
}

/**
 * Strong export (CSV): Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps,
 * Distance, Seconds, Notes, Workout Notes, RPE. Weights are in the unit you used in Strong.
 */
function parseStrong(text: string, unit: "kg" | "lb"): ImportPlan {
  const plan: ImportPlan = { source: "strong", foods: [], workouts: [], weights: [], skipped: [] };
  const rows: Parameters<typeof groupWorkouts>[0] = [];
  for (const [i, r] of csvObjects(text).entries()) {
    const day = toDay(r["date"] ?? "");
    const reps = num(r["reps"]);
    const exercise = r["exercise name"];
    if (!day || !exercise) {
      plan.skipped.push(`Row ${i + 2}: no date or exercise`);
      continue;
    }
    if (!Number.isFinite(reps) || reps <= 0) continue; // cardio/time-only rows
    const weight = nz(num(r["weight"]));
    const setOrder = (r["set order"] ?? "").toUpperCase();
    rows.push({
      key: `${r["date"]}|${r["workout name"]}`,
      day,
      name: r["workout name"] || "Workout",
      notes: r["workout notes"] || null,
      set: {
        exercise,
        reps: Math.round(reps),
        weightKg: unit === "lb" ? weight * LB : weight,
        rpe: Number.isFinite(num(r["rpe"])) ? num(r["rpe"]) : null,
        notes: r["notes"] || null,
        kind: setOrder === "W" ? "warmup" : setOrder === "D" ? "drop" : "work",
      },
    });
  }
  plan.workouts = groupWorkouts(rows);
  return plan;
}

/**
 * Hevy export (CSV): title, start_time, end_time, description, exercise_title, superset_id,
 * exercise_notes, set_index, set_type, weight_kg (or weight_lbs), reps, distance_km,
 * duration_seconds, rpe.
 */
function parseHevy(text: string): ImportPlan {
  const plan: ImportPlan = { source: "hevy", foods: [], workouts: [], weights: [], skipped: [] };
  const rows: Parameters<typeof groupWorkouts>[0] = [];
  for (const [i, r] of csvObjects(text).entries()) {
    const day = toDay(r["start_time"] ?? "");
    const exercise = r["exercise_title"];
    if (!day || !exercise) {
      plan.skipped.push(`Row ${i + 2}: no date or exercise`);
      continue;
    }
    const reps = num(r["reps"]);
    if (!Number.isFinite(reps) || reps <= 0) continue;
    const kg = Number.isFinite(num(r["weight_kg"])) ? num(r["weight_kg"]) : nz(num(r["weight_lbs"])) * LB;
    const type = (r["set_type"] ?? "").toLowerCase();
    rows.push({
      key: `${r["start_time"]}|${r["title"]}`,
      day,
      name: r["title"] || "Workout",
      notes: r["description"] || null,
      set: {
        exercise,
        reps: Math.round(reps),
        weightKg: nz(kg),
        rpe: Number.isFinite(num(r["rpe"])) ? num(r["rpe"]) : null,
        notes: r["exercise_notes"] || null,
        kind: type === "warmup" ? "warmup" : type === "dropset" ? "drop" : "work",
      },
    });
  }
  plan.workouts = groupWorkouts(rows);
  return plan;
}

/** OpenFit's own backup (Settings → Export backup): a real restore of workouts, weigh-ins and food. */
function parseOpenFit(text: string): ImportPlan {
  const plan: ImportPlan = { source: "openfit", foods: [], workouts: [], weights: [], skipped: [] };
  const data = JSON.parse(text) as {
    app?: string;
    exercises?: { id: number; name: string }[];
    workouts?: { day: string; name?: string | null; notes?: string | null; sets?: { exerciseId: number; reps: number; weightKg: number; rpe?: number | null; notes?: string | null; kind?: string }[] }[];
    bodyWeights?: { day: string; weightKg: number }[];
    foodEntries?: ImportFood[];
  };
  if (data.app !== "openfit") throw new Error("This isn't an OpenFit backup file.");
  const names = new Map((data.exercises ?? []).map((e) => [e.id, e.name]));
  for (const w of data.workouts ?? []) {
    if (!isDayKey(w.day)) continue;
    plan.workouts.push({
      day: w.day,
      name: w.name || "Workout",
      notes: w.notes ?? null,
      sets: (w.sets ?? [])
        .filter((s) => names.has(s.exerciseId))
        .map((s) => ({
          exercise: names.get(s.exerciseId)!,
          reps: s.reps,
          weightKg: s.weightKg,
          rpe: s.rpe ?? null,
          notes: s.notes ?? null,
          kind: s.kind === "warmup" || s.kind === "drop" ? s.kind : "work",
        })),
    });
  }
  plan.weights = (data.bodyWeights ?? []).filter((w) => isDayKey(w.day) && w.weightKg > 0).map((w): ImportWeight => ({ day: w.day, weightKg: w.weightKg }));
  plan.foods = (data.foodEntries ?? [])
    .filter((f) => isDayKey(f.day))
    .map((f): ImportFood => ({ day: f.day, meal: asMeal(f.meal), name: f.name, grams: f.grams ?? null, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat }));
  return plan;
}

/** Which app a file came from, from its first line (or JSON). null if it isn't recognised. */
export function detectSource(text: string): ImportSource | null {
  const head = text.replace(/^﻿/, "").slice(0, 2000).toLowerCase();
  if (head.trimStart().startsWith("{") && head.includes('"app"') && head.includes("openfit")) return "openfit";
  if (head.includes("exercise_title") && head.includes("start_time")) return "hevy";
  if (head.includes("exercise name") && head.includes("set order")) return "strong";
  if (head.includes("meal") && head.includes("calories") && head.includes("protein")) return "myfitnesspal";
  return null;
}

/** Reads an export into an ImportPlan. `unit` is the unit weights are in (Strong exports don't say). */
export function parseImport(source: ImportSource, text: string, unit: "kg" | "lb" = "kg"): ImportPlan {
  switch (source) {
    case "myfitnesspal":
      return parseMyFitnessPal(text);
    case "strong":
      return parseStrong(text, unit);
    case "hevy":
      return parseHevy(text);
    case "openfit":
      return parseOpenFit(text);
  }
}
