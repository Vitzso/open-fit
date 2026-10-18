import { notFound } from "next/navigation";
import { Trash } from "lucide-react";
import { deleteSet, deleteWorkout } from "@/actions/workouts";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import OptimisticRow from "@/components/OptimisticRow";
import PageHeader from "@/components/PageHeader";
import WorkoutLogger from "@/components/workout/WorkoutLogger";
import type { LastSet } from "@/lib/workout-plan";
import type { LastSession } from "@/lib/progression";
import { prisma } from "@/lib/db";
import { dayKey, formatDay, parseDayKey } from "@/lib/dates";
import { getTemplate } from "@/lib/programs";
import { getSettings } from "@/lib/settings";
import { btnIcon } from "@/lib/ui";
import { round, toDisplay } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [s, workout, exercises, previous] = await Promise.all([
    getSettings(),
    prisma.workout.findUnique({
      where: { id },
      include: { sets: { include: { exercise: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.exercise.findMany({ orderBy: { name: "asc" } }),
    // Most recent previous set of each exercise, to prefill weight and reps.
    prisma.workoutSet.findMany({
      where: { workoutId: { not: id } },
      orderBy: { createdAt: "desc" },
      include: { exercise: true, workout: true },
      take: 500,
    }),
  ]);
  if (!workout) notFound();
  const unit = s.weightUnit;
  const disp = (kg: number) => round(toDisplay(kg, unit), 1);
  const template = getTemplate(workout.templateId);

  const last: Record<string, LastSet> = {};
  // All sets of each exercise's most recent previous workout (for progression tips).
  const lastSessions: Record<string, LastSession> = {};
  const sessionWorkout: Record<string, number> = {};
  for (const p of previous) {
    const k = p.exercise.name.toLowerCase();
    if (!last[k]) {
      const when = parseDayKey(p.workout.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      last[k] = { weight: disp(p.weightKg), reps: p.reps, label: `${disp(p.weightKg)} ${unit} × ${p.reps} on ${when}` };
      sessionWorkout[k] = p.workoutId;
      lastSessions[k] = { day: p.workout.day, sets: [] };
    }
    if (sessionWorkout[k] === p.workoutId) lastSessions[k].sets.unshift({ weight: disp(p.weightKg), reps: p.reps });
  }

  const groups = new Map<string, typeof workout.sets>();
  const done: Record<string, number> = {};
  for (const set of workout.sets) {
    groups.set(set.exercise.name, [...(groups.get(set.exercise.name) ?? []), set]);
    done[set.exercise.name.toLowerCase()] = (done[set.exercise.name.toLowerCase()] ?? 0) + 1;
  }
  const plannedSets = template?.exercises.reduce((n, e) => n + e.sets, 0);
  const doneOfPlan = template?.exercises.reduce((n, e) => n + Math.min(e.sets, done[e.name.toLowerCase()] ?? 0), 0);

  return (
    <div style={{ "--accent": "var(--color-plate-blue)" } as React.CSSProperties}>
      <PageHeader
        title={workout.name || "Workout"}
        section="train"
        back="/workouts"
        backLabel="Train"
        subtitle={
          <>
            {workout.day === dayKey() ? "Today" : formatDay(workout.day)}
            {template ? `, ${doneOfPlan} of ${plannedSets} sets done` : ""}
          </>
        }
        action={
          <form action={deleteWorkout.bind(null, id)}>
            <ConfirmSubmit
              className={btnIcon}
              label="Delete workout"
              message={`Delete this workout and its ${workout.sets.length} sets? This can't be undone.`}
            >
              <Trash size={19} />
            </ConfirmSubmit>
          </form>
        }
      />

      <WorkoutLogger
        workoutId={id}
        unit={unit}
        exercises={exercises.map((e) => e.name)}
        last={last}
        plan={template?.exercises ?? null}
        done={done}
        lastSessions={lastSessions}
      />

      <section aria-labelledby="logged" className="mt-8">
        <h2 id="logged" className="mb-1 font-display text-xl font-semibold">
          Logged sets
        </h2>
        {groups.size === 0 ? (
          <p className="text-sm text-muted">Your sets will appear here as you log them.</p>
        ) : (
          <div className="space-y-4">
            {[...groups].map(([name, sets]) => (
              <div key={name}>
                <h3 className="mb-1 text-[15px] font-semibold text-muted">{name}</h3>
                <ol className="divide-y divide-line">
                  {sets.map((set, i) => (
                    <OptimisticRow
                      key={set.id}
                      onDelete={deleteSet.bind(null, set.id, id)}
                      label={`Delete set ${i + 1} of ${name}`}
                      iconSize={16}
                      className="flex items-center gap-3 py-1.5"
                    >
                      <span className="w-6 text-sm text-faint">{i + 1}</span>
                      <span className="flex-1">
                        <span className="font-display text-lg font-semibold">
                          {disp(set.weightKg)} {unit} × {set.reps}
                        </span>
                        {set.rpe != null && <span className="text-sm text-muted">, RPE {set.rpe}</span>}
                        {set.notes && <span className="block text-sm text-muted">{set.notes}</span>}
                      </span>
                    </OptimisticRow>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
