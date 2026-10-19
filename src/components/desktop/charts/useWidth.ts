"use client";

import { useEffect, useRef, useState } from "react";

/** A ref and the current pixel width of the element it's attached to (charts redraw to fit). */
export function useWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(120, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
