// What an import produces, whichever app the file came from. Weights are already in kg.
import type { Meal } from "@/lib/nutrition";

export interface ImportFood {
  day: string; // YYYY-MM-DD
  meal: Meal;
  name: string;
  grams?: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ImportSet {
  exercise: string;
  reps: number;
  weightKg: number;
  rpe?: number | null;
  notes?: string | null;
  kind?: "warmup" | "work" | "drop";
}

export interface ImportWorkout {
  day: string;
  name: string;
  notes?: string | null;
  sets: ImportSet[];
}

export interface ImportWeight {
  day: string;
  weightKg: number;
}

export interface ImportPlan {
  source: ImportSource;
  foods: ImportFood[];
  workouts: ImportWorkout[];
  weights: ImportWeight[];
  /** Rows skipped while reading (bad dates, empty lines…), with why. */
  skipped: string[];
}

export const IMPORT_SOURCES = ["myfitnesspal", "strong", "hevy", "openfit"] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const SOURCE_LABEL: Record<ImportSource, string> = {
  myfitnesspal: "MyFitnessPal",
  strong: "Strong",
  hevy: "Hevy",
  openfit: "OpenFit backup",
};
