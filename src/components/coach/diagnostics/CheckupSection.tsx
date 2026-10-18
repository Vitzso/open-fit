import { LoaderCircle, Stethoscope } from "lucide-react";
import { btnPrimary, card } from "@/lib/ui";
import type { CheckupCheck, CheckupReport } from "@/services/types";
import StatusIcon, { fmtDuration } from "./StatusIcon";

/** One check: icon, label, timing, detail and the suggested fix. */
function CheckRow({ c }: { c: CheckupCheck }) {
  return (
    <li className="flex gap-2.5">
      <StatusIcon status={c.status} />
      <div className="min-w-0 text-sm">
        <p className="font-medium">
          {c.label} {c.ms !== undefined && <span className="text-xs font-normal text-muted">· {fmtDuration(c.ms)}</span>}
        </p>
        <p className="text-muted">{c.detail}</p>
        {c.fix && <p className="mt-0.5 text-amber-200/90">→ {c.fix}</p>}
      </div>
    </li>
  );
}

/** The report card: model, address and pass/warn/fail counts, then each check. */
function Report({ report }: { report: CheckupReport }) {
  const { summary } = report;
  return (
    <div className={`${card} space-y-3`}>
      <p className="text-xs text-muted">
        {report.model} · {report.baseUrl} · {summary.pass} passed
        {summary.warn ? ` · ${summary.warn} warnings` : ""}
        {summary.fail ? ` · ${summary.fail} failed` : ""}
      </p>
      <ul className="space-y-3">
        {report.checks.map((c) => (
          <CheckRow key={c.id} c={c} />
        ))}
      </ul>
    </div>
  );
}

/** "Ollama checkup" section with its Run button. */
export default function CheckupSection({
  report,
  running,
  error,
  disabled,
  onRun,
}: {
  report: CheckupReport | null;
  running: boolean;
  error: string | null;
  disabled: boolean;
  onRun: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Ollama checkup</h2>
          <p className="text-xs text-muted">Health, model, speed, GPU, context size and network exposure.</p>
        </div>
        <button className={`${btnPrimary} shrink-0`} onClick={onRun} disabled={running || disabled}>
          {running ? <LoaderCircle size={16} className="animate-spin" /> : <Stethoscope size={16} />}
          {running ? "Checking…" : "Run checkup"}
        </button>
      </div>
      {running && <p className="text-xs text-muted">The first run may take up to a minute while the model loads.</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {report && <Report report={report} />}
    </section>
  );
}
