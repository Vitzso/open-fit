"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Trash } from "lucide-react";
import { btnPrimary, btnSecondary, card, input, label } from "@/lib/ui";
import { saveProgram } from "../actions";
import type { ProgramData } from "../lib/programs";
import LibraryPicker from "./LibraryPicker";

type Row = ProgramData["exercises"][number] & { key: number };

const REST = [45, 60, 90, 120, 150, 180, 240];
let nextKey = 1;

/** Build or edit one of your programs: exercises in order, with sets, reps and rest. */
export default function ProgramEditor({ programId, initial, recent }: { programId: number | null; initial: ProgramData | null; recent: string[] }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    (initial?.exercises.length ? initial.exercises : [{ name: "", sets: 3, reps: "8-10", restSec: 90, supersetWithNext: false }]).map((e) => ({ ...e, key: nextKey++ })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const out = [...rs];
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });

  function save() {
    setSaving(true);
    setError(null);
    startTransition(async () => {
      const r = await saveProgram(programId, { name, notes, exercises: rows.map(({ key: _k, ...e }) => e) });
      setSaving(false);
      if (!r.ok) return setError(r.error);
      router.push("/workouts/programs");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className={`${card} space-y-3`}>
        <div>
          <label htmlFor="program-name" className={label}>
            Program name
          </label>
          <input id="program-name" className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push day" maxLength={80} />
        </div>
        <div>
          <label htmlFor="program-notes" className={label}>
            Notes (optional)
          </label>
          <input id="program-notes" className={input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Mondays and Thursdays" maxLength={500} />
        </div>
      </div>

      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.key} className={`${card} space-y-3`}>
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Exercise {i + 1}</span>
              <span className="flex gap-1">
                <button type="button" className="rounded-full p-2 active:bg-raised" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  <ArrowUp size={16} />
                </button>
                <button type="button" className="rounded-full p-2 active:bg-raised" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">
                  <ArrowDown size={16} />
                </button>
                <button type="button" className="rounded-full p-2 active:bg-raised" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} disabled={rows.length === 1} aria-label="Remove exercise">
                  <Trash size={16} />
                </button>
              </span>
            </div>
            <LibraryPicker value={r.name} onChange={(v) => update(r.key, { name: v })} recent={recent} />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor={`sets-${r.key}`} className={label}>
                  Sets
                </label>
                <input id={`sets-${r.key}`} className={input} inputMode="numeric" value={r.sets} onChange={(e) => update(r.key, { sets: Math.max(1, Math.min(20, Number(e.target.value.replace(/\D/g, "")) || 1)) })} />
              </div>
              <div>
                <label htmlFor={`reps-${r.key}`} className={label}>
                  Reps
                </label>
                <input id={`reps-${r.key}`} className={input} value={r.reps} onChange={(e) => update(r.key, { reps: e.target.value })} placeholder="8-10" maxLength={20} />
              </div>
              <div>
                <label htmlFor={`rest-${r.key}`} className={label}>
                  Rest
                </label>
                <select id={`rest-${r.key}`} className={input} value={r.restSec} onChange={(e) => update(r.key, { restSec: Number(e.target.value) })}>
                  {REST.map((s) => (
                    <option key={s} value={s}>
                      {s < 60 ? `${s} s` : `${s / 60} min`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {i < rows.length - 1 && (
              <label className="flex items-center gap-2 text-[15px]">
                <input type="checkbox" className="size-5 accent-[var(--color-plate-blue)]" checked={r.supersetWithNext} onChange={(e) => update(r.key, { supersetWithNext: e.target.checked })} />
                Superset with the next exercise (back to back, rest after both)
              </label>
            )}
          </li>
        ))}
      </ol>

      <button type="button" className={`${btnSecondary} w-full`} onClick={() => setRows((rs) => [...rs, { key: nextKey++, name: "", sets: 3, reps: "8-10", restSec: 90, supersetWithNext: false }])}>
        <Plus size={18} /> Add exercise
      </button>
      {error && <p className="text-[15px] text-plate-red">{error}</p>}
      <button type="button" className={`${btnPrimary} w-full`} onClick={save} disabled={saving}>
        {saving && <LoaderCircle size={18} className="animate-spin" />} Save program
      </button>
    </div>
  );
}
