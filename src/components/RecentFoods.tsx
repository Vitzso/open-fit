"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { dayKey } from "@/lib/dates";
import type { Meal } from "@/lib/nutrition";
import { enqueue } from "@/lib/offline/outbox";

export interface RecentFood {
  id: number;
  name: string;
  grams: number | null;
  calories: number;
  protein: number;
}

/** One-tap re-logging of foods you eat often. */
export default function RecentFoods({ foods, meal, day }: { foods: RecentFood[]; meal: Meal; day?: string }) {
  const [added, setAdded] = useState<Set<number>>(new Set());

  if (foods.length === 0) return null;

  /** Queues "ate this again" on the phone; it syncs to the PC in the background. */
  function add(f: RecentFood) {
    const onDay = day ?? dayKey();
    enqueue("relog", { entryId: f.id, meal, day: onDay }, { label: `${f.name} · ${Math.round(f.calories)} kcal`, day: onDay });
    setAdded((s) => new Set(s).add(f.id));
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-sm font-semibold text-muted">Recent — tap to add to {meal}</h2>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {foods.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => add(f)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-raised disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.name}</span>
                <span className="text-xs text-muted">
                  {f.grams ? `${f.grams} g · ` : ""}
                  {Math.round(f.calories)} kcal · P {Math.round(f.protein)}
                </span>
              </span>
              {added.has(f.id) ? (
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
