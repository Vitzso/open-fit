import { FlaskConical, LoaderCircle } from "lucide-react";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";
import type { SelfTestCase } from "@/services/types";
import StatusIcon, { fmtDuration } from "./StatusIcon";

/** One graded case; expands to show the question, each rule and the full reply. */
function CaseRow({ c }: { c: SelfTestCase }) {
  return (
    <li>
      <details className={`${card} py-3`}>
        <summary className="flex cursor-pointer list-none items-center gap-2.5 text-sm">
          <StatusIcon status={c.passed ? "pass" : "fail"} />
          <span className="flex-1 font-medium">{c.title}</span>
          <span className="text-xs text-muted">{fmtDuration(c.ms)}</span>
        </summary>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-muted">{c.why}</p>
          <p>
            <span className="text-muted">Asked: </span>
            {c.question}
          </p>
          {c.error ? (
            <p className="text-red-400">{c.error}</p>
          ) : (
            <>
              <ul className="space-y-0.5">
                {c.checks.map((k) => (
                  <li key={k.name} className={k.pass ? "text-muted" : "text-red-300"}>
                    {k.pass ? "✓" : "✗"} {k.name}
                  </li>
                ))}
              </ul>
              <pre className="max-h-64 overflow-auto rounded-lg bg-ink p-3 text-xs whitespace-pre-wrap text-fg">{c.reply}</pre>
            </>
          )}
        </div>
      </details>
    </li>
  );
}

/** "Coach self-test" section: start/stop, progress, and the graded cases. */
export default function SelfTestSection({
  cases,
  total,
  passed,
  running,
  error,
  disabled,
  onRun,
  onStop,
}: {
  cases: SelfTestCase[];
  total: number;
  passed: number;
  running: boolean;
  error: string | null;
  disabled: boolean;
  onRun: () => void;
  onStop: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Coach self-test</h2>
          <p className="text-xs text-muted">Asks the coach {total || 10} basic questions about sample data (not your log) and checks the answers.</p>
        </div>
        {running ? (
          <button className={`${btnSecondary} shrink-0`} onClick={onStop}>
            Stop
          </button>
        ) : (
          <button className={`${btnPrimary} shrink-0`} onClick={onRun} disabled={disabled}>
            <FlaskConical size={16} /> Test the coach
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {(running || cases.length > 0) && (
        <p className="text-sm text-muted">
          {running && <LoaderCircle size={14} className="mr-1 inline animate-spin" />}
          {passed}/{cases.length} passed{running ? ` · running ${cases.length + 1} of ${total}…` : ` of ${total}`}
        </p>
      )}
      <ul className="space-y-2">
        {cases.map((c) => (
          <CaseRow key={c.id} c={c} />
        ))}
      </ul>
    </section>
  );
}
