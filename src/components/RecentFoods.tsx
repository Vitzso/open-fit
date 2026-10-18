"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { relogFoodEntry } from "@/actions/food";
import type { Meal } from "@/lib/nutrition";

export interface RecentFood {
  id: number;
  name: string;
  grams: number | null;
  calories: number;
  protein: number;
}

/** One-tap re-logging of foods you eat often. */
export default function RecentFoods({ foods, meal, day }: { foods: RecentFood[]; meal: Meal; day?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());

  if (foods.length === 0) return null;

  function add(id: number) {
    setBusyId(id);
    startTransition(async () => {
      try {
        await relogFoodEntry(id, meal, day);
        setAdded((s) => new Set(s).add(id));
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-sm font-semibold text-muted">Recent — tap to add to {meal}</h2>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {foods.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => add(f.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-raised disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.name}</span>
                <span className="text-xs text-muted">
                  {f.grams ? `${f.grams} g · ` : ""}
                  {Math.round(f.calories)} kcal · P {Math.round(f.protein)}
                </span>
              </span>
              {busyId === f.id ? (
                <LoaderCircle size={18} className="animate-spin text-muted" />
              ) : added.has(f.id) ? (
                <Check size={18} className="text-plate-green" />
              ) : (
                <Plus size={18} className="text-muted" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
