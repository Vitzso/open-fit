import { NextResponse } from "next/server";
import { OllamaError, pullModel, releaseOllama, tryAcquireOllama } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Downloads the coach's model. Streams one JSON progress object per line (NDJSON). */
export async function POST(req: Request) {
  if (!tryAcquireOllama("model-pull")) {
    return NextResponse.json({ error: "The coach is busy right now. Try again in a moment." }, { status: 429 });
  }
  const s = await getSettings();
  const progress = pullModel(coachOptions(s), req.signal);
  const encoder = new TextEncoder();
  const send = (c: ReadableStreamDefaultController<Uint8Array>, obj: unknown) => c.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const p of progress) send(controller, { type: "progress", ...p });
        send(controller, { type: "done" });
      } catch (err) {
        send(controller, { type: "error", error: err instanceof OllamaError ? err.message : "The download failed." });
      } finally {
        releaseOllama("model-pull");
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
