// The writes behind logging food, sets and weigh-ins. Shared by the server actions and by
// POST /api/log, which replays entries queued on the phone while the PC was unreachable.
// Every write with a `clientId` is idempotent: replaying it returns the row it already made.
import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { FoodEntryInput, id, pastDay, SetInput } from "@/actions/schemas";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { findOrCreateExercise } from "@/lib/exercises";
import { MEALS } from "@/lib/nutrition";
import { getSettings } from "@/lib/settings";
import { asUnit, fromDisplay, type WeightUnit } from "@/lib/units";

/** A write that will never succeed (the workout was deleted, the entry is invalid): don't retry it. */
export class LogRejected extends Error {}

/** A phone-made id: letters, digits and hyphens (a UUID). */
export const ClientId = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);

const isUniqueClash = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** Runs `create`; if another request with the same clientId won the race, returns that row instead. */
async function once<T>(clientId: string | undefined, find: () => Promise<T | null>, create: () => Promise<T>): Promise<T> {
  if (clientId) {
    const existing = await find();
    if (existing) return existing;
  }
  try {
    return await create();
  } catch (e) {
    const existing = clientId && isUniqueClash(e) ? await find() : null;
    if (existing) return existing;
    throw e;
  }
}

/** Logs a food entry (scanned, typed in, or estimated by the AI). */
export async function writeFood(input: z.input<typeof FoodEntryInput>, clientId?: string) {
  const data = FoodEntryInput.parse(input);
  return once(
    clientId,
    () => prisma.foodEntry.findUnique({ where: { clientId } }),
    () => prisma.foodEntry.create({ data: { ...data, day: data.day ?? dayKey(), clientId: clientId ?? null } }),
  );
}

export const RelogInput = z.object({ entryId: id, meal: z.enum(MEALS), day: pastDay });

/** Logs a copy of an earlier entry, for one-tap "ate this again". */
export async function writeRelog(input: z.input<typeof RelogInput>, clientId?: string) {
  const args = RelogInput.parse(input);
  const src = await prisma.foodEntry.findUnique({ where: { id: args.entryId } });
  if (!src) throw new LogRejected("That food was deleted from your log.");
  const { id: _omit, createdAt: _c, clientId: _k, ...copy } = src;
  return once(
    clientId,
    () => prisma.foodEntry.findUnique({ where: { clientId } }),
    () => prisma.foodEntry.create({ data: { ...copy, meal: args.meal, day: args.day ?? dayKey(), clientId: clientId ?? null } }),
  );
}

/** A set, with the unit its weight was typed in (so a queued set keeps its meaning if Settings change). */
export const QueuedSetInput = SetInput.extend({
  unit: z.enum(["kg", "lb"]).optional(),
  /** Pro training module: warm-up / work / drop set. */
  kind: z.enum(["warmup", "work", "drop"]).optional(),
});

/** Logs one set. The weight arrives in a display unit and is stored in kg. */
export async function writeSet(input: z.input<typeof QueuedSetInput>, clientId?: string) {
  const data = QueuedSetInput.parse(input);
  const [settings, workout] = await Promise.all([
    getSettings(),
    prisma.workout.findUnique({ where: { id: data.workoutId }, select: { id: true } }),
  ]);
  if (!workout) throw new LogRejected("This workout was deleted.");
  const unit: WeightUnit = data.unit ?? settings.weightUnit;
  const exercise = await findOrCreateExercise(data.exerciseName);
  return once(
    clientId,
    () => prisma.workoutSet.findUnique({ where: { clientId } }),
    () =>
      prisma.workoutSet.create({
        data: {
          workoutId: data.workoutId,
          exerciseId: exercise.id,
          reps: data.reps,
          weightKg: fromDisplay(data.weight, unit),
          rpe: data.rpe ?? null,
          notes: data.notes || null,
          kind: data.kind ?? "work",
          clientId: clientId ?? null,
        },
      }),
  );
}

export const WeighInInput = z.object({
  weight: z.number().finite().gt(0).max(1500),
  unit: z.enum(["kg", "lb"]).optional(),
  day: pastDay,
});

/** Logs a weigh-in. One per day, so it's naturally idempotent: the same day again overwrites it. */
export async function writeWeight(input: z.input<typeof WeighInInput>) {
  const data = WeighInInput.parse(input);
  const unit = data.unit ? asUnit(data.unit) : (await getSettings()).weightUnit;
  const weightKg = fromDisplay(data.weight, unit);
  const day = data.day ?? dayKey();
  return prisma.bodyWeight.upsert({ where: { day }, update: { weightKg }, create: { day, weightKg } });
}
