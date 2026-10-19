import { NextResponse } from "next/server";
import { runCoachSelfTest, SELF_TEST_CASES } from "@/lib/coach";
import { acquireOllama, ollamaBusyMessage, releaseOllama } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Runs the coach self-test. Streams one JSON object per line (NDJSON) as each case finishes. */
export async function POST(req: Request) {
  const cfg = coachOptions(await getSettings());
  if (!(await acquireOllama("selftest", { signal: req.signal }))) {
    return NextResponse.json({ error: ollamaBusyMessage() }, { status: 429 });
  }
  const upstream = new AbortController();
  req.signal.addEventListener("abort", () => upstream.abort(), { once: true });

  const enc = new TextEncoder();
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
        } catch {
          open = false;
        }
      };
      send({ type: "start", total: SELF_TEST_CASES.length });
      let passed = 0;
      try {
        for await (const r of runCoachSelfTest(cfg, upstream.signal)) {
          if (r.passed) passed++;
          send({ type: "case", ...r });
        }
        send({ type: "done", passed, total: SELF_TEST_CASES.length });
      } finally {
        releaseOllama("selftest");
        if (open) {
          open = false;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }
    },
    cancel() {
      open = false;
      upstream.abort();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
