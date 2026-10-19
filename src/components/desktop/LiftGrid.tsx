import { Plate } from "@/components/PageHeader";
import type { LiftSeries } from "@/lib/dashboard";
import LineChart from "./charts/LineChart";

const BLUE = "#4a86f7";

/**
 * Small multiples: one chart per lift (the six trained most often), each on its own
 * scale, so lifts of very different weights can all be read. Weighted lifts plot the
 * estimated one-rep max per session; bodyweight ones the best set's reps.
 */
export default function LiftGrid({ lifts, unit, domain }: { lifts: LiftSeries[]; unit: string; domain: [string, string] }) {
  if (lifts.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">No workouts logged in this period.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {lifts.map((l) => {
        const latest = l.points.at(-1)!.value;
        const metric = l.metric === "e1rm" ? "est. 1RM" : "best set";
        const metricUnit = l.metric === "e1rm" ? unit : "reps";
        return (
          <article key={l.name} className="rounded-2xl bg-raised/60 p-4">
            <header className="mb-1 flex items-baseline justify-between gap-3">
              <h3 className="flex items-center gap-2 truncate font-semibold">
                <Plate section="train" size={9} />
                {l.name}
              </h3>
              <p className="shrink-0 text-sm text-muted">
                <span className="font-semibold text-fg">
                  {latest} {metricUnit}
                </span>{" "}
                {metric}
              </p>
            </header>
            <p className="mb-2 text-sm text-faint">
              {l.points.length} session{l.points.length === 1 ? "" : "s"}
              {l.changePct != null && (
                <>
                  {" · "}
                  <span className={l.changePct > 0 ? "text-plate-green" : l.changePct < 0 ? "text-plate-red" : ""}>
                    {l.changePct > 0 ? "+" : ""}
                    {l.changePct}%
                  </span>
                </>
              )}
              {" · last top set "}
              {l.lastTop}
            </p>
            <LineChart
              points={l.points}
              color={BLUE}
              unit={metricUnit}
              label={`${l.name} ${metric}`}
              height={150}
              compact
              domain={domain}
              emptyText="One session so far. The trend starts with the next one."
            />
            {l.next && <p className="mt-2 text-sm text-muted">Next: {l.next}</p>}
          </article>
        );
      })}
    </div>
  );
}
