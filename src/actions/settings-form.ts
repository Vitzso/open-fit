// Reads and validates the Settings form, and maps it to the database row.
import { z } from "zod";
import { isValidModelName, validateOllamaUrl } from "@/lib/ollama";
import { asUnit, fromDisplay } from "@/lib/units";
import { optChoice, optDecimal } from "./schemas";

const SettingsForm = z.object({
  weightUnit: z.enum(["kg", "lb"]),
  calorieGoal: z.coerce.number().int().min(800).max(10000),
  proteinGoal: z.coerce.number().int().min(0).max(1000),
  carbsGoal: z.coerce.number().int().min(0).max(2000),
  fatGoal: z.coerce.number().int().min(0).max(1000),
  goalWeight: optDecimal(1500),
  // The unit the goal weight field was *displayed* in. Without this,
  // switching kg→lb in the same save turned "80 kg" into "80 lb".
  goalWeightUnit: z.enum(["kg", "lb"]).optional(),
  sex: optChoice(["male", "female"]),
  birthYear: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1920, "Check the birth year").max(new Date().getFullYear() - 13, "Check the birth year").optional(),
  ),
  heightCm: optDecimal(250).refine((h) => h === undefined || h >= 100, "Height should be in centimetres, e.g. 178"),
  activityLevel: optChoice(["sedentary", "light", "moderate", "very"]),
  weeklyLossPct: z.coerce.number().min(0).max(1),
  ollamaBaseUrl: z
    .string()
    .trim()
    .max(300)
    .refine((u) => u === "" || validateOllamaUrl(u) !== null, "Ollama URL must look like http://127.0.0.1:11434 (or http://<other-pc-ip>:11434)"),
  ollamaModel: z
    .string()
    .trim()
    .max(100)
    .refine((m) => m === "" || isValidModelName(m), "Invalid model name"),
  ollamaReasoning: optChoice(["none", "low", "medium", "high"]),
});

type SettingsFormData = z.output<typeof SettingsForm>;

/** Picks the form fields, filling in defaults for optional ones the browser didn't send. */
function readFields(formData: FormData) {
  const f = (k: string) => formData.get(k) ?? undefined;
  return {
    weightUnit: f("weightUnit"),
    calorieGoal: f("calorieGoal"),
    proteinGoal: f("proteinGoal"),
    carbsGoal: f("carbsGoal"),
    fatGoal: f("fatGoal"),
    goalWeight: f("goalWeight"),
    goalWeightUnit: f("goalWeightUnit"),
    sex: f("sex") ?? "",
    birthYear: f("birthYear"),
    heightCm: f("heightCm"),
    activityLevel: f("activityLevel") ?? "",
    weeklyLossPct: f("weeklyLossPct") ?? 0.6,
    ollamaBaseUrl: f("ollamaBaseUrl") ?? "",
    ollamaModel: f("ollamaModel") ?? "",
    ollamaReasoning: f("ollamaReasoning") ?? "",
  };
}

/** One readable message for the first problem, shown on the Settings page. */
function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = String(issue?.path[0] ?? "value");
  return issue?.code === "custom" ? issue.message : `Check "${field}": ${issue?.message ?? "invalid"}`;
}

/** Converts validated form values to the Settings row (kg, nulls for blanks). */
function toSettingsRow({ goalWeight, goalWeightUnit, ...rest }: SettingsFormData) {
  return {
    ...rest,
    sex: rest.sex ?? null,
    birthYear: rest.birthYear ?? null,
    heightCm: rest.heightCm ?? null,
    activityLevel: rest.activityLevel ?? null,
    goalWeightKg: goalWeight ? fromDisplay(goalWeight, asUnit(goalWeightUnit ?? rest.weightUnit)) : null,
    ollamaBaseUrl: rest.ollamaBaseUrl ? validateOllamaUrl(rest.ollamaBaseUrl) : null,
    ollamaModel: rest.ollamaModel || null,
    ollamaReasoning: rest.ollamaReasoning ?? null,
  };
}

/** Validates the submitted form: the row to save, or an error message to show. */
export function parseSettingsForm(formData: FormData): { ok: true; row: ReturnType<typeof toSettingsRow> } | { ok: false; error: string } {
  const parsed = SettingsForm.safeParse(readFields(formData));
  return parsed.success ? { ok: true, row: toSettingsRow(parsed.data) } : { ok: false, error: firstIssueMessage(parsed.error) };
}
