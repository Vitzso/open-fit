// Builds a food log entry from the scan/manual form (pure).
import type { Macros, Meal } from "./nutrition";
import type { FoodProductData } from "./openfoodfacts";
import { parseDecimal } from "./units";

/** Lenient number parsing for live previews: "1,5" → 1.5, junk or negatives → 0. */
export const lenientNumber = (v: string) => {
  const n = parseDecimal(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Typed-in values for a food without a barcode match. */
export interface ManualFood {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export const EMPTY_MANUAL: ManualFood = { name: "", calories: "", protein: "", carbs: "", fat: "" };

/** What addFoodEntry receives. */
export interface FoodEntryDraft extends Macros {
  day?: string;
  meal: Meal;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  grams?: number;
}

/** From a scanned product: the amount eaten and the macros already scaled to it. */
export function entryFromProduct(product: FoodProductData, grams: string, scaled: Macros, meal: Meal, day?: string): FoodEntryDraft {
  return { day, meal, name: product.name, brand: product.brand, barcode: product.barcode, grams: lenientNumber(grams), ...scaled };
}

/** From the manual form (optionally keeping the barcode that wasn't found). */
export function entryFromManual(m: ManualFood, meal: Meal, barcode?: string, day?: string): FoodEntryDraft {
  return {
    day,
    meal,
    name: m.name.trim(),
    barcode: barcode ?? null,
    calories: lenientNumber(m.calories),
    protein: lenientNumber(m.protein),
    carbs: lenientNumber(m.carbs),
    fat: lenientNumber(m.fat),
  };
}

/** The message to show if the entry can't be saved yet, or null. */
export function entryProblem(entry: FoodEntryDraft, fromProduct: boolean): string | null {
  if (!entry.name) return "Give the food a name.";
  if (fromProduct && !entry.grams) return "Enter how much you had.";
  return null;
}
