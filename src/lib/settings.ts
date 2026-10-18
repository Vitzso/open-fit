import { prisma } from "./db";
import { asUnit } from "./units";

/** Returns the single settings row, creating it with defaults on first run. */
export async function getSettings() {
  const s = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return { ...s, weightUnit: asUnit(s.weightUnit) };
}

export type AppSettings = Awaited<ReturnType<typeof getSettings>>;
