import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { buildCoachContext, coachSystemMessage, NOTE_REQUEST } from "@/lib/coach";
import { chatCompletion, OllamaError, releaseOllama, tryAcquireOllama } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Today's note, if one was written already. */
export async function GET() {
  const note = await prisma.coachNote.findUnique({ where: { day: dayKey() } });
  return NextResponse.json({ note: note ? { content: note.content, createdAt: note.createdAt } : null });
}

/** Write (or rewrite) today's note. */
export async function POST() {
  if (!tryAcquireOllama("note")) {
    return NextResponse.json({ error: "The coach is busy right now. Try again in a moment." }, { status: 429 });
  }
  try {
    const [s, context] = await Promise.all([getSettings(), buildCoachContext()]);
    const content = (
      await chatCompletion([coachSystemMessage(context), { role: "user", content: NOTE_REQUEST }], {
        ...coachOptions(s),
        temperature: 0.5,
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
