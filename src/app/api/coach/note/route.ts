import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { buildCoachContext, coachSystemMessage, NOTE_REQUEST } from "@/lib/coach";
import { acquireOllama, chatCompletion, OllamaError, ollamaBusyMessage, releaseOllama } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Today's note, if one was written already. */
export async function GET() {
  const note = await prisma.coachNote.findUnique({ where: { day: dayKey() } });
  return NextResponse.json({ note: note ? { content: note.content, createdAt: note.createdAt } : null });
}

/** Write (or rewrite) today's note. */
export async function POST(req: Request) {
  if (!(await acquireOllama("note", { signal: req.signal }))) {
    return NextResponse.json({ error: ollamaBusyMessage() }, { status: 429 });
  }
  try {
    const [s, context] = await Promise.all([getSettings(), buildCoachContext()]);
    const content = (
      await chatCompletion([coachSystemMessage(context), { role: "user", content: NOTE_REQUEST }], {
        ...coachOptions(s),
        temperature: 0.5,
        signal: req.signal, // you left the page: stop writing, so Ollama is free for what you do next
      })
    ).trim();
    if (!content) return NextResponse.json({ error: "The coach didn't write anything. Try again." }, { status: 502 });
    const day = dayKey();
    const note = await prisma.coachNote.upsert({ where: { day }, update: { content, createdAt: new Date() }, create: { day, content } });
    return NextResponse.json({ note: { content: note.content, createdAt: note.createdAt } });
  } catch (err) {
    if (err instanceof OllamaError) return NextResponse.json(err.toJSON(), { status: err.httpStatus });
    console.error("coach note failed", err);
    return NextResponse.json({ error: "Couldn't write today's note." }, { status: 500 });
  } finally {
    releaseOllama("note");
  }
}
