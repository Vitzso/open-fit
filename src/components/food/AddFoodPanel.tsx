"use client";

import { useState } from "react";
import RecentFoods, { type RecentFood } from "@/components/RecentFoods";
import type { Meal } from "@/lib/nutrition";
import AiFoodPanel from "./AiFoodPanel";
import FoodEntryForm from "./FoodEntryForm";

/**
 * The add-food screen's form and its "Recent" list, sharing one meal choice: picking
 * Snack in the form also makes a tap on a recent food go to Snack.
 */
export default function AddFoodPanel({
  defaultMeal,
  recent,
  day,
  aiText,
}: {
  defaultMeal: Meal;
  recent: RecentFood[];
  day?: string;
  /** Prefills the AI card, e.g. from "Log as food" in the coach chat. */
  aiText?: string;
}) {
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  return (
    <>
      <AiFoodPanel meal={meal} day={day} initialText={aiText} />
      <FoodEntryForm defaultMeal={defaultMeal} meal={meal} onMeal={setMeal} day={day} />
      <RecentFoods foods={recent} meal={meal} day={day} />
    </>
  );
}
