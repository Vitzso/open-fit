import { parseDayKey } from "@/lib/dates";

type DayState = { isToday: boolean; isFuture: boolean; trained: boolean; ate: boolean };

/** Circle style: blue when trained, faded for days still to come, ring on today. */
function circleClass({ isToday, isFuture, trained }: DayState): string {
  const fill = trained ? "bg-plate-blue text-white" : isFuture ? "border border-dashed border-line text-faint" : "bg-surface text-muted";
  return `${fill} ${isToday ? "ring-2 ring-plate-white/70" : ""}`;
}

/** One day: weekday letter, date (blue when trained) and a green dot when food was logged. */
function Day({ day, state }: { day: string; state: DayState }) {
  const date = parseDayKey(day);
  return (
    <li className="flex flex-col items-center gap-1.5">
      <span className={`text-xs ${state.isToday ? "font-semibold text-fg" : "text-faint"}`}>{date.toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
      <span
        className={`grid h-9 w-9 place-items-center rounded-full font-display text-[15px] font-semibold ${circleClass(state)}`}
        title={state.isFuture ? "Coming up" : state.trained ? "Trained" : "No workout"}
      >
        {date.getDate()}
      </span>
      <span
        aria-label={state.isFuture ? undefined : state.ate ? "Food logged" : "No food logged"}
        className={`h-1.5 w-1.5 rounded-full ${state.ate ? "bg-plate-green" : "bg-transparent"}`}
      />
    </li>
  );
}

/** This calendar week, Sunday to Saturday. Days after today are shown faded. */
export default function WeekStrip({ week, today, trainedDays, foodDays }: { week: string[]; today: string; trainedDays: Set<string>; foodDays: Set<string> }) {
  return (
    <section aria-label="This week" className="mb-8">
      <h2 className="mb-3 font-display text-xl font-semibold">This week</h2>
      <ol className="grid grid-cols-7 gap-1 text-center">
        {week.map((d) => (
          <Day key={d} day={d} state={{ isToday: d === today, isFuture: d > today, trained: trainedDays.has(d), ate: foodDays.has(d) }} />
        ))}
      </ol>
      <p className="mt-2 text-sm text-faint">Blue: trained. Green dot: food logged.</p>
    </section>
  );
}
