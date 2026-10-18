import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { startWorkout } from "@/actions/workouts";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { dayKey, daysAgoKey, formatDay } from "@/lib/dates";
import { nextTemplate, TEMPLATES } from "@/lib/programs";
import { getSettings } from "@/lib/settings";
import { btnSecondary, input } from "@/lib/ui";
import { round, toDisplay } from "@/lib/units";

export const dynamic = "force-dynamic";

function relativeDay(day: string) {
  if (day === dayKey()) return "Today";
  if (day === daysAgoKey(1)) return "Yesterday";
  return formatDay(day);
}

export default async function TrainPage() {
  const [s, workouts, lastTemplated] = await Promise.all([
    getSettings(),
    prisma.workout.findMany({
      orderBy: [{ day: "desc" }, { startedAt: "desc" }],
      take: 30,
      include: { sets: { include: { exercise: true } } },
    }),
    prisma.workout.findFirst({ where: { templateId: { not: null } }, orderBy: { startedAt: "desc" } }),
  ]);
  const suggested = nextTemplate(lastTemplated?.templateId);

  return (
    <div style={{ "--accent": "var(--color-plate-blue)" } as React.CSSProperties}>
      <PageHeader title="Train" section="train" subtitle="Pick a ready-made workout, or start your own." />

      <section aria-labelledby="templates" className="mb-8">
        <h2 id="templates" className="mb-1 font-display text-xl font-semibold">
          Ready-made workouts
        </h2>
        <p className="mb-3 text-sm text-muted">Each one lists sets, reps, rest and a form tip for every exercise.</p>
        <ul className="divide-y divide-line">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <Link href={`/workouts/template/${t.id}`} className="flex items-center gap-3 py-3.5 active:opacity-70">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 font-display text-[22px] leading-tight font-semibold">
                    {t.name}
                    {t.id === suggested.id && (
                      <span className="rounded-full bg-plate-blue/20 px-2 py-0.5 font-sans text-xs font-semibold text-plate-blue">
                        Up next
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {t.exercises.length} exercises, {t.minutes} min, {t.level.toLowerCase()}
                    {t.equipment === "No equipment" ? ", no equipment" : ""}
                  </p>
                </div>
                <ChevronRight size={20} className="shrink-0 text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="own" className="mb-8">
        <h2 id="own" className="mb-1 font-display text-xl font-semibold">
          Your own workout
        </h2>
        <p className="mb-3 text-sm text-muted">Start empty and add any exercises as you go.</p>
        <form action={startWorkout} className="flex gap-2">
          <input name="name" aria-label="Workout name (optional)" className={input} placeholder="Name it (optional)" maxLength={100} />
          <button className={`${btnSecondary} shrink-0`}>
            <Plus size={18} /> Start
          </button>
        </form>
      </section>

      <section aria-labelledby="history">
        <h2 id="history" className="mb-1 font-display text-xl font-semibold">
          Recent workouts
        </h2>
        {workouts.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet. Your finished workouts will show up here.</p>
        ) : (
          <ul className="divide-y divide-line">
            {workouts.map((w) => {
              const exercises = [...new Set(w.sets.map((x) => x.exercise.name))];
              const volume = w.sets.reduce((v, x) => v + x.weightKg * x.reps, 0);
              return (
                <li key={w.id}>
                  <Link href={`/workouts/${w.id}`} className="flex items-center gap-3 py-3 active:opacity-70">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[17px] font-semibold">{w.name || "Workout"}</span>
                        <span className="shrink-0 text-sm text-muted">{relativeDay(w.day)}</span>
                      </p>
                      <p className="truncate text-sm text-muted">
                        {w.sets.length === 0
                          ? "No sets logged"
                          : `${w.sets.length} sets, ${round(toDisplay(volume, s.weightUnit), 0).toLocaleString("en-US")} ${s.weightUnit} lifted${
                              exercises.length ? `: ${exercises.join(", ")}` : ""
                            }`}
                      </p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-faint" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
