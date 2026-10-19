"use client";

import { useState } from "react";
import Tooltip from "./Tooltip";
import { CHART, compact, dayTime, longDate, niceTicks, shortDate } from "./scale";
import { useWidth } from "./useWidth";

export interface LinePoint {
  day: string; // YYYY-MM-DD
  value: number;
}

/**
 * One series over real time: a 2px line (optionally the 7-point moving average, with
 * the raw values as dots), an optional goal line and a crosshair tooltip that snaps
 * to the nearest point. Arrow keys move the crosshair when the chart has focus.
 */
export default function LineChart({
  points,
  color,
  unit,
  label,
  height = 240,
  goal,
  smooth = false,
  domain,
  compact: small = false,
  emptyText = "Not enough data yet.",
}: {
  points: LinePoint[];
  color: string;
  /** Unit shown after values in the tooltip ("kg", "kcal", "reps"). */
  unit: string;
  /** What the values are, for the tooltip and screen readers ("Body weight"). */
  label: string;
  height?: number;
  goal?: { value: number; label: string } | null;
  /** Draw a 7-point moving average as the line and the raw values as dots. */
  smooth?: boolean;
  /** X range to show (defaults to the first..last point), so gaps in logging stay visible. */
  domain?: [string, string];
  compact?: boolean;
  emptyText?: string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div ref={ref} className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        {emptyText}
      </div>
    );
  }

  const H = height;
  const pad = small ? { l: 34, r: 10, t: 10, b: 20 } : { l: 44, r: 16, t: 14, b: 26 };
  const t = points.map((p) => dayTime(p.day));
  const t0 = domain ? dayTime(domain[0]) : t[0];
  const t1 = domain ? dayTime(domain[1]) : t.at(-1)!;
  const vals = points.map((p) => p.value);
  const avg = smooth
    ? vals.map((_, i) => {
        const win = vals.slice(Math.max(0, i - 6), i + 1);
        return win.reduce((a, b) => a + b, 0) / win.length;
      })
    : vals;
  const all = goal ? [...vals, goal.value] : vals;
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  // A flat or nearly flat series gets a sensible spread around it instead of a magnified one.
  const minSpan = Math.max(Math.abs(hi) * 0.03, 2);
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.12;
  const ticks = niceTicks(lo, hi, small ? 3 : 4).filter((v) => v >= lo && v <= hi);

  const x = (ti: number) => pad.l + ((ti - t0) / Math.max(t1 - t0, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const path = avg.map((v, i) => `${i ? "L" : "M"}${x(t[i]).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${path} L${x(t.at(-1)!).toFixed(1)},${H - pad.b} L${x(t[0]).toFixed(1)},${H - pad.b} Z`;
  const fmt = (v: number) => `${+v.toFixed(1)} ${unit}`;

  // Nearest point to the pointer's x position.
  const nearest = (px: number) => {
    let best = 0;
    for (let i = 1; i < t.length; i++) if (Math.abs(x(t[i]) - px) < Math.abs(x(t[best]) - px)) best = i;
    return best;
  };
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    setActive(nearest(e.clientX - box.left));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => Math.min(points.length - 1, Math.max(0, (a ?? (step > 0 ? -1 : points.length)) + step)));
    } else if (e.key === "Escape") setActive(null);
  };

  const a = active;
  const gradient = `fill-${label.replace(/\W/g, "")}`;

  return (
    <div ref={ref} className="relative" style={{ height }}>
      <svg
        width={W}
        height={H}
        role="img"
        aria-label={`${label}: ${points.length} values from ${shortDate(points[0].day)} to ${shortDate(points.at(-1)!.day)}. Use the arrow keys to read each value.`}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-plate-white/40 rounded-lg"
      >
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.14" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={CHART.grid} strokeWidth="1" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={CHART.axisText} className="tabular-nums">
              {compact(v)}
            </text>
          </g>
        ))}
        {goal && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(goal.value)} y2={y(goal.value)} stroke={CHART.fg} strokeOpacity="0.55" strokeDasharray="5 5" />
            <text x={pad.l + 6} y={y(goal.value) - 6} fontSize="11" fill={CHART.fg} fillOpacity="0.8" stroke={CHART.surface} strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
              {goal.label}
            </text>
          </g>
        )}
        <path d={area} fill={`url(#${gradient})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {smooth &&
          points.map((p, i) => (
            <circle key={p.day} cx={x(t[i])} cy={y(p.value)} r={2.5} fill={CHART.fg} fillOpacity="0.75" />
          ))}
        {/* End marker with its value: the one direct label. */}
        <circle cx={x(t.at(-1)!)} cy={y(avg.at(-1)!)} r={4} fill={color} stroke={CHART.surface} strokeWidth="2" />
        <text x={pad.l} y={H - 6} fontSize="11" fill={CHART.axisText}>
          {shortDate(domain?.[0] ?? points[0].day)}
        </text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize="11" fill={CHART.axisText}>
          {shortDate(domain?.[1] ?? points.at(-1)!.day)}
        </text>
        {a != null && (
          <g pointerEvents="none">
            <line x1={x(t[a])} x2={x(t[a])} y1={pad.t} y2={H - pad.b} stroke={CHART.fg} strokeOpacity="0.35" />
            <circle cx={x(t[a])} cy={y(avg[a])} r={5} fill={color} stroke={CHART.surface} strokeWidth="2" />
          </g>
        )}
        <rect
          x={pad.l}
          y={pad.t}
          width={Math.max(0, W - pad.l - pad.r)}
          height={Math.max(0, H - pad.t - pad.b)}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
        />
      </svg>
      {a != null && (
        <Tooltip
          x={x(t[a])}
          y={y(avg[a])}
          width={W}
          title={longDate(points[a].day)}
          rows={
            smooth
              ? [
                  { color, value: fmt(avg[a]), label: "7-entry average" },
                  { value: fmt(points[a].value), label },
                ]
              : [{ color, value: fmt(points[a].value), label }]
          }
        />
      )}
    </div>
  );
}
