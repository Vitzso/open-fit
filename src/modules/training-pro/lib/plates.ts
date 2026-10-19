// Plate maths for the barbell: which plates go on each side, and a warm-up ramp. Pure.

export const PLATES = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
} as const;
export const BAR = { kg: 20, lb: 45 } as const;

export interface PlateLoad {
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: number[];
  /** What the bar actually weighs loaded like that (can be a bit under the target). */
  loaded: number;
  /** Target minus loaded: more than 0 when the plates can't make the exact weight. */
  short: number;
}

const r = (n: number) => Math.round(n * 100) / 100;

/** Plates per side to reach `target` on a `bar`, using the heaviest plates first. */
export function platesFor(target: number, unit: "kg" | "lb", bar: number = BAR[unit], plates: readonly number[] = PLATES[unit]): PlateLoad {
  if (!(target > bar)) return { perSide: [], loaded: bar, short: r(Math.max(0, target - bar)) };
  let side = (target - bar) / 2;
  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side = r(side - p);
    }
  }
  const loaded = r(bar + 2 * perSide.reduce((t, p) => t + p, 0));
  return { perSide, loaded, short: r(target - loaded) };
}

export interface WarmupSet {
  weight: number;
  reps: number;
}

/**
 * A warm-up ramp before a working weight: empty bar, then about 40 %, 60 % and 80 %, rounded down
 * to what the plates can make. Light working weights get fewer steps.
 */
export function warmupsFor(work: number, unit: "kg" | "lb", bar: number = BAR[unit]): WarmupSet[] {
  if (!(work > bar)) return [];
  const step = unit === "kg" ? 2.5 : 5;
  const roundDown = (w: number) => Math.max(bar, Math.floor(w / step) * step);
  const out: WarmupSet[] = [{ weight: bar, reps: 10 }];
  for (const [pct, reps] of [
    [0.4, 5],
    [0.6, 3],
    [0.8, 1],
  ] as const) {
    const w = roundDown(work * pct);
    if (w > out[out.length - 1].weight && w < work) out.push({ weight: w, reps });
  }
  return out;
}
