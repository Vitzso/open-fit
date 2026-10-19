import { notFound } from "next/navigation";
import { Trash } from "lucide-react";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { isModuleEnabled } from "@/lib/modules/server";
import { btnIcon } from "@/lib/ui";
import { deleteProgram } from "@/modules/training-pro/actions";
import ProgramEditor from "@/modules/training-pro/components/ProgramEditor";
import { getUserProgram } from "@/modules/training-pro/lib/programs";

export const dynamic = "force-dynamic";

/** Build a new program (/workouts/programs/new) or edit one of yours. */
export default async function ProgramEditPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isModuleEnabled("training-pro"))) notFound();
  const raw = (await params).id;
  const id = raw === "new" ? null : Number(raw);
  if (id !== null && !Number.isInteger(id)) notFound();
  const [program, recent] = await Promise.all([
    id === null ? null : getUserProgram(id),
    prisma.exercise.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  if (id !== null && !program) notFound();

  return (
    <div style={{ "--accent": "var(--color-plate-blue)" } as React.CSSProperties}>
      <PageHeader
        title={program ? program.name : "New program"}
        section="train"
        back="/workouts/programs"
        backLabel="Your programs"
        action={
          program && (
            <form action={deleteProgram.bind(null, program.id)}>
              <ConfirmSubmit className={btnIcon} label="Delete program" message={`Delete "${program.name}"? Workouts you did with it stay.`}>
                <Trash size={19} />
              </ConfirmSubmit>
            </form>
          )
        }
      />
      <ProgramEditor
        programId={id}
        initial={
          program
            ? { name: program.name, notes: program.notes ?? undefined, exercises: program.exercises.map(({ name, sets, reps, restSec }) => ({ name, sets, reps, restSec })) }
            : null
        }
        recent={recent.map((e) => e.name)}
      />
    </div>
  );
}
