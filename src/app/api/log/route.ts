import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { revalidateFood, revalidateWeight, revalidateWorkout } from "@/actions/revalidate";
import { ClientId, LogRejected, writeFood, writeRelog, writeSet, writeWeight } from "@/lib/log/writes";

export const dynamic = "force-dynamic";

/** One queued write from the phone's outbox (src/lib/offline/outbox.ts). */
const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("food"), clientId: ClientId, payload: z.unknown() }),
  z.object({ kind: z.literal("relog"), clientId: ClientId, payload: z.unknown() }),
  z.object({ kind: z.literal("set"), clientId: ClientId, payload: z.unknown() }),
  z.object({ kind: z.literal("weight"), clientId: ClientId, payload: z.unknown() }),
]);

/**
 * Saves one entry logged on the phone. Safe to call twice with the same clientId (a retry after a
 * dropped reply): the second call returns the entry the first one made.
 * 200 = saved, 400 / 409 = will never succeed (the phone stops retrying), 500 = try again later.
 */
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json." }, { status: 415 });
  }
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request.", permanent: true }, { status: 400 });
  const { kind, clientId, payload } = body.data;

  try {
    switch (kind) {
      case "food":
        await writeFood(payload as never, clientId);
        revalidateFood();
        break;
      case "relog":
        await writeRelog(payload as never, clientId);
        revalidateFood();
        break;
      case "set": {
        const row = await writeSet(payload as never, clientId);
        revalidateWorkout(row.workoutId);
        break;
      }
      case "weight":
        await writeWeight(payload as never);
        revalidateWeight();
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid entry.", permanent: true }, { status: 400 });
    }
    if (err instanceof LogRejected) return NextResponse.json({ error: err.message, permanent: true }, { status: 409 });
    console.error("log write failed", err);
    return NextResponse.json({ error: "Couldn't save on the PC. It will retry." }, { status: 500 });
  }
}
