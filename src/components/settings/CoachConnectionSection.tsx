import Link from "next/link";
import OllamaTest from "@/components/coach/OllamaTest";
import type { AppSettings } from "@/lib/settings";
import { card, input, label } from "@/lib/ui";
import Field from "./Field";
import ModelPicker from "./ModelPicker";

export interface CoachDefaults {
  baseUrl: string;
  model: string;
  reasoning: string;
}

const THINKING = [
  { v: "none", label: "Off: replies start instantly" },
  { v: "low", label: "Low: a few seconds' pause, smarter (good on a fast GPU)" },
  { v: "medium", label: "Medium: slower, for tricky questions" },
  { v: "high", label: "High: slowest" },
];

/** How much the model reasons before answering (thinking models such as gemma4 or qwen3). */
function ThinkingSelect({ value, fallback }: { value: string | null; fallback: string }) {
  return (
    <div>
      <label htmlFor="ollamaReasoning" className={label}>
        Thinking before answering
      </label>
      <select id="ollamaReasoning" name="ollamaReasoning" className={input} defaultValue={value ?? ""}>
        <option value="">Default from .env ({fallback})</option>
        {THINKING.map((t) => (
          <option key={t.v} value={t.v}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Ollama address, model and thinking level, with a connection test. Blank fields use the .env defaults. */
export default function CoachConnectionSection({ s, defaults }: { s: AppSettings; defaults: CoachDefaults }) {
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="font-display text-xl font-semibold">AI coach connection</h2>
      <Field name="ollamaBaseUrl" text="Ollama address" value={s.ollamaBaseUrl} placeholder={defaults.baseUrl} inputMode="url" autoCapitalize="off" />
      <ModelPicker value={s.ollamaModel} placeholder={defaults.model} />
      <ThinkingSelect value={s.ollamaReasoning} fallback={defaults.reasoning} />
      <p className="text-sm text-muted">Leave a field blank to use the value from the .env file.</p>
      <OllamaTest />
      <Link href="/coach/checkup" className="block text-center text-[15px] text-fg underline">
        Full check-up and coach self-test
      </Link>
    </section>
  );
}
