// Every optional module the app knows about. To add one: create src/modules/<id>/ with a
// manifest.ts (see src/modules/training-pro), add it to this list, and gate its screens with
// isModuleEnabled / the `modules` set. Nothing else in the app needs to know about it.
import { trainingPro } from "@/modules/training-pro/manifest";
import type { ModuleManifest } from "./types";

export const MODULES: ModuleManifest[] = [trainingPro];

export type ModuleId = (typeof MODULES)[number]["id"];

/** Narrows a stored comma list to known module ids. */
export function parseEnabledModules(stored: string | null | undefined): Set<string> {
  const known = new Set(MODULES.map((m) => m.id));
  return new Set((stored ?? "").split(",").map((s) => s.trim()).filter((id) => known.has(id)));
}
