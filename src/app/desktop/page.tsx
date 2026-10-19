import type { Metadata } from "next";
import { Smartphone } from "lucide-react";
import { Plate } from "@/components/PageHeader";
import ChartCard from "@/components/desktop/ChartCard";
import CoachReport from "@/components/desktop/CoachReport";
import LiftGrid from "@/components/desktop/LiftGrid";
import RangePicker from "@/components/desktop/RangePicker";
import StatTile from "@/components/desktop/StatTile";
import ColumnChart, { type ColumnDatum } from "@/components/desktop/charts/ColumnChart";
import LineChart from "@/components/desktop/charts/LineChart";
import { MACRO_COLOR, longDate, shortDate } from "@/components/desktop/charts/scale";
import { asRange, getDashboardData, type DayFood } from "@/lib/dashboard";
import { formatDay } from "@/lib/dates";
import type { Section } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "OpenFit · Progress" };

const GREEN = "#34b46a";
const YELLOW = "#f2c335";
const BLUE = "#4a86f7";
const OTHER = "#6f7884";

const NAV: { href: string; label: string; section: Section }[] = [
  { href: "#overview", label: "Overview", section: "today" },
  { href: "#weight", label: "Body weight", section: "weight" },
  { href: "#food", label: "Food", section: "food" },
  { href: "#training", label: "Training", section: "train" },
  { href: "#coach", label: "Coach report", section: "coach" },
];

const n = (v: number) => v.toLocaleString("en-US");
const signed = (v: number) => `${v > 0 ? "+" : ""}${v}`;

/** Daily rows for short ranges; weekly averages of logged days for long ones, so columns stay readable. */
function foodColumns(days: DayFood[], weekly: boolean): (DayFood & { title: string; tick: string })[] {
  if (!weekly) return days.map((d) => ({ ...d, title: longDate(d.day), tick: shortDate(d.day) }));
  const out: (DayFood & { title: string; tick: string })[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    const logged = chunk.filter((d) => d.calories > 0);
    const avg = (k: keyof Omit<DayFood, "day">) => (logged.length ? Math.round(logged.reduce((t, d) => t + d[k], 0) / logged.length) : 0);
    out.push({
      day: chunk[0].day,
      calories: avg("calories"),
      protein: avg("protein"),
      carbs: avg("carbs"),
      fat: avg("fat"),
      title: `Week of ${shortDate(chunk[0].day)} · daily average of ${logged.length} logged day${logged.length === 1 ? "" : "s"}`,
      tick: shortDate(chunk[0].day),
    });
  }
  return out;
}

/** The desktop dashboard: progress charts for weight, food and training, plus the coach's report. */
export default async function DesktopDashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = asRange((await searchParams).range);
  const d = await getDashboardData(range);
  const u = d.unit;
  const domain: [string, string] = [d.from, d.to];

  // Headline numbers.
  const w = d.weight;
  const towardGoal =
    w.change == null || d.goals.weight == null || w.latest == null ? null : Math.sign(d.goals.weight - (w.latest - w.change)) === Math.sign(w.change);
  const kcalDiff = d.food.avg ? d.food.avg.calories - d.goals.calories : null;
  const proteinDiff = d.food.avg ? d.food.avg.protein - d.goals.protein : null;

  // Food columns: calories split into the energy each macro provides (4/4/9 kcal per gram).
  const weekly = range > 90;
  const foodRows = foodColumns(d.food.days, weekly);
  const calorieData: ColumnDatum[] = foodRows.map((r) => {
    const p = r.protein * 4;
    const f = r.fat * 9;
    const c = r.carbs * 4;
    return { key: r.day, title: r.title, tick: r.tick, values: { protein: p, fat: f, carbs: c, other: Math.max(0, r.calories - p - f - c) } };
  });
  const proteinData: ColumnDatum[] = foodRows.map((r) => ({ key: r.day, title: r.title, tick: r.tick, values: { protein: r.protein } }));
  const volumeData: ColumnDatum[] = d.training.weeks.map((wk) => ({
    key: wk.week,
    title: `Week of ${shortDate(wk.week)} · ${wk.sessions} session${wk.sessions === 1 ? "" : "s"}, ${wk.sets} sets`,
    tick: shortDate(wk.week),
    values: { volume: wk.volume },
  }));

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[232px_1fr]">
      <aside className="hidden border-r border-line bg-ink lg:block">
        <div className="sticky top-0 flex h-dvh flex-col px-5 py-6">
          <p className="mb-8 flex items-center gap-2.5 font-display text-2xl font-bold tracking-wide">
            <Plate section="today" size={18} /> OpenFit
          </p>
          <nav aria-label="Sections">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-muted transition-colors hover:bg-surface hover:text-fg">
                    <Plate section={item.section} size={10} />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto space-y-3 text-sm text-faint">
            <p className="flex items-start gap-2">
              <Smartphone size={16} className="mt-0.5 shrink-0" /> Log food, weigh-ins and workouts in the OpenFit app on your phone.
            </p>
            <p>Data from this PC&apos;s OpenFit database. Nothing leaves your computer.</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 px-6 py-6 xl:px-10">
        <header id="overview" className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-wide">Your progress</h1>
            <p className="mt-1 text-muted">
              {formatDay(d.from, { year: "numeric" })} to {formatDay(d.to, { year: "numeric" })}
            </p>
          </div>
          <RangePicker value={range} />
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            section="weight"
            label="Body weight"
            value={w.latest != null ? String(w.latest) : "–"}
            unit={w.latest != null ? u : undefined}
            delta={
              w.change != null
                ? {
                    text: `${signed(w.change)} ${u} in this period${w.perWeek != null ? ` (${signed(w.perWeek)} ${u}/week)` : ""}`,
                    direction: w.change > 0 ? "up" : w.change < 0 ? "down" : "flat",
                    good: towardGoal,
                  }
                : null
            }
            detail={d.goals.weight != null ? `Goal ${d.goals.weight} ${u}` : w.points.length ? `${w.points.length} weigh-ins` : "No weigh-ins in this period"}
          />
          <StatTile
            section="food"
            label="Calories per day"
            value={d.food.avg ? n(d.food.avg.calories) : "–"}
            unit={d.food.avg ? "kcal" : undefined}
            delta={
              kcalDiff != null
                ? {
                    text: `${signed(kcalDiff)} kcal vs your ${n(d.goals.calories)} goal`,
                    direction: kcalDiff > 0 ? "up" : kcalDiff < 0 ? "down" : "flat",
                    good: Math.abs(kcalDiff) <= d.goals.calories * 0.1,
                  }
                : null
            }
            detail={`Average of ${d.food.loggedDays} logged day${d.food.loggedDays === 1 ? "" : "s"}`}
          />
          <StatTile
            section="coach"
            label="Protein per day"
            value={d.food.avg ? String(d.food.avg.protein) : "–"}
            unit={d.food.avg ? "g" : undefined}
            delta={
              proteinDiff != null
                ? {
                    text: `${signed(proteinDiff)} g vs your ${d.goals.protein} g goal`,
                    direction: proteinDiff > 0 ? "up" : proteinDiff < 0 ? "down" : "flat",
                    good: proteinDiff >= -d.goals.protein * 0.1,
                  }
                : null
            }
            detail="Average of logged days"
          />
          <StatTile
            section="train"
            label="Workouts"
            value={String(d.training.sessions)}
            unit={d.training.sessions === 1 ? "session" : "sessions"}
            detail={`${n(d.training.sets)} sets · ${n(d.training.volume)} ${u} lifted in total`}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <div className="min-w-0 space-y-6">
            <ChartCard
              id="weight"
              section="weight"
              title="Body weight"
              summary={
                w.points.length >= 2
                  ? `Line: average of the last 7 weigh-ins · dots: each weigh-in${d.goals.weight != null ? " · dashed: your goal" : ""}`
                  : undefined
              }
              table={{ columns: ["Day", `Weight (${u})`], rows: [...w.points].reverse().map((p) => [formatDay(p.day), p.value]) }}
            >
              <LineChart
                points={w.points}
                color={YELLOW}
                unit={u}
                label="Weigh-in"
                smooth
                domain={domain}
                height={280}
                goal={d.goals.weight != null ? { value: d.goals.weight, label: `goal ${d.goals.weight} ${u}` } : null}
                emptyText="Log two or more weigh-ins in this period to see your trend."
              />
            </ChartCard>

            <section id="food" className="scroll-mt-6 space-y-6">
              <ChartCard
                section="food"
                title={weekly ? "Calories (weekly average)" : "Calories"}
                summary={`Each column is split into the calories from protein, fat and carbs. Dashed: your ${n(d.goals.calories)} kcal goal.`}
                legend={[
                  { label: "Protein", color: MACRO_COLOR.protein, mark: "bar" },
                  { label: "Fat", color: MACRO_COLOR.fat, mark: "bar" },
                  { label: "Carbs", color: MACRO_COLOR.carbs, mark: "bar" },
                  { label: "Other", color: OTHER, mark: "bar" },
                ]}
                table={{
                  columns: [weekly ? "Week of" : "Day", "kcal", "Protein (g)", "Fat (g)", "Carbs (g)"],
                  rows: [...foodRows].reverse().filter((r) => r.calories > 0).map((r) => [formatDay(r.day), n(r.calories), r.protein, r.fat, r.carbs]),
                }}
              >
                <ColumnChart
                  data={calorieData}
                  series={[
                    { key: "protein", label: "from protein", color: MACRO_COLOR.protein },
                    { key: "fat", label: "from fat", color: MACRO_COLOR.fat },
                    { key: "carbs", label: "from carbs", color: MACRO_COLOR.carbs },
                    { key: "other", label: "other", color: OTHER },
                  ]}
                  unit="kcal"
                  label="Calories per day"
                  height={280}
                  goal={{ value: d.goals.calories, label: `goal ${n(d.goals.calories)} kcal` }}
                  emptyText="No food logged in this period."
                />
              </ChartCard>

              <ChartCard
                section="food"
                title={weekly ? "Protein (weekly average)" : "Protein"}
                summary={`Grams per day. Dashed: your ${d.goals.protein} g goal.`}
              >
                <ColumnChart
                  data={proteinData}
                  series={[{ key: "protein", label: "protein", color: GREEN }]}
                  unit="g"
                  label="Protein per day"
                  height={200}
                  goal={{ value: d.goals.protein, label: `goal ${d.goals.protein} g` }}
                  emptyText="No food logged in this period."
                />
              </ChartCard>
            </section>

            <section id="training" className="scroll-mt-6 space-y-6">
              <ChartCard
                section="train"
                title="Training volume"
                summary={`Weight × reps lifted each week, in ${u}.`}
                table={{
                  columns: ["Week of", "Sessions", "Sets", `Volume (${u})`],
                  rows: [...d.training.weeks].reverse().map((wk) => [formatDay(wk.week), wk.sessions, wk.sets, n(wk.volume)]),
                }}
              >
                <ColumnChart
                  data={volumeData}
                  series={[{ key: "volume", label: "lifted", color: BLUE }]}
                  unit={u}
                  label="Weekly training volume"
                  height={220}
                  emptyText="No workouts logged in this period."
                />
              </ChartCard>

              <ChartCard
                section="train"
                title="Lift progression"
                summary="Your most-trained lifts, each on its own scale: estimated one-rep max per session (best set's reps for bodyweight moves)."
                table={{
                  columns: ["Lift", "Sessions", "Last top set", "Change"],
                  rows: d.training.lifts.map((l) => [l.name, l.points.length, l.lastTop, l.changePct == null ? "–" : `${signed(l.changePct)}%`]),
                }}
              >
                <LiftGrid lifts={d.training.lifts} unit={u} domain={domain} />
              </ChartCard>
            </section>
          </div>

          <div className="xl:sticky xl:top-6 xl:self-start">
            <CoachReport range={range} />
          </div>
        </div>
      </div>
    </div>
  );
}
