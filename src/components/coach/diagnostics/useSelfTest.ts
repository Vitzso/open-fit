"use client";

import { useRef, useState } from "react";
import { startSelfTest } from "@/services/diagnostics.service";
import { isAbort } from "@/services/http";
import type { SelfTestCase } from "@/services/types";

/** Runs the coach self-test, adding each graded case as it arrives. */
export function useSelfTest() {
  const [cases, setCases] = useState<SelfTestCase[]>([]);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** Starts the test from scratch. */
  async function run() {
    setRunning(true);
    setError(null);
    setCases([]);
    abortRef.current = new AbortController();
    try {
      const r = await startSelfTest(abortRef.current.signal);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      for await (const event of r.data) {
        if (event.type === "start") setTotal(event.total);
        if (event.type === "case") setCases((c) => [...c, event]);
      }
    } catch (e) {
      if (!isAbort(e)) setError(e instanceof Error ? e.message : "Self-test failed.");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  /** Stops the test after the current question. */
  const stop = () => abortRef.current?.abort();

  return { cases, total, running, error, run, stop, passed: cases.filter((c) => c.passed).length };
}
