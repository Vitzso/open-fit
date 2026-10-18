import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Full JSON backup of your data (protected by the passcode lock, like every API route). */
export async function GET() {
  const [settings, exercises, workouts, bodyWeights, foodEntries, foodProducts, coachMessages] = await Promise.all([
    prisma.settings.findMany(),
    prisma.exercise.findMany({ orderBy: { id: "asc" } }),
    prisma.workout.findMany({ orderBy: { id: "asc" }, include: { sets: { orderBy: { id: "asc" } } } }),
    prisma.bodyWeight.findMany({ orderBy: { day: "asc" } }),
    prisma.foodEntry.findMany({ orderBy: { id: "asc" } }),
    prisma.foodProduct.findMany(),
    prisma.coachMessage.findMany({ orderBy: { id: "asc" } }),
  ]);
  const body = JSON.stringify(
    {
      app: "openfit",
      version: 1,
      exportedAt: new Date().toISOString(),
      units: "weights in kg",
      settings,
      exercises,
      workouts,
      bodyWeights,
      foodEntries,
      foodProducts,
      coachMessages,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="openfit-backup-${dayKey()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
