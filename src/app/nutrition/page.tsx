import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, ScanBarcode } from "lucide-react";
import { deleteFoodEntry } from "@/actions/food";
import MacroBar from "@/components/MacroBar";
import PendingList from "@/components/offline/PendingList";
import OptimisticRow from "@/components/OptimisticRow";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { dayKey, daysAgoKey, formatDay, pastDayParam } from "@/lib/dates";
import { MEALS, sumMacros } from "@/lib/nutrition";
import { getSettings } from "@/lib/settings";
import { btnIcon, btnPrimary, btnSecondary, btnSmall, card } from "@/lib/ui";

export const dynamic = "force-dynamic";

const MEAL_NAMES: Record<(typeof MEALS)[number], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

function dayLabel(day: string) {
  if (day === dayKey()) return "Today";
  if (day === daysAgoKey(1)) return "Yesterday";
  return formatDay(day);
}

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const pastDay = pastDayParam((await searchParams).day);
  const day = pastDay ?? dayKey();
  const isToday = !pastDay;
  const dayQuery = pastDay ? `day=${pastDay}` : "";
  const [settings, entries] = await Promise.all([
    getSettings(),
    prisma.foodEntry.findMany({ where: { day }, orderBy: { createdAt: "asc" } }),
  ]);
  const total = sumMacros(entries);
  const remaining = settings.calorieGoal - total.calories;
  const shift = (n: number) => {
    const [y, m, d] = day.split("-").map(Number);
    return daysAgoKey(-n, new Date(y, m - 1, d));
  };

  return (
    <div style={{ "--accent": "var(--color-plate-green)" } as React.CSSProperties}>
      <PageHeader
        title="Food"
        section="food"
        subtitle={dayLabel(day)}
        action={
          <div className="flex items-center gap-1" role="group" aria-label="Change day">
            <Link href={`/nutrition?day=${shift(-1)}`} className={btnIcon} aria-label="Previous day">
              <ChevronLeft size={22} />
            </Link>
            {isToday ? (
              <span className={`${btnIcon} opacity-30`} aria-hidden>
                <ChevronRight size={22} />
              </span>
            ) : (
              <Link href={shift(1) === dayKey() ? "/nutrition" : `/nutrition?day=${shift(1)}`} className={btnIcon} aria-label="Next day">
                <ChevronRight size={22} />
              </Link>
            )}
          </div>
        }
      />

      <section aria-label="Day summary" className={`${card} mb-4 space-y-4`}>
        <p className="font-display leading-none font-bold">
          <span className={`text-[52px] ${remaining < 0 ? "text-plate-yellow" : ""}`}>
            {Math.abs(Math.round(remaining)).toLocaleString("en-US")}
          </span>
          <span className="ml-2 text-[22px] text-muted">kcal {remaining < 0 ? "over" : "left"}</span>
        </p>
        <p className="-mt-2 text-sm text-muted">
          {Math.round(total.calories).toLocaleString("en-US")} eaten of {settings.calorieGoal.toLocaleString("en-US")} kcal
        </p>
        <MacroBar label="Protein" value={total.protein} goal={settings.proteinGoal} color="bg-plate-red" />
        <MacroBar label="Carbs" value={total.carbs} goal={settings.carbsGoal} color="bg-plate-yellow" />
        <MacroBar label="Fat" value={total.fat} goal={settings.fatGoal} color="bg-plate-blue" />
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <Link href={`/nutrition/scan${dayQuery ? `?${dayQuery}` : ""}`} className={btnPrimary}>
          <ScanBarcode size={19} /> Scan food
        </Link>
        <Link href={`/nutrition/add${dayQuery ? `?${dayQuery}` : ""}`} className={btnSecondary}>
          <Plus size={19} /> Add food
        </Link>
      </div>

      <PendingList kinds={["food", "relog"]} day={day} className="mb-6" />

      <div className="space-y-7">
        {MEALS.map((meal) => {
          const items = entries.filter((e) => e.meal === meal);
          const sub = sumMacros(items);
          const addHref = `/nutrition/add?meal=${meal}${dayQuery ? `&${dayQuery}` : ""}`;
          return (
            <section key={meal} aria-labelledby={`meal-${meal}`}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 id={`meal-${meal}`} className="font-display text-xl font-semibold">
                  {MEAL_NAMES[meal]}
                  {items.length > 0 && <span className="ml-2 font-sans text-sm font-normal text-muted">{Math.round(sub.calories)} kcal</span>}
                </h2>
                <Link href={addHref} className={btnSmall} aria-label={`Add to ${MEAL_NAMES[meal].toLowerCase()}`}>
                  <Plus size={16} /> Add
                </Link>
              </div>
              {items.length === 0 ? (
                <p className="text-[15px] text-faint">Nothing logged yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((e) => (
                    <OptimisticRow
                      key={e.id}
                      onDelete={deleteFoodEntry.bind(null, e.id)}
                      label={`Delete ${e.name}`}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-medium">{e.name}</p>
                        <p className="text-sm text-muted">
                          {e.grams ? `${e.grams} g, ` : ""}
                          {Math.round(e.protein)} g protein
                        </p>
                      </div>
                      <span className="font-display text-lg font-semibold">{Math.round(e.calories)}</span>
                    </OptimisticRow>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
