import { notFound } from "next/navigation";
import { Trash } from "lucide-react";
import { deleteSet, deleteWorkout } from "@/actions/workouts";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import OptimisticRow from "@/components/OptimisticRow";
import PageHeader from "@/components/PageHeader";
import PendingList from "@/components/offline/PendingList";
import WorkoutLogger from "@/components/workout/WorkoutLogger";
import type { LastSet } from "@/lib/workout-plan";
import type { LastSession } from "@/lib/progression";
import { prisma } from "@/lib/db";
import { dayKey, formatDay, parseDayKey } from "@/lib/dates";
import { getTemplate } from "@/lib/programs";
import { isModuleEnabled } from "@/lib/modules/server";
import { findLibraryExercise, libraryPhotos } from "@/modules/training-pro/lib/library";
import { userPlanFor } from "@/modules/training-pro/lib/programs";
import { getBests } from "@/modules/training-pro/lib/records";
import { getSettings } from "@/lib/settings";
import { btnIcon } from "@/lib/ui";
import { round, toDisplay } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [s, workout, exercises, previous, pro] = await Promise.all([
    getSettings(),
    prisma.workout.findUnique({
      where: { id },
      include: { sets: { include: { exercise: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.exercise.findMany({ orderBy: { name: "asc" } }),
    // Most recent previous set of each exercise, to prefill weight and reps.
    prisma.workoutSet.findMany({
      // Warm-ups don't count for "last time" or progression.
      where: { workoutId: { not: id }, kind: { not: "warmup" } },
      orderBy: { createdAt: "desc" },
      include: { exercise: true, workout: true },
      take: 500,
    }),
    isModuleEnabled("training-pro"),
  ]);
  if (!workout) notFound();
  const unit = s.weightUnit;
  const disp = (kg: number) => round(toDisplay(kg, unit), 1);
  // A ready-made workout, or (Pro training) one of your own programs.
  const template = getTemplate(workout.templateId);
  const ownPlan = !template && pro ? await userPlanFor(workout.templateId) : null;
  const plan = template?.exercises ?? ownPlan;

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
    if (set.kind !== "warmup") done[set.exercise.name.toLowerCase()] = (done[set.exercise.name.toLowerCase()] ?? 0) + 1;
  }
  const plannedSets = plan?.reduce((n, e) => n + e.sets, 0);
  const doneOfPlan = plan?.reduce((n, e) => n + Math.min(e.sets, done[e.name.toLowerCase()] ?? 0), 0);

  // Pro training module: all-time bests (for PR alerts) and library photos for this workout's exercises.
  let proProps: { bests: Awaited<ReturnType<typeof getBests>>; media: Record<string, { start: string; end: string }> } | null = null;
  if (pro) {
    const media: Record<string, { start: string; end: string }> = {};
    const names = new Set([...(plan ?? []).map((e) => e.name), ...workout.sets.map((x) => x.exercise.name), ...exercises.map((e) => e.name)]);
    for (const n of names) {
      const lib = findLibraryExercise(n);
      const photos = lib && libraryPhotos(lib);
      if (photos) media[n.toLowerCase()] = photos;
    }
    proProps = { bests: await getBests(unit, id), media };
  }

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
            {plan ? `, ${doneOfPlan} of ${plannedSets} sets done` : ""}
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
        plan={plan ?? null}
        done={done}
        lastSessions={lastSessions}
        pro={proProps}
      />

      <PendingList kinds={["set"]} workoutId={id} className="mt-6" />

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
                        {set.kind !== "work" && <span className="text-sm text-muted"> ({set.kind === "warmup" ? "warm-up" : "drop set"})</span>}
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
