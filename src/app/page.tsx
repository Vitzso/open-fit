import Link from "next/link";
import { Settings } from "lucide-react";
import CoachNote from "@/components/coach/CoachNote";
import FuelHero from "@/components/today/FuelHero";
import TrainingCard from "@/components/today/TrainingCard";
import WeekStrip from "@/components/today/WeekStrip";
import WeightSummary from "@/components/today/WeightSummary";
import { parseDayKey } from "@/lib/dates";
import { getTodayData } from "@/lib/today-data";
import { btnIcon } from "@/lib/ui";

export const dynamic = "force-dynamic";

/** Home screen: today's food, the coach's note, what to train, the week, and weight. */
export default async function Today() {
  const d = await getTodayData();
  return (
    <>
      <header className="flex items-center justify-between pt-3">
        <p className="text-[15px] text-muted">
          {parseDayKey(d.today).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <Link href="/settings" className={btnIcon} aria-label="Settings">
          <Settings size={21} />
        </Link>
      </header>
      <FuelHero eaten={d.eaten} goals={d.settings} />
      <CoachNote />
      <TrainingCard todaysWorkout={d.todaysWorkout} next={d.next} />
      <WeekStrip week={d.week} today={d.today} trainedDays={d.trainedDays} foodDays={d.foodDays} />
      <WeightSummary weights={d.weights} delta={d.weightDelta} unit={d.settings.weightUnit} />
    </>
  );
}
