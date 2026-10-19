// The shape of an AI food estimate: a JSON schema for the model (structured output) and the
// zod schema that validates and clamps what comes back. Pure, shared with the client.
import { z } from "zod";

/** One food the model recognised, for the portion it estimated. */
export interface AiFoodItem {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** "high" | "medium" | "low": how sure the model is (low for hidden oil, sauces, unclear portions). */
  confidence: "high" | "medium" | "low";
  /** Where the numbers come from: the model's estimate, your own log, or a scanned product. */
  source: "estimate" | "your log" | "product";
}

/** Sent to Ollama as response_format, so the reply is always parseable JSON. */
export const FOOD_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          grams: { type: "number" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["name", "grams", "calories", "protein", "carbs", "fat", "confidence"],
      },
    },
  },
  required: ["items"],
} as const;

const num = (max: number) => z.coerce.number().finite().transform((n) => Math.min(max, Math.max(0, n)));

/** Validates the model's JSON and clamps every number to what a food entry accepts. */
export const AiReply = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        grams: num(10_000),
        calories: num(20_000),
        protein: num(2_000),
        carbs: num(2_000),
        fat: num(2_000),
        confidence: z.enum(["high", "medium", "low"]).catch("medium"),
      }),
    )
    .max(20),
});

/** Scales an item to a new portion size, keeping its nutrition per gram. */
export function scaleItem(item: AiFoodItem, grams: number): AiFoodItem {
  const f = item.grams > 0 ? grams / item.grams : 0;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    ...item,
    grams,
    calories: Math.round(item.calories * f),
    protein: r1(item.protein * f),
    carbs: r1(item.carbs * f),
    fat: r1(item.fat * f),
  };
}
