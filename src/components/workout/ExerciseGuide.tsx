"use client";

import { useEffect, useState } from "react";
import ExerciseDemo from "@/components/ExerciseDemo";
import { mediaFor } from "@/lib/exercise-media";
import { tipFor } from "@/lib/programs";
import { readStored, writeStored } from "@/lib/storage";
import type { LastSet } from "@/lib/workout-plan";

const DEMO_KEY = "openfit:showDemo";

/** Show/hide preference for the demo photos, remembered on this device. */
function useDemoPreference(): [boolean, () => void] {
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (readStored(DEMO_KEY) === "0") setShow(false);
  }, []);
  const toggle = () =>
    setShow((v) => {
      writeStored(DEMO_KEY, v ? "0" : "1");
      return !v;
    });
  return [show, toggle];
}

/** How to do the exercise: demo photos (hideable), coaching tip, and what you did last time. */
export default function ExerciseGuide({
  exercise,
  prev,
  media,
}: {
  exercise: string;
  prev?: LastSet;
  /** Extra photos (Pro training library) for exercises without bundled ones. */
  media?: { start: string; end: string } | null;
}) {
  const [showDemo, toggleDemo] = useDemoPreference();
  const tip = tipFor(exercise);
  return (
    <>
      {(mediaFor(exercise) || media) && (
        <div>
          {showDemo && <ExerciseDemo name={exercise} media={media} />}
          <button type="button" onClick={toggleDemo} className="mt-1.5 text-sm text-muted underline-offset-2 active:text-fg">
            {showDemo ? "Hide demo" : "Show how it's done"}
          </button>
        </div>
      )}
      {tip && (
        <p className="text-[15px] leading-snug text-muted">
          <span className="text-fg">{tip.muscles}.</span> {tip.tip}
        </p>
      )}
      {prev && <p className="text-sm text-muted">Last time: {prev.label}</p>}
    </>
  );
}
