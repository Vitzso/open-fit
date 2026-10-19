// Small helpers shared by the dashboard charts: tick values, number and date formats.
import { parseDayKey } from "@/lib/dates";

/** Chart chrome colours (the app's slate surfaces); data colours come from each chart's props. */
export const CHART = {
  grid: "#2b313a",
  axisText: "#8b94a1",
  surface: "#1d2128",
  fg: "#eef1f5",
} as const;

/** Data colours that pass the colour-blindness checks on the dark surface (see DashboardLegend). */
export const MACRO_COLOR = { protein: "#e5484d", fat: "#4a86f7", carbs: "#bb8c14" } as const;

/** About `count` round tick values covering lo..hi. */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** 950 → "950", 1840 → "1.8K", 12900 → "12.9K". */
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(+n.toFixed(1));
}

/** "Oct 12" */
export const shortDate = (day: string) => parseDayKey(day).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** "Mon, Oct 12" */
export const longDate = (day: string) =>
  parseDayKey(day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** Milliseconds since epoch for a day key (local midnight). */
export const dayTime = (day: string) => parseDayKey(day).getTime();
