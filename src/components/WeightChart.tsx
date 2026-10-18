import { parseDayKey } from "@/lib/dates";

export interface WeightPoint {
  day: string; // YYYY-MM-DD
  value: number; // already in display unit
}

/**
 * Dependency-free SVG line chart: raw weigh-ins (dots), 7-entry moving
 * average (bold line) and an optional dashed goal line. X axis is real time,
 * so gaps between weigh-ins are shown honestly.
 */
export default function WeightChart({
  points,
  goal,
  unit,
  height = 180,
  compact = false,
}: {
  points: WeightPoint[];
  goal?: number | null;
  unit: string;
  height?: number;
  compact?: boolean;
}) {
  if (points.length < 2) {
    if (compact) return <div style={{ height }} aria-hidden />;
    return (
      <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        Log two or more weigh-ins to see your trend.
      </div>
    );
  }

  const W = 340;
  const H = height;
  const pad = compact ? { l: 4, r: 4, t: 8, b: 8 } : { l: 36, r: 8, t: 12, b: 22 };
  const t = points.map((p) => parseDayKey(p.day).getTime());
  const vals = points.map((p) => p.value);
  const all = goal != null ? [...vals, goal] : vals;
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = Math.max(hi - lo, 1);
  lo -= span * 0.1;
  hi += span * 0.1;
  const t0 = t[0];
  const t1 = t.at(-1)!;

  const x = (ti: number) => pad.l + ((ti - t0) / Math.max(t1 - t0, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);

  const avg = vals.map((_, i) => {
    const win = vals.slice(Math.max(0, i - 6), i + 1);
    return win.reduce((a, b) => a + b, 0) / win.length;
  });
  const line = (ys: number[]) => ys.map((v, i) => `${i ? "L" : "M"}${x(t[i]).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line(avg)} L${x(t1)},${H - pad.b} L${x(t0)},${H - pad.b} Z`;
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const fmt = (d: string) => parseDayKey(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Body weight trend">
      <defs>
        <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f2c335" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f2c335" stopOpacity="0" />
        </linearGradient>
      </defs>
      {!compact &&
        ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#323a45" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#a1aab6">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
      {goal != null && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="#eef1f5" strokeDasharray="4 4" strokeOpacity="0.7" />
          {!compact && (
            <text x={W - pad.r} y={y(goal) - 4} textAnchor="end" fontSize="10" fill="#eef1f5">
              goal {goal.toFixed(1)} {unit}
            </text>
          )}
        </g>
      )}
      <path d={area} fill="url(#wfill)" />
      <path d={line(avg)} fill="none" stroke="#f2c335" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={p.day} cx={x(t[i])} cy={y(p.value)} r={compact ? 1.8 : 2.6} fill="#eef1f5" />
      ))}
      {!compact && (
        <>
          <text x={pad.l} y={H - 6} fontSize="10" fill="#a1aab6">
            {fmt(points[0].day)}
          </text>
          <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize="10" fill="#a1aab6">
            {fmt(points.at(-1)!.day)}
          </text>
        </>
      )}
    </svg>
  );
}
