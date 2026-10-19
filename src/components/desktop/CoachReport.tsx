"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Sparkles } from "lucide-react";
import Markdown from "@/components/Markdown";
import { Plate } from "@/components/PageHeader";
import { btnPrimary, btnSmall } from "@/lib/ui";
import { fetchLatestReport, writeReport } from "@/services/coach-report.service";
import type { CoachReportData } from "@/services/types";

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "ready"; report: CoachReportData }
  | { kind: "error"; message: string; report: CoachReportData | null };

/**
 * The AI coach's progress report for the selected range. Shows the latest saved report
 * straight away; "Write a new report" asks Ollama for a fresh one (it can take a minute).
 */
export default function CoachReport({ range }: { range: number }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchLatestReport().then((r) => {
      if (cancelled) return;
      if (!r.ok) setState({ kind: "error", message: r.error, report: null });
      else setState(r.data.report ? { kind: "ready", report: r.data.report } : { kind: "empty" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function write() {
    setWriting(true);
    const previous = state.kind === "ready" ? state.report : state.kind === "error" ? state.report : null;
    const r = await writeReport(range);
    setWriting(false);
    if (r.ok && r.data.report) setState({ kind: "ready", report: r.data.report });
    else setState({ kind: "error", message: r.ok ? "The coach didn't write anything." : r.error, report: previous });
  }

  const report = state.kind === "ready" ? state.report : state.kind === "error" ? state.report : null;
  const written = report
    ? new Date(report.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section id="coach" aria-labelledby="coach-title" className="scroll-mt-6 rounded-[var(--radius-card)] bg-surface p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="coach-title" className="flex items-center gap-2 font-display text-xl font-semibold">
            <Plate section="coach" size={12} /> Coach&apos;s progress report
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {report ? `Last ${report.rangeDays} days · written ${written}` : "Written by your local AI coach from the numbers on this page."}
          </p>
        </div>
        {report && (
          <button type="button" onClick={() => void write()} disabled={writing} className={`${btnSmall} shrink-0 whitespace-nowrap`}>
            {writing ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {report.rangeDays === range ? "New report" : `New ${range}-day report`}
          </button>
        )}
      </header>

      {writing && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-raised px-4 py-3 text-sm text-muted" role="status">
          <LoaderCircle size={16} className="animate-spin" />
          Your coach is reviewing the last {range} days. This can take a minute.
        </p>
      )}

      {state.kind === "loading" ? (
        <p className="flex items-center gap-2 text-muted">
          <LoaderCircle size={16} className="animate-spin" /> Loading…
        </p>
      ) : report ? (
        <div className={`coach-report border-l-2 border-plate-red pl-4 leading-relaxed ${writing ? "opacity-50" : ""}`}>
          <Markdown text={report.content} />
        </div>
      ) : (
        !writing && (
          <div className="rounded-xl bg-raised p-5 text-center">
            <p className="mb-4 text-muted">No report yet. Ask the coach to review your training, food and weight.</p>
            <button type="button" onClick={() => void write()} className={btnPrimary}>
              <Sparkles size={18} /> Write my report
            </button>
          </div>
        )
      )}

      {state.kind === "error" && (
        <p className="mt-4 text-sm text-plate-red" role="alert">
          {state.message}{" "}
          <Link href="/coach/checkup" className="text-fg underline">
            Check the coach
          </Link>
        </p>
      )}
    </section>
  );
}
