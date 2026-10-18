"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";
import { addFoodEntry } from "@/actions/food";
import { EMPTY_MANUAL, entryFromManual, entryFromProduct, entryProblem, lenientNumber, type ManualFood } from "@/lib/food-entry";
import { scaleNutrition, type Meal, type Per100g } from "@/lib/nutrition";
import type { FoodProductData } from "@/lib/openfoodfacts";
import { btnPrimary } from "@/lib/ui";
import ManualFoodFields from "./ManualFoodFields";
import MissingNutritionFields from "./MissingNutritionFields";
import PortionFields from "./PortionFields";
import ProductSummary from "./ProductSummary";

/**
 * With a scanned `product`, the user only picks the amount and macros are
 * scaled from per-100 g values. Without one, it's a manual entry form.
 */
export default function FoodEntryForm({
  product,
  barcode,
  defaultMeal,
  day,
}: {
  product?: FoodProductData;
  barcode?: string;
  defaultMeal: Meal;
  /** Log to a past day instead of today. */
  day?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [grams, setGrams] = useState(String(product?.servingQuantityG ?? 100));
  // Products without nutrition data fall back to editable per-100 g values.
  const [per100g, setPer100g] = useState<Per100g>(product?.per100g ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const [manual, setManual] = useState<ManualFood>(EMPTY_MANUAL);
  const scaled = useMemo(() => scaleNutrition(per100g, lenientNumber(grams)), [per100g, grams]);

  /** Validates, saves, and returns to the food log for that day. */
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const entry = product ? entryFromProduct(product, grams, scaled, meal, day) : entryFromManual(manual, meal, barcode, day);
    const problem = entryProblem(entry, !!product);
    if (problem) return setError(problem);
    startTransition(async () => {
      try {
        await addFoodEntry(entry);
        router.push(day ? `/nutrition?day=${day}` : "/nutrition");
        router.refresh();
      } catch {
        setError("Couldn't save — check the values and try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {product && <ProductSummary product={product} per100g={per100g} />}
      {product && !product.nutritionComplete && <MissingNutritionFields per100g={per100g} onChange={setPer100g} />}
      {product ? (
        <PortionFields grams={grams} onGrams={setGrams} meal={meal} onMeal={setMeal} scaled={scaled} />
      ) : (
        <ManualFoodFields value={manual} onChange={setManual} meal={meal} onMeal={setMeal} />
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" className={`${btnPrimary} w-full`} disabled={pending}>
        {pending ? <LoaderCircle size={18} className="animate-spin" /> : <Plus size={18} />}
        Add to {meal}
      </button>
    </form>
  );
}
