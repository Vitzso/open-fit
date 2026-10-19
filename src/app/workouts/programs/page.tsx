import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Play, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { isModuleEnabled } from "@/lib/modules/server";
import { btnPrimary, btnSmall } from "@/lib/ui";
import { startProgram } from "@/modules/training-pro/actions";
import { listUserPrograms } from "@/modules/training-pro/lib/programs";

export const dynamic = "force-dynamic";

/** Your own programs (Pro training module). */
export default async function ProgramsPage() {
  if (!(await isModuleEnabled("training-pro"))) notFound();
  const programs = await listUserPrograms();
  return (
    <div style={{ "--accent": "var(--color-plate-blue)" } as React.CSSProperties}>
      <PageHeader title="Your programs" section="train" back="/workouts" backLabel="Train" subtitle="Workouts you put together yourself." />
      {programs.length === 0 ? (
        <p className="mb-6 text-[15px] text-muted">No programs yet. Build one from the exercise library, with your own sets, reps and rest.</p>
      ) : (
        <ul className="mb-6 divide-y divide-line">
          {programs.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[22px] leading-tight font-semibold">{p.name}</p>
                <p className="truncate text-sm text-muted">
                  {p.exercises.length} exercises, {p.exercises.reduce((n, e) => n + e.sets, 0)} sets: {p.exercises.map((e) => e.name).join(", ")}
                </p>
              </div>
              <Link href={`/workouts/programs/${p.id}`} className={btnSmall} aria-label={`Edit ${p.name}`}>
                <Pencil size={15} />
              </Link>
              <form action={startProgram.bind(null, p.id)}>
                <button className={btnSmall} aria-label={`Start ${p.name}`}>
                  <Play size={15} /> Start
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <Link href="/workouts/programs/new" className={`${btnPrimary} w-full`}>
        <Plus size={18} /> Build a program
      </Link>
    </div>
  );
}
