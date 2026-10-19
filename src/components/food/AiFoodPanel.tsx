"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import { dayKey } from "@/lib/dates";
import { scaleItem, type AiFoodItem } from "@/lib/food-ai/schema";
import type { Meal } from "@/lib/nutrition";
import { enqueue } from "@/lib/offline/outbox";
import { btnPrimary, btnSecondary, card, input } from "@/lib/ui";
import { parseDecimal } from "@/lib/units";
import { estimateFood, photoToDataUrl } from "@/services/food-ai.service";

/** An estimated item, plus its original per-gram basis so editing grams rescales cleanly. */
interface Row {
  key: number;
  base: AiFoodItem;
  item: AiFoodItem;
  gramsText: string;
}

const CONFIDENCE: Record<AiFoodItem["confidence"], string> = { high: "sure", medium: "rough guess", low: "unsure, check it" };

/**
 * "Snap or describe your meal": the local AI lists the foods with portions and macros, you
 * adjust, then everything is added in one tap (through the phone's outbox, so it works offline).
 */
export default function AiFoodPanel({ meal, day }: { meal: Meal; day?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPhoto(await photoToDataUrl(file));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function estimate() {
    if (!text.trim() && !photo) return setError("Add a photo or describe what you ate.");
    setBusy(true);
    setError(null);
    const r = await estimateFood({ text: text.trim() || undefined, image: photo ?? undefined });
    setBusy(false);
    if (!r.ok) return setError(r.status === 0 ? "Can't reach your PC, so the AI can't help right now. Type it in below instead." : r.error);
    if (r.data.items.length === 0) return setError("The AI didn't find any food. Try a clearer photo or a few words.");
    setRows(r.data.items.map((item, key) => ({ key, base: item, item, gramsText: String(item.grams) })));
  }

  const setGrams = (key: number, gramsText: string) =>
    setRows((cur) =>
      cur!.map((r) => {
        if (r.key !== key) return r;
        const g = parseDecimal(gramsText);
        return { ...r, gramsText, item: Number.isFinite(g) && g >= 0 ? scaleItem(r.base, g) : r.item };
      }),
    );
  const setName = (key: number, name: string) => setRows((cur) => cur!.map((r) => (r.key === key ? { ...r, item: { ...r.item, name } } : r)));
  const remove = (key: number) => setRows((cur) => cur!.filter((r) => r.key !== key));

  function addAll() {
    if (!rows?.length) return;
    const onDay = day ?? dayKey();
    for (const { item } of rows) {
      if (!item.name.trim()) continue;
      enqueue(
        "food",
        { day: onDay, meal, name: item.name.trim(), grams: item.grams, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat },
        { label: `${item.name.trim()} · ${Math.round(item.calories)} kcal`, day: onDay },
      );
    }
    router.push(day ? `/nutrition?day=${day}` : "/nutrition");
  }

  const total = rows?.reduce((t, r) => t + r.item.calories, 0) ?? 0;

  return (
    <section aria-labelledby="ai-food" className={`${card} mb-6 space-y-3`}>
      <h2 id="ai-food" className="flex items-center gap-2 font-display text-xl font-semibold">
        <Sparkles size={18} className="text-plate-green" /> Snap or describe it
      </h2>

      {!rows && (
        <>
          <p className="text-[15px] text-muted">Your AI coach estimates the foods and portions. You check them before anything is saved.</p>
          {photo && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local data: URL preview */}
              <img src={photo} alt="Your meal" className="max-h-56 w-full rounded-xl object-cover" />
              <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute top-2 right-2 rounded-full bg-ink/80 p-1.5">
                <X size={16} />
              </button>
            </div>
          )}
          <label htmlFor="ai-text" className="sr-only">
            What did you eat?
          </label>
          <textarea
            id="ai-text"
            rows={2}
            className={`${input} h-auto py-2.5`}
            placeholder="e.g. 2 eggs, toast with butter and a latte"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()} disabled={busy}>
              <Camera size={18} /> {photo ? "New photo" : "Photo"}
            </button>
            <button type="button" className={btnPrimary} onClick={() => void estimate()} disabled={busy}>
              {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />} {busy ? "Thinking…" : "Estimate"}
            </button>
          </div>
          {busy && <p className="text-sm text-muted">The first photo can take up to half a minute while the model loads.</p>}
        </>
      )}

      {rows && (
        <>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.key} className="rounded-xl bg-raised p-3">
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Food name"
                    className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none"
                    value={r.item.name}
                    onChange={(e) => setName(r.key, e.target.value)}
                  />
                  <button type="button" onClick={() => remove(r.key)} aria-label={`Remove ${r.item.name}`} className="text-muted">
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      aria-label={`Grams of ${r.item.name}`}
                      className="h-9 w-20 rounded-lg bg-surface px-2 text-[16px]"
                      inputMode="decimal"
                      value={r.gramsText}
                      onChange={(e) => setGrams(r.key, e.target.value)}
                    />
                    g
                  </label>
                  <span className="flex-1 text-muted">
                    <span className="font-semibold text-fg">{Math.round(r.item.calories)} kcal</span> · P {Math.round(r.item.protein)} · C {Math.round(r.item.carbs)} · F{" "}
                    {Math.round(r.item.fat)}
                  </span>
                </div>
                <p className={`mt-1 text-xs ${r.item.confidence === "low" ? "text-plate-yellow" : "text-faint"}`}>
                  {r.item.source === "estimate" ? `AI estimate, ${CONFIDENCE[r.item.confidence]}` : `Nutrition from ${r.item.source}`}
                </p>
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-plate-red">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnSecondary} onClick={() => setRows(null)}>
              Start over
            </button>
            <button type="button" className={btnPrimary} onClick={addAll} disabled={rows.length === 0}>
              <Plus size={18} /> Add {rows.length} to {meal}
            </button>
          </div>
          <p className="text-sm text-muted">Total about {Math.round(total)} kcal.</p>
        </>
      )}
      {!rows && error && <p className="text-sm text-plate-red">{error}</p>}
    </section>
  );
}
