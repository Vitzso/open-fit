"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, X } from "lucide-react";
import { btnSmall } from "@/lib/ui";

/** Ticks every 250 ms and returns whole seconds left until `end`. */
function useSecondsLeft(end: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.ceil((end - now) / 1000));
}

/** Counts down after each set; buzzes (where supported) when rest is over, then hides itself. */
export default function RestTimer({ end, onAdjust, onDone }: { end: number; onAdjust: (deltaSec: number) => void; onDone: () => void }) {
  const left = useSecondsLeft(end);
  const finished = left === 0;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!finished) return;
    navigator.vibrate?.([200, 100, 200]);
    const t = setTimeout(() => onDoneRef.current(), 4000);
    return () => clearTimeout(t);
  }, [finished]);

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div
      className={`sticky top-[max(env(safe-area-inset-top),0.5rem)] z-20 flex items-center gap-2 rounded-full py-2 pr-2 pl-4 shadow-lg shadow-black/30 ${
        finished ? "bg-plate-blue text-white" : "bg-raised"
      }`}
      role="timer"
      aria-live="polite"
    >
      <Timer size={19} />
      <span className="flex-1 font-display text-xl font-semibold">{finished ? "Rest over, next set" : `Rest ${clock}`}</span>
      {!finished && (
        <>
          <button type="button" className={btnSmall} onClick={() => onAdjust(-15)}>
            −15 s
          </button>
          <button type="button" className={btnSmall} onClick={() => onAdjust(30)}>
            +30 s
          </button>
        </>
      )}
      <button type="button" className="grid h-9 w-9 place-items-center rounded-full active:bg-black/20" onClick={onDone} aria-label="Dismiss rest timer">
        <X size={18} />
      </button>
    </div>
  );
}
