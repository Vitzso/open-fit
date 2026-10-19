/** One row of a tooltip: a short line key in the series colour, the value (strong), then the label. */
export interface TooltipRow {
  color?: string;
  value: string;
  label: string;
}

/**
 * Floating readout for the hovered point or column. Positioned inside the chart's
 * relative container and flipped to the left when it would run off the right edge.
 */
export default function Tooltip({ x, y, width, title, rows }: { x: number; y: number; width: number; title: string; rows: TooltipRow[] }) {
  const flip = x > width - 190;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-40 rounded-xl border border-line bg-ink/95 px-3 py-2 text-sm shadow-xl backdrop-blur"
      style={{ left: flip ? undefined : x + 14, right: flip ? width - x + 14 : undefined, top: Math.max(0, y - 12) }}
    >
      <p className="mb-1 text-xs text-muted">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 whitespace-nowrap">
          {r.color && <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: r.color }} aria-hidden />}
          <span className="font-semibold text-fg tabular-nums">{r.value}</span>
          <span className="text-muted">{r.label}</span>
        </p>
      ))}
    </div>
  );
}
