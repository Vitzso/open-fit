"use client";

import { useState } from "react";
import Tooltip, { type TooltipRow } from "./Tooltip";
import { CHART, compact, niceTicks } from "./scale";
import { useWidth } from "./useWidth";

export interface ColumnSeries {
  key: string;
  label: string;
  color: string;
}

export interface ColumnDatum {
  key: string;
  /** Tooltip heading, e.g. "Mon, Oct 12" or "Week of Oct 6". */
  title: string;
  /** Short x-axis label, e.g. "Oct 12". */
  tick: string;
  values: Record<string, number>;
}

/**
 * Columns from one baseline, stacked in `series` order (bottom first). Columns are at
 * most 24px wide with a 4px rounded top; stacked segments are separated by a 2px gap.
 * Each column is its own hover/focus target with a tooltip listing every segment.
 */
export default function ColumnChart({
  data,
  series,
  unit,
  label,
  height = 240,
  goal,
  emptyText = "Nothing logged yet.",
}: {
  data: ColumnDatum[];
  series: ColumnSeries[];
  unit: string;
  label: string;
  height?: number;
  goal?: { value: number; label: string } | null;
  emptyText?: string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((t, s) => t + (d.values[s.key] ?? 0), 0));

  if (totals.every((v) => v === 0)) {
    return (
      <div ref={ref} className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        {emptyText}
      </div>
    );
  }

  const H = height;
  const pad = { l: 44, r: 16, t: 14, b: 26 };
  const hi = Math.max(...totals, goal?.value ?? 0) * 1.1;
  const ticks = niceTicks(0, hi, 4).filter((v) => v <= hi);
  const band = (W - pad.l - pad.r) / data.length;
  const colW = Math.max(2, Math.min(24, band * 0.7));
  const y = (v: number) => pad.t + (1 - v / hi) * (H - pad.t - pad.b);
  const base = y(0);
  const cx = (i: number) => pad.l + band * i + band / 2;
  const fmt = (v: number) => `${Math.round(v).toLocaleString("en-US")} ${unit}`;
  // Only label a few ticks along the x axis so they never collide.
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor((W - pad.l - pad.r) / 64))));

  /** A rectangle with a rounded top (4px), square at the bottom. */
  const roundedTop = (x0: number, y0: number, w: number, h: number) => {
    const r = Math.min(4, w / 2, h);
    return `M${x0},${y0 + h} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + w - r} Q${x0 + w},${y0} ${x0 + w},${y0 + r} V${y0 + h} Z`;
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => Math.min(data.length - 1, Math.max(0, (a ?? (step > 0 ? -1 : data.length)) + step)));
    } else if (e.key === "Escape") setActive(null);
  };

  const a = active;
  const rows: TooltipRow[] =
    a == null
      ? []
      : [
          ...(series.length > 1 ? [{ value: fmt(totals[a]), label: "total" }] : []),
          ...[...series].reverse().map((s) => ({ color: s.color, value: fmt(data[a].values[s.key] ?? 0), label: s.label })),
        ];

  return (
    <div ref={ref} className="relative" style={{ height }}>
      <svg
        width={W}
        height={H}
        role="img"
        aria-label={`${label}: ${data.length} columns. Use the arrow keys to read each value.`}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-plate-white/40"
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={CHART.grid} strokeWidth="1" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={CHART.axisText} className="tabular-nums">
              {compact(v)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x0 = cx(i) - colW / 2;
          let acc = 0;
          const segs = series.filter((s) => (d.values[s.key] ?? 0) > 0);
          return (
            <g key={d.key} opacity={a == null || a === i ? 1 : 0.55}>
              {segs.map((s, j) => {
                const v = d.values[s.key];
                const top = y(acc + v);
                const bottom = y(acc);
                acc += v;
                // 2px surface gap above every segment but the top one.
                const h = Math.max(0, bottom - top - (j < segs.length - 1 ? 2 : 0));
                const yTop = j < segs.length - 1 ? top + 2 : top;
                return j === segs.length - 1 ? (
                  <path key={s.key} d={roundedTop(x0, yTop, colW, Math.max(0, bottom - yTop))} fill={s.color} />
                ) : (
                  <rect key={s.key} x={x0} y={yTop} width={colW} height={h} fill={s.color} />
                );
              })}
            </g>
          );
        })}
        {goal && (
          <g pointerEvents="none">
            <line x1={pad.l} x2={W - pad.r} y1={y(goal.value)} y2={y(goal.value)} stroke={CHART.fg} strokeOpacity="0.6" strokeDasharray="5 5" />
            <text x={pad.l + 6} y={y(goal.value) - 6} fontSize="11" fill={CHART.fg} fillOpacity="0.85" stroke={CHART.surface} strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
              {goal.label}
            </text>
          </g>
        )}
        <line x1={pad.l} x2={W - pad.r} y1={base} y2={base} stroke={CHART.grid} />
        {data.map((d, i) =>
          i % every === 0 ? (
            <text key={d.key} x={cx(i)} y={H - 6} textAnchor="middle" fontSize="11" fill={CHART.axisText}>
              {d.tick}
            </text>
          ) : null,
        )}
        {/* Hit targets: the whole band, taller than the column, so small values are easy to hover. */}
        {data.map((d, i) => (
          <rect
            key={d.key}
            x={pad.l + band * i}
            y={pad.t}
            width={band}
            height={Math.max(0, H - pad.t - pad.b)}
            fill="transparent"
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive((cur) => (cur === i ? null : cur))}
          />
        ))}
      </svg>
      {a != null && <Tooltip x={cx(a)} y={y(totals[a])} width={W} title={data[a].title} rows={rows} />}
    </div>
  );
}
