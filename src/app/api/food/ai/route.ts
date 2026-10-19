import { NextResponse } from "next/server";
import { z } from "zod";
import { estimateFood, FoodAiError } from "@/lib/food-ai/estimate";
import { OllamaError, releaseOllama, tryAcquireOllama } from "@/lib/ollama";

export const dynamic = "force-dynamic";

/** A photo as a data: URL (the phone downscales it to ~1024 px first), at most ~6 MB. */
const Body = z.object({
  text: z.string().max(1000).optional(),
  image: z
    .string()
    .max(8_000_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Expected a JPEG, PNG or WebP photo.")
    .optional(),
});

/** Estimates the foods in a photo and/or a description with the local AI model. Nothing is saved here. */
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json." }, { status: 415 });
  }
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  if (!tryAcquireOllama("food-ai")) {
    return NextResponse.json({ error: "The AI is busy right now. Try again in a moment." }, { status: 429 });
  }
  try {
    const items = await estimateFood(body.data);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof FoodAiError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof OllamaError) return NextResponse.json(err.toJSON(), { status: err.httpStatus });
    console.error("food ai failed", err);
    return NextResponse.json({ error: "Couldn't estimate that. Try again." }, { status: 500 });
  } finally {
    releaseOllama("food-ai");
  }
}
