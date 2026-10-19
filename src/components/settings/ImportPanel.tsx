"use client";

import { useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { btnPrimary, btnSecondary, card, input, label } from "@/lib/ui";
import { requestJson } from "@/services/http";

interface Summary {
  foods: { new: number; duplicate: number };
  workouts: { new: number; duplicate: number; sets: number };
  weights: { new: number; duplicate: number };
  from: string | null;
  to: string | null;
  skipped: string[];
}
interface Reply {
  source: string;
  sourceLabel: string;
  committed: boolean;
  summary: Summary;
}

const n = (x: number) => x.toLocaleString("en-US");

/** Import from MyFitnessPal, Strong, Hevy or an OpenFit backup: pick a file, see what's new, confirm. */
export default function ImportPanel({ defaultUnit }: { defaultUnit: "kg" | "lb" }) {
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [unit, setUnit] = useState(defaultUnit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Reply | null>(null);
  const [done, setDone] = useState<Reply | null>(null);

  async function send(commit: boolean, body = text) {
    if (!body) return;
    setBusy(true);
    setError(null);
    const r = await requestJson<Reply>("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: body, unit, commit }),
    });
    setBusy(false);
    if (!r.ok) return setError(r.status === 0 ? "Can't reach your PC." : r.error);
    if (commit) {
      setDone(r.data);
      setPreview(null);
    } else setPreview(r.data);
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setDone(null);
    setPreview(null);
    setFileName(file.name);
    const t = await file.text();
    setText(t);
    await send(false, t);
  }

  const s = (preview ?? done)?.summary;
  return (
    <div className="space-y-4">
      <div className={`${card} space-y-3`}>
        <p className="text-[15px] text-muted">
          Bring your history over. Supported: <b className="text-fg">MyFitnessPal</b> (Nutrition export, one entry per meal),{" "}
          <b className="text-fg">Strong</b> and <b className="text-fg">Hevy</b> (workout CSV exports), and <b className="text-fg">OpenFit backups</b>. Anything
          already in your log is skipped, so importing twice is safe.
        </p>
        <div>
          <label htmlFor="import-unit" className={label}>
            Weights in the file are in
          </label>
          <select id="import-unit" className={input} value={unit} onChange={(e) => setUnit(e.target.value as "kg" | "lb")}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
          <p className="mt-1 text-sm text-faint">Only matters for Strong; the other files say which unit they use.</p>
        </div>
        <label className={`${btnSecondary} w-full cursor-pointer`}>
          <FileUp size={18} /> {fileName ? "Choose another file" : "Choose a file"}
          <input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle size={16} className="animate-spin" /> Reading {fileName}…
          </p>
        )}
        {error && <p className="text-[15px] text-plate-red">{error}</p>}
      </div>

      {s && (
        <div className={`${card} space-y-2`} role="status">
          <p className="font-semibold">
            {done ? "Imported from" : "Ready to import from"} {(preview ?? done)!.sourceLabel}
            {s.from && s.to ? `: ${s.from} to ${s.to}` : ""}
          </p>
          <ul className="space-y-1 text-[15px]">
            <li>
              {n(s.workouts.new)} workouts ({n(s.workouts.sets)} sets){s.workouts.duplicate ? `, ${n(s.workouts.duplicate)} already in your log` : ""}
            </li>
            <li>
              {n(s.foods.new)} food entries{s.foods.duplicate ? `, ${n(s.foods.duplicate)} already in your log` : ""}
            </li>
            <li>
              {n(s.weights.new)} weigh-ins{s.weights.duplicate ? `, ${n(s.weights.duplicate)} days you already have` : ""}
            </li>
          </ul>
          {s.skipped.length > 0 && (
            <details className="text-sm text-muted">
              <summary>{s.skipped.length} rows skipped</summary>
              <ul className="mt-1">
                {s.skipped.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </details>
          )}
          {preview && (
            <button type="button" className={`${btnPrimary} w-full`} disabled={busy || s.workouts.new + s.foods.new + s.weights.new === 0} onClick={() => void send(true)}>
              {busy && <LoaderCircle size={18} className="animate-spin" />}
              {s.workouts.new + s.foods.new + s.weights.new === 0 ? "Nothing new to import" : "Import"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
