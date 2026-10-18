"use server";
// Settings actions.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getEnergyEstimate } from "@/lib/energy-data";
import { getSettings } from "@/lib/settings";
import { revalidateAll } from "./revalidate";
import { parseSettingsForm } from "./settings-form";

/** Back to Settings with a message in the URL. */
const backToSettings = (query: string) => redirect(`/settings?${query}`);

/** Copies the calorie engine's recommended targets into your daily goals. */
export async function applyCoachTargets() {
  const e = await getEnergyEstimate(await getSettings());
  if (!e.target || !e.protein || !e.carbs || !e.fat) {
    backToSettings("error=" + encodeURIComponent("Add your profile and a weigh-in first."));
    return;
  }
  await prisma.settings.update({
    where: { id: 1 },
    data: { calorieGoal: e.target, proteinGoal: e.protein, carbsGoal: e.carbs, fatGoal: e.fat },
  });
  revalidateAll();
  backToSettings("saved=targets");
}

/** Saves the Settings form. Problems are reported on the page instead of the error screen. */
export async function saveSettings(formData: FormData) {
  const result = parseSettingsForm(formData);
  if (!result.ok) {
    backToSettings(`error=${encodeURIComponent(result.error)}`);
    return;
  }
  await prisma.settings.upsert({ where: { id: 1 }, update: result.row, create: { id: 1, ...result.row } });
  revalidateAll();
  backToSettings("saved=1");
}
