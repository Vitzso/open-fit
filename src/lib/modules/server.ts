// Which optional modules are switched on (server side).
import "server-only";
import { getSettings } from "@/lib/settings";
import { parseEnabledModules } from "./registry";

/** The ids of the modules switched on in Settings. */
export async function getEnabledModules(): Promise<Set<string>> {
  return parseEnabledModules((await getSettings()).enabledModules);
}

/** True when the module is switched on. */
export async function isModuleEnabled(id: string): Promise<boolean> {
  return (await getEnabledModules()).has(id);
}
