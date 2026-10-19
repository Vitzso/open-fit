"use server";
// Switching optional modules on and off (Settings → Modules).
import { z } from "zod";
import { prisma } from "@/lib/db";
import { MODULES, parseEnabledModules } from "@/lib/modules/registry";
import { getSettings } from "@/lib/settings";
import { prepareTrainingPro } from "@/modules/training-pro/lib/setup";
import { revalidateAll } from "./revalidate";

const Toggle = z.object({ id: z.string().refine((id) => MODULES.some((m) => m.id === id), "Unknown module."), on: z.boolean() });

/** Switches a module on or off. Switching Pro training on starts downloading its exercise library. */
export async function setModuleEnabled(id: string, on: boolean): Promise<{ ok: boolean; message?: string }> {
  const args = Toggle.parse({ id, on });
  const enabled = parseEnabledModules((await getSettings()).enabledModules);
  if (args.on) enabled.add(args.id);
  else enabled.delete(args.id);
  await prisma.settings.update({ where: { id: 1 }, data: { enabledModules: [...enabled].join(",") } });
  revalidateAll();
  if (args.on && args.id === "training-pro") {
    const r = await prepareTrainingPro();
    if (!r.ok) return { ok: true, message: r.message };
  }
  return { ok: true };
}
