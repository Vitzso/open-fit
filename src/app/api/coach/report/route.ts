import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { asRange, formatPeriodSummary, getDashboardData } from "@/lib/dashboard";
import { buildCoachContext, coachSystemMessage, reportRequest } from "@/lib/coach";
import { chatCompletion, OllamaError, releaseOllama, tryAcquireOllama } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const toJson = (r: { id: number; rangeDays: number; content: string; createdAt: Date }) => ({
  id: r.id,
  rangeDays: r.rangeDays,
  content: r.content,
  createdAt: r.createdAt,
});

/** The latest progress report, if one was written. */
export async function GET() {
  const report = await prisma.coachReport.findFirst({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ report: report ? toJson(report) : null });
}

/** Writes a new progress report for `?range=` days (7, 30, 90, 180 or 365). */
export async function POST(req: NextRequest) {
  const range = asRange(req.nextUrl.searchParams.get("range"));
  if (!tryAcquireOllama("report")) {
    return NextResponse.json({ error: "The coach is busy right now. Try again in a moment." }, { status: 429 });
  }
  try {
    const [s, context, data] = await Promise.all([getSettings(), buildCoachContext(), getDashboardData(range)]);
    const text = `${formatPeriodSummary(data)}\n\n${context.text}`;
    const content = (
      await chatCompletion([coachSystemMessage({ ...context, text }), { role: "user", content: reportRequest(range) }], {
        ...coachOptions(s),
        temperature: 0.4,
      })
    ).trim();
    if (!content) return NextResponse.json({ error: "The coach didn't write anything. Try again." }, { status: 502 });
    const report = await prisma.coachReport.create({ data: { rangeDays: range, content } });
    return NextResponse.json({ report: toJson(report) });
  } catch (err) {
    if (err instanceof OllamaError) return NextResponse.json(err.toJSON(), { status: err.httpStatus });
    console.error("coach report failed", err);
    return NextResponse.json({ error: "Couldn't write the progress report." }, { status: 500 });
  } finally {
    releaseOllama("report");
  }
}
