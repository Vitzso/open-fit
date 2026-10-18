import Link from "next/link";
import { Plate } from "@/components/PageHeader";
import type { WorkoutTemplate } from "@/lib/programs";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";

/** Continue today's workout. */
function ContinueWorkout({ workout }: { workout: { id: number; name: string | null; sets: number } }) {
  return (
    <>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Plate section="train" size={12} /> Today&apos;s workout
      </p>
      <h2 className="mt-1 font-display text-[28px] leading-tight font-bold">{workout.name || "Workout"}</h2>
      <p className="mt-1 text-[15px] text-muted">
        {workout.sets === 0 ? "Started, no sets logged yet." : `${workout.sets} ${workout.sets === 1 ? "set" : "sets"} logged so far.`}
      </p>
      <Link href={`/workouts/${workout.id}`} className={`${btnPrimary} mt-4 w-full`}>
        Continue workout
      </Link>
    </>
  );
}

/** The next ready-made workout in the rotation. */
function UpNext({ next }: { next: WorkoutTemplate }) {
  return (
    <>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Plate section="train" size={12} /> Up next
      </p>
      <h2 className="mt-1 font-display text-[28px] leading-tight font-bold">{next.name}</h2>
      <p className="mt-1 text-[15px] text-muted">
        {next.exercises.length} exercises, about {next.minutes} minutes
      </p>
      <p className="mt-3 text-[15px]">{next.exercises.map((e) => e.name).join(", ")}</p>
      <div className="mt-4 flex gap-3">
        <Link href={`/workouts/template/${next.id}`} className={`${btnPrimary} flex-1`}>
          See the plan
        </Link>
        <Link href="/workouts" className={btnSecondary}>
          Others
        </Link>
      </div>
    </>
  );
}

/** What to train: continue today's workout, or the next one in the program. */
export default function TrainingCard({ todaysWorkout, next }: { todaysWorkout: { id: number; name: string | null; sets: number } | null; next: WorkoutTemplate }) {
  return (
    <section aria-label="Training" className={`${card} mb-8`} style={{ "--accent": "var(--color-plate-blue)" } as React.CSSProperties}>
      {todaysWorkout ? <ContinueWorkout workout={todaysWorkout} /> : <UpNext next={next} />}
    </section>
  );
}
