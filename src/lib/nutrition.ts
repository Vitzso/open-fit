// Pure helpers shared by server and client code.

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Per100g {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type Meal = (typeof MEALS)[number];

export const asMeal = (m: string | null | undefined): Meal =>
  (MEALS as readonly string[]).includes(m ?? "") ? (m as Meal) : defaultMealForNow();

export function defaultMealForNow(d = new Date()): Meal {
  const h = d.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function scaleNutrition(per100g: Per100g, grams: number): Macros {
  const f = Math.max(0, grams) / 100;
  return {
    calories: Math.round(per100g.kcal * f),
    protein: r1(per100g.protein * f),
    carbs: r1(per100g.carbs * f),
    fat: r1(per100g.fat * f),
  };
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (a, b) => ({
      calories: a.calories + b.calories,
      protein: a.protein + b.protein,
      carbs: a.carbs + b.carbs,
      fat: a.fat + b.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** EAN-8, UPC-A (12), EAN-13 and GTIN-14 are all 8–14 digits. */
export const isPlausibleBarcode = (code: string) => /^\d{8,14}$/.test(code);
