"use client";

import { useEffect, useState } from "react";
import { input, label } from "@/lib/ui";
import { fetchCoachHealth } from "@/services/coach.service";

/** Popular models that work well as the coach, shown when not installed yet (downloadable from Setup). */
const SUGGESTED = ["gemma4:latest", "llama3.1:8b", "qwen3:8b", "mistral:7b"];

/** Model field with suggestions: models already installed in Ollama first, then popular ones. */
export default function ModelPicker({ value, placeholder }: { value: string | null; placeholder: string }) {
  const [installed, setInstalled] = useState<string[]>([]);

  useEffect(() => {
    void fetchCoachHealth().then((r) => {
      if (r.ok && r.data.health) setInstalled(r.data.health.models);
    });
  }, []);

  const suggestions = SUGGESTED.filter((m) => !installed.includes(m));
  return (
    <div>
      <label htmlFor="ollamaModel" className={label}>
        Model
      </label>
      <input
        id="ollamaModel"
        name="ollamaModel"
        className={input}
        list="ollama-models"
        defaultValue={value ?? ""}
        placeholder={placeholder}
        autoCapitalize="off"
        autoComplete="off"
      />
      <datalist id="ollama-models">
        {installed.map((m) => (
          <option key={m} value={m} label="Installed" />
        ))}
        {suggestions.map((m) => (
          <option key={m} value={m} label="Not installed: save, then Download in Setup" />
        ))}
      </datalist>
      {installed.length > 0 && <p className="mt-1 text-sm text-muted">Installed: {installed.join(", ")}</p>}
    </div>
  );
}
