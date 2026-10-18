"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { btnSecondary } from "@/lib/ui";
import { fetchCoachHealth } from "@/services/coach.service";
import type { CoachHealth } from "@/services/types";

/** Turns a health report into the one-line result shown under the button. */
function describe(health: CoachHealth): { ok: boolean; text: string } {
  if (health.ok) return { ok: true, text: `Connected to ${health.baseUrl} · "${health.model}" is installed.` };
  const installed = health.models.length ? `\nInstalled: ${health.models.join(", ")}` : "";
  return { ok: false, text: `${health.error?.error ?? "Failed."} ${health.error?.hint ?? ""}${installed}` };
}

/** Tests the URL/model currently typed in the settings form, before saving. */
export default function OllamaTest() {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function test(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form!;
    const baseUrl = (form.elements.namedItem("ollamaBaseUrl") as HTMLInputElement).value;
    const model = (form.elements.namedItem("ollamaModel") as HTMLInputElement).value;
    setBusy(true);
    setState(null);
    const r = await fetchCoachHealth({ baseUrl, model });
    setState(r.ok && r.data.health ? describe(r.data.health) : { ok: false, text: r.ok ? "Failed." : r.error });
    setBusy(false);
  }

  return (
    <div>
      <button type="button" className={`${btnSecondary} w-full`} onClick={test} disabled={busy}>
        {busy && <LoaderCircle size={16} className="animate-spin" />} Test connection
      </button>
      {state && (
        <p className={`mt-2 text-sm whitespace-pre-wrap ${state.ok ? "text-plate-green" : "text-red-300"}`}>{state.text}</p>
      )}
    </div>
  );
}
