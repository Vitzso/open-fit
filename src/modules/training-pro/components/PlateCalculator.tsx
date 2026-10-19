"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { BAR, platesFor, warmupsFor } from "../lib/plates";

/** Bumper-plate colours by weight (kg plates; lb plates map to their nearest kg colour). */
const PLATE_COLOR: Record<number, string> = {
  25: "var(--color-plate-red)",
  20: "var(--color-plate-blue)",
  15: "var(--color-plate-yellow)",
  10: "var(--color-plate-green)",
  5: "var(--color-plate-white)",
  45: "var(--color-plate-blue)",
  35: "var(--color-plate-yellow)",
};

/**
 * Plates per side for the weight in the form, and a warm-up ramp you can tap to fill in.
 * Pro training module.
 */
export default function PlateCalculator({
  weight,
  unit,
  onUseWarmup,
}: {
  weight: number;
  unit: string;
  onUseWarmup: (weight: number, reps: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const u = unit === "lb" ? "lb" : "kg";
  const load = platesFor(weight, u);
  const warmups = warmupsFor(weight, u);

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-sm text-muted underline-offset-2 active:text-fg" aria-expanded={open}>
        <Calculator size={15} /> {open ? "Hide plates and warm-up" : "Plates and warm-up"}
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-xl bg-raised p-3 text-sm">
          {!(weight > BAR[u]) ? (
            <p className="text-muted">
              Enter a weight above the {BAR[u]} {u} bar to see the plates.
            </p>
          ) : (
            <>
              <div>
                <p className="mb-1.5 text-muted">
                  Each side of a {BAR[u]} {u} bar:
                </p>
                <div className="flex flex-wrap items-center gap-1.5" aria-label={`Plates per side: ${load.perSide.join(", ")} ${u}`}>
                  {load.perSide.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 font-display font-semibold text-ink"
                      style={{ background: PLATE_COLOR[p] ?? "var(--color-faint)" }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
                {load.short > 0 && (
                  <p className="mt-1.5 text-plate-yellow">
                    Closest with standard plates: {load.loaded} {u} ({load.short} {u} short).
                  </p>
                )}
              </div>
              {warmups.length > 0 && (
                <div>
                  <p className="mb-1 text-muted">Warm-up before {weight} {u} (tap to fill in):</p>
                  <ul className="divide-y divide-line">
                    {warmups.map((w) => (
                      <li key={w.weight}>
                        <button type="button" onClick={() => onUseWarmup(w.weight, w.reps)} className="flex w-full justify-between py-1.5 text-left active:opacity-60">
                          <span className="font-semibold">
                            {w.weight} {u} × {w.reps}
                          </span>
                          <span className="text-faint">use</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
