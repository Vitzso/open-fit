"use client";

import { useEffect, useId, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { input, label } from "@/lib/ui";

interface Result {
  id: string;
  name: string;
  muscles: string[];
  equipment: string | null;
  photos: { start: string; end: string } | null;
}

/**
 * Exercise field with search over the full library (Pro training module): type a few letters,
 * pick from matches with photos and muscles. Your own names still work (just keep typing).
 */
export default function LibraryPicker({
  value,
  onChange,
  recent = [],
  inputLabel = "Exercise",
}: {
  value: string;
  onChange: (name: string) => void;
  /** Exercises you've done before, offered first when the field is empty. */
  recent?: string[];
  inputLabel?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || value.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/modules/training-pro/library?q=${encodeURIComponent(value.trim())}`, { signal: ctrl.signal, cache: "no-store" });
        const body = await res.json();
        if (!res.ok) setError(body.error ?? "Library unavailable.");
        else {
          setError(null);
          setResults(body.results ?? []);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Can't reach your PC; type the name instead.");
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [value, open]);

  const recentMatches = recent.filter((r) => !value.trim() || r.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 5);

  return (
    <div className="relative">
      <label htmlFor={id} className={label}>
        {inputLabel}
      </label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <input
          id={id}
          className={`${input} pl-9`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search 870 exercises or type your own"
          autoComplete="off"
          maxLength={100}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
        />
        {loading && <LoaderCircle size={16} className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-faint" />}
      </div>
      {open && (recentMatches.length > 0 || results.length > 0 || error) && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 z-20 mt-1 max-h-80 overflow-auto rounded-xl border border-line bg-surface shadow-xl">
          {recentMatches.map((r) => (
            <li key={`r-${r}`} role="option" aria-selected={false}>
              <button type="button" className="w-full px-3 py-2 text-left text-[15px] active:bg-raised" onMouseDown={(e) => e.preventDefault()} onClick={() => (onChange(r), setOpen(false))}>
                {r} <span className="text-xs text-faint">· done before</span>
              </button>
            </li>
          ))}
          {results.map((r) => (
            <li key={r.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left active:bg-raised"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (onChange(r.name), setOpen(false))}
              >
                {r.photos ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small cached thumbnail from this PC
                  <img src={r.photos.start} alt="" width={48} height={32} loading="lazy" className="h-8 w-12 shrink-0 rounded object-cover" />
                ) : (
                  <span className="h-8 w-12 shrink-0 rounded bg-raised" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">{r.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {r.muscles.join(", ")}
                    {r.equipment ? ` · ${r.equipment}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {error && <li className="px-3 py-2 text-sm text-muted">{error}</li>}
        </ul>
      )}
    </div>
  );
}
