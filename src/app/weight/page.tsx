import { deleteBodyWeight } from "@/actions/weight";
import OptimisticRow from "@/components/OptimisticRow";
import PendingList from "@/components/offline/PendingList";
import WeighInForm from "@/components/WeighInForm";
import PageHeader from "@/components/PageHeader";
import WeightChart from "@/components/WeightChart";
import { prisma } from "@/lib/db";
import { dayKey, daysAgoKey, formatDay } from "@/lib/dates";
import { getSettings } from "@/lib/settings";

import { round, toDisplay } from "@/lib/units";

export const dynamic = "force-dynamic";

/** One sentence about the last week's change, judged against a healthy fat-loss pace. */
function trendSentence(deltaKg: number, fromKg: number, unit: string, deltaDisp: number) {
  const pct = (deltaKg / fromKg) * 100;
  const amount = `${Math.abs(round(deltaDisp, 1))} ${unit}`;
  if (Math.abs(deltaDisp) < 0.1) return { text: "Same as last week.", tone: "text-muted" };
  if (pct > 0) return { text: `Up ${amount} since last week.`, tone: "text-plate-yellow" };
  if (pct < -1) return { text: `Down ${amount} since last week. That's faster than the 1% a week limit; consider eating a little more.`, tone: "text-plate-yellow" };
  if (pct <= -0.5) return { text: `Down ${amount} since last week. A healthy pace: 0.5–1% a week is the sweet spot.`, tone: "text-plate-green" };
  return { text: `Down ${amount} since last week. Slow and steady.`, tone: "text-plate-green" };
}

export default async function WeightPage() {
  const [s, rows] = await Promise.all([
    getSettings(),
    prisma.bodyWeight.findMany({ where: { day: { gte: daysAgoKey(89) } }, orderBy: { day: "asc" } }),
  ]);
  const unit = s.weightUnit;
  const disp = (kg: number) => round(toDisplay(kg, unit), 1);
  const latest = rows.at(-1);
  const weekAgo = [...rows].reverse().find((r) => r.day <= daysAgoKey(7));
  const trend = latest && weekAgo ? trendSentence(latest.weightKg - weekAgo.weightKg, weekAgo.weightKg, unit, disp(latest.weightKg) - disp(weekAgo.weightKg)) : null;
  const toGoal = latest && s.goalWeightKg ? round(disp(latest.weightKg) - disp(s.goalWeightKg), 1) : null;
  // Which side of the goal you started from (first weigh-in shown), to tell "to go" from "past it".
  const startSide = rows.length && s.goalWeightKg ? Math.sign(disp(rows[0].weightKg) - disp(s.goalWeightKg)) : 0;
  const goalText =
    toGoal == null
      ? null
      : toGoal === 0
        ? "You've reached your goal weight."
        : startSide !== 0 && Math.sign(toGoal) !== startSide
          ? `You're past your goal of ${disp(s.goalWeightKg!)} ${unit} by ${Math.abs(toGoal)} ${unit}.`
          : `${Math.abs(toGoal)} ${unit} to your goal of ${disp(s.goalWeightKg!)} ${unit}.`;

  return (
    <div style={{ "--accent": "var(--color-plate-yellow)" } as React.CSSProperties}>
      <PageHeader title="Weight" section="weight" subtitle="Weigh in at the same time each morning for a fair trend." />

      {latest && (
      <section aria-label="Current weight" className="mb-6">
        <p className="font-display leading-none font-bold">
          <span className="text-[64px]">{disp(latest.weightKg)}</span>
          <span className="ml-2 text-[24px] text-muted">{unit}</span>
        </p>
        <p className={`mt-2 text-[16px] leading-snug ${trend?.tone ?? "text-muted"}`}>
          {trend ? trend.text : "Log another weigh-in next week to see your trend."}
        </p>
        {goalText && <p className="mt-1 text-[15px] text-muted">{goalText}</p>}
        {rows.length >= 2 && (
          <>
            <div className="mt-4">
              <WeightChart
                points={rows.map((r) => ({ day: r.day, value: disp(r.weightKg) }))}
                goal={s.goalWeightKg ? disp(s.goalWeightKg) : null}
                unit={unit}
              />
            </div>
            <p className="mt-1 text-sm text-faint">Dots are weigh-ins; the line is your 7-entry average{s.goalWeightKg ? "; dashed is your goal" : ""}.</p>
          </>
        )}
      </section>
      )}

      <PendingList kinds={["weight"]} className="mb-4" />
      <WeighInForm unit={unit} placeholder={latest ? String(disp(latest.weightKg)) : "0.0"} first={!latest} />

      <section aria-labelledby="history">
        <h2 id="history" className="mb-1 font-display text-xl font-semibold">
          History
        </h2>
        {rows.length === 0 ? (
          <p className="text-[15px] text-faint">No weigh-ins in the last 90 days.</p>
        ) : (
          <ul className="divide-y divide-line">
            {[...rows].reverse().map((r) => (
              <OptimisticRow
                key={r.id}
                onDelete={deleteBodyWeight.bind(null, r.id)}
                label={`Delete weigh-in from ${formatDay(r.day)}`}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="flex-1 text-[15px] text-muted">{r.day === dayKey() ? "Today" : formatDay(r.day)}</span>
                <span className="font-display text-lg font-semibold">
                  {disp(r.weightKg)} {unit}
                </span>
              </OptimisticRow>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
