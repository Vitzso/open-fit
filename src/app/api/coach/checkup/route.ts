import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCoachContext, buildCoachMessages } from "@/lib/coach";
import { acquireOllama, ollamaBusyMessage, releaseOllama, runOllamaCheckup } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Full Ollama checkup (health, model, speed, GPU, context fit, exposure). */
export async function GET(req: Request) {
  if (!(await acquireOllama("checkup", { signal: req.signal }))) {
    return NextResponse.json({ error: ollamaBusyMessage() }, { status: 429 });
  }
  try {
    const [s, context, recent] = await Promise.all([
      getSettings(),
      buildCoachContext(),
      prisma.coachMessage.findMany({ orderBy: { id: "desc" }, take: 10 }),
    ]);
    // Size of a real coach request right now, to check it fits the context window.
    const promptChars = buildCoachMessages(context, recent.reverse(), "x".repeat(200)).reduce((n, m) => n + m.content.length, 0);
    const report = await runOllamaCheckup(
      coachOptions(s),
      promptChars,
    );
    return NextResponse.json(report);
  } finally {
    releaseOllama("checkup");
  }
}
