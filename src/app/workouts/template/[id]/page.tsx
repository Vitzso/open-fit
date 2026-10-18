import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { startWorkoutFromTemplate } from "@/actions/workouts";
import ExerciseDemo from "@/components/ExerciseDemo";
import PageHeader from "@/components/PageHeader";
import { MEDIA_CREDIT } from "@/lib/exercise-media";
import { fmtRest, getTemplate, tipFor, TEMPLATES } from "@/lib/programs";
import { btnPrimary } from "@/lib/ui";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ id: t.id }));
}

/** Preview of a ready-made workout before starting it. */
export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTemplate((await params).id);
  if (!t) notFound();
  const totalSets = t.exercises.reduce((n, e) => n + e.sets, 0);

  return (
    <div style={{ "--accent": "var(--color-plate-blue)" } as React.CSSProperties}>
      <PageHeader
        title={t.name}
        section="train"
        back="/workouts"
        backLabel="Train"
        subtitle={`${t.exercises.length} exercises, ${totalSets} sets, about ${t.minutes} minutes`}
      />
      <p className="mb-6 text-[17px] leading-relaxed">{t.summary}</p>

      {/* Exercises are done in this order, so they're numbered. */}
      <ol className="mb-5 space-y-5">
        {t.exercises.map((e, i) => {
          const tip = tipFor(e.name);
          return (
            <li key={e.name} className="flex gap-3.5">
              <span
                aria-hidden
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-plate-blue font-display text-[17px] font-bold text-white"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[22px] leading-tight font-semibold">{e.name}</p>
                <p className="mt-0.5 text-[15px]">
                  {e.sets} sets of {e.reps}
                  <span className="text-muted">, rest {fmtRest(e.restSec)}</span>
                </p>
                {tip && (
                  <p className="mt-1.5 text-[15px] leading-snug text-muted">
                    <span className="text-fg">{tip.muscles}.</span> {tip.tip}
                  </p>
                )}
              </div>
              <ExerciseDemo name={e.name} size="thumb" />
            </li>
          );
        })}
      </ol>
      <p className="mb-28 text-xs text-faint">{MEDIA_CREDIT}</p>

      <form
        action={startWorkoutFromTemplate.bind(null, t.id)}
        className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl bg-gradient-to-t from-ink from-60% to-transparent px-5 pt-6 pb-3"
      >
        <button className={`${btnPrimary} w-full text-[17px]`}>
          <Play size={18} fill="currentColor" /> Start {t.name}
        </button>
      </form>
    </div>
  );
}
