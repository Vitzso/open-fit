// Validation schemas for server actions. Server actions are public HTTP
// endpoints: every argument is validated here, never trusted from the client.
import { z } from "zod";
import { dayKey, isDayKey } from "@/lib/dates";
import { MEALS } from "@/lib/nutrition";
import { parseDecimal } from "@/lib/units";

/** A positive database id. */
export const id = z.number().int().positive();

/** A local date (YYYY-MM-DD) that isn't in the future; omitted means today. */
export const pastDay = z
  .string()
  .refine((d) => isDayKey(d) && d <= dayKey(), "Date can't be in the future")
  .optional();

/** A number typed by the user ("88,4" allowed) between 0 and `max`. */
export const decimal = (max: number) => z.preprocess(parseDecimal, z.number().finite().min(0).max(max));

/** Like `decimal`, but an empty field means "not set". */
export const optDecimal = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : parseDecimal(v)), z.number().finite().min(0).max(max).optional());

/** Empty string from a <select> means "not chosen". */
export const optChoice = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), z.enum(values).optional());

export const FoodEntryInput = z.object({
  day: pastDay,
  meal: z.enum(MEALS),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(200).nullish(),
  barcode: z.string().regex(/^\d{8,14}$/).nullish(),
  grams: z.number().finite().min(0).max(10_000).nullish(),
  calories: z.number().finite().min(0).max(20_000),
  protein: z.number().finite().min(0).max(2_000),
  carbs: z.number().finite().min(0).max(2_000),
  fat: z.number().finite().min(0).max(2_000),
});

export const SetInput = z.object({
  workoutId: id,
  exerciseName: z.string().trim().min(1).max(100),
  reps: z.number().int().min(0).max(1000),
  weight: z.number().finite().min(0).max(2000), // in the user's display unit
  rpe: z.number().min(1).max(10).nullish(),
  notes: z.string().trim().max(500).nullish(),
});
