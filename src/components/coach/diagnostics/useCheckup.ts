"use client";

import { useState } from "react";
import { runOllamaCheckup } from "@/services/diagnostics.service";
import type { CheckupReport } from "@/services/types";

/** Runs the Ollama checkup on demand and keeps the latest report or error. */
export function useCheckup() {
  const [report, setReport] = useState<CheckupReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Starts a fresh checkup. */
  async function run() {
    setRunning(true);
    setError(null);
    setReport(null);
    const r = await runOllamaCheckup();
    if (r.ok) setReport(r.data);
    else setError(r.error);
    setRunning(false);
  }

  return { report, running, error, run };
}
