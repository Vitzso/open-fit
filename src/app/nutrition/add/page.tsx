import AddFoodPanel from "@/components/food/AddFoodPanel";
import PageHeader from "@/components/PageHeader";
import type { RecentFood } from "@/components/RecentFoods";
import { prisma } from "@/lib/db";
import { formatDay, pastDayParam } from "@/lib/dates";
import { asMeal } from "@/lib/nutrition";

export const dynamic = "force-dynamic";

export default async function AddFoodPage({
  searchParams,
}: {
  searchParams: Promise<{ meal?: string; day?: string }>;
}) {
  const q = await searchParams;
  const meal = asMeal(q.meal);
  const day = pastDayParam(q.day);

  // Most recent entry per distinct food name.
  const latest = await prisma.foodEntry.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const seen = new Set<string>();
  const recent: RecentFood[] = [];
  for (const e of latest) {
    const key = e.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push({ id: e.id, name: e.name, grams: e.grams, calories: e.calories, protein: e.protein });
    if (recent.length === 15) break;
  }

  return (
    <>
      <PageHeader
        title="Add food"
        section="food"
        backLabel="Food"
        subtitle={day ? `Adding to ${formatDay(day)}` : "Type it in, or tap something you had recently."}
        back={day ? `/nutrition?day=${day}` : "/nutrition"}
      />
      <AddFoodPanel defaultMeal={meal} recent={recent} day={day} />
    </>
  );
}
