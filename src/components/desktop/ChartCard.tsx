import { Plate } from "@/components/PageHeader";
import type { Section } from "@/lib/ui";

export interface LegendItem {
  label: string;
  color: string;
  /** "bar" draws a square swatch (columns), "line" a short stroke (lines). */
  mark: "bar" | "line";
}

/**
 * A chart on the dashboard: title, one-line summary, legend (for 2+ series), the chart,
 * and the same numbers as a table for anyone who'd rather read than hover.
 */
export default function ChartCard({
  id,
  section,
  title,
  summary,
  legend,
  table,
  children,
  className = "",
}: {
  id?: string;
  section: Section;
  title: string;
  summary?: React.ReactNode;
  legend?: LegendItem[];
  table?: { columns: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={`scroll-mt-6 rounded-[var(--radius-card)] bg-surface p-5 ${className}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id={id ? `${id}-title` : undefined} className="flex items-center gap-2 font-display text-xl font-semibold">
            <Plate section={section} size={12} /> {title}
          </h2>
          {summary && <p className="mt-0.5 text-sm text-muted">{summary}</p>}
        </div>
        {legend && legend.length > 1 && (
          <ul className="flex flex-wrap items-center gap-4 text-sm text-muted" aria-label="Legend">
            {legend.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={l.mark === "bar" ? "inline-block size-2.5 rounded-[3px]" : "inline-block h-0.5 w-3.5 rounded-full"}
                  style={{ background: l.color }}
                />
                {l.label}
              </li>
            ))}
          </ul>
        )}
      </header>
      {children}
      {table && table.rows.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer select-none text-faint hover:text-muted">Show as table</summary>
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left tabular-nums">
              <thead className="sticky top-0 bg-raised text-muted">
                <tr>
                  {table.columns.map((c, i) => (
                    <th key={c} scope="col" className={`px-3 py-2 font-medium ${i ? "text-right" : ""}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    {r.map((cell, j) => (
                      <td key={j} className={`px-3 py-1.5 ${j ? "text-right" : "text-muted"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
