// Turns a photo of a meal and/or a sentence ("two eggs and toast with butter") into food entries
// with portions and macros, using the local Ollama model. Numbers from your own log or a scanned
// product win over the model's guess when the food matches.
import "server-only";
import { prisma } from "@/lib/db";
import { chatCompletion, getModelCapabilities, OllamaError, resolveOllamaConfig, type ChatMessage, type ContentPart } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";
import { AiReply, FOOD_JSON_SCHEMA, scaleItem, type AiFoodItem } from "./schema";

const SYSTEM = `You are a nutrition assistant inside a food diary. From the photo and/or the description, list every food or drink the person had, as separate items.
For each item give a short everyday name (no brand unless it is clearly visible or named), the estimated portion in grams (ml for drinks), and the calories, protein, carbs and fat for that portion.
- Use standard nutrition values (like USDA or food labels) and realistic portions. Count cooking oil, butter, sauces and dressings you can see or that are mentioned, as their own items when they matter.
- If the description gives amounts ("2 eggs", "a 200 g steak", "a large latte"), use them.
- Set confidence to "low" when the portion or the food is hard to tell, "high" only when it's clear.
- If there is no food at all, return an empty list.`;

/** "Greek Yogurt" and "greek yoghurt, plain" both become "greek yoghurt"-ish keys for matching. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/yogurt/g, "yoghurt")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Replaces the model's per-gram numbers with ones from your own log (an entry with grams) or a
 * cached product, when the name matches closely. Portions stay the model's (or yours).
 */
async function ground(items: AiFoodItem[]): Promise<AiFoodItem[]> {
  if (items.length === 0) return items;
  const [entries, products] = await Promise.all([
    prisma.foodEntry.findMany({ where: { grams: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.foodProduct.findMany({ where: { nutritionComplete: true }, take: 500 }),
  ]);
  return items.map((item) => {
    const key = norm(item.name);
    const mine = entries.find((e) => norm(e.name) === key);
    if (mine?.grams) {
      const per = { ...item, grams: mine.grams, calories: mine.calories, protein: mine.protein, carbs: mine.carbs, fat: mine.fat };
      return { ...scaleItem(per, item.grams), source: "your log" };
    }
    const product = products.find((p) => norm(p.name) === key);
    if (product) {
      const per = { ...item, grams: 100, calories: product.kcal100g, protein: product.protein100g, carbs: product.carbs100g, fat: product.fat100g };
      return { ...scaleItem(per, item.grams), source: "product" };
    }
    return item;
  });
}

export class FoodAiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Estimates the foods in a photo (data: URL) and/or a description. */
export async function estimateFood(input: { text?: string; image?: string }): Promise<AiFoodItem[]> {
  const text = input.text?.trim() ?? "";
  if (!text && !input.image) throw new FoodAiError("Add a photo or describe what you ate.");

  // "a chicken rice bowl" when that's a food in your log: use your own entry rather than letting
  // the model split it into chicken + rice with generic numbers.
  if (text && !input.image) {
    const wanted = norm(text.replace(/^(an?|one|my|the|some)\s+/i, ""));
    const recent = await prisma.foodEntry.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    const hit = recent.find((e) => norm(e.name) === wanted);
    if (hit) {
      const { name, grams, calories, protein, carbs, fat } = hit;
      return [{ name, grams: grams ?? 0, calories, protein, carbs, fat, confidence: "high", source: "your log" }];
    }
  }

  const s = await getSettings();
  const opts = coachOptions(s);
  if (input.image) {
    const caps = await getModelCapabilities(resolveOllamaConfig(opts));
    if (!caps.includes("vision")) {
      throw new FoodAiError(
        `The coach model (${resolveOllamaConfig(opts).model}) can't see photos. Describe the food in words, or pick a vision model such as gemma4 in Settings.`,
        422,
      );
    }
  }

  const parts: ContentPart[] = [{ type: "text", text: text ? `What I ate: ${text}` : "What's in this photo?" }];
  if (input.image) parts.push({ type: "image_url", image_url: { url: input.image } });
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: parts },
  ];

  const raw = await chatCompletion(messages, {
    ...opts,
    reasoningEffort: "none",
    temperature: 0.2,
    jsonSchema: { name: "food_estimate", schema: FOOD_JSON_SCHEMA as unknown as Record<string, unknown> },
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new OllamaError("The model's answer wasn't valid JSON. Try again.", "BAD_RESPONSE");
  }
  const reply = AiReply.safeParse(parsed);
  if (!reply.success) throw new OllamaError("The model's answer didn't look like a food list. Try again.", "BAD_RESPONSE");
  return ground(reply.data.items.map((i) => ({ ...i, source: "estimate" as const })));
}
