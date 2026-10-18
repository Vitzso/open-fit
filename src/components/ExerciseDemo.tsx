"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { mediaFor } from "@/lib/exercise-media";

/**
 * Loops an exercise's start and end photos like a short clip. Tap to pause.
 * Starts paused when the device asks for reduced motion.
 */
export default function ExerciseDemo({
  name,
  size = "full",
}: {
  name: string;
  /** "full": wide demo with controls; "thumb": small looping preview. */
  size?: "full" | "thumb";
}) {
  const media = mediaFor(name);
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFrame((f) => 1 - f), 1100);
    return () => clearInterval(t);
  }, [playing, name]);

  if (!media) return null;

  const imgs = (
    <>
      {/* Both frames stay loaded; the second fades in and out over the first. */}
      <img src={media.start} alt="" width={850} height={567} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={media.end}
        alt=""
        width={850}
        height={567}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: frame }}
      />
    </>
  );

  if (size === "thumb") {
    return (
      <div className="relative aspect-[3/2] w-24 shrink-0 overflow-hidden rounded-xl bg-raised" role="img" aria-label={`${name} demonstration`}>
        {imgs}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying((p) => !p)}
      className="relative block aspect-[3/2] w-full overflow-hidden rounded-[var(--radius-card)] bg-raised"
      aria-label={`${name} demonstration. ${playing ? "Tap to pause" : "Tap to play"}`}
    >
      {imgs}
      <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-sm text-white backdrop-blur">
        {playing ? <Pause size={14} /> : <Play size={14} />}
        {playing ? "Tap to pause" : "Tap to play"}
      </span>
    </button>
  );
}
