"use client";

import { useRef, useState } from "react";
import { isAbort } from "@/services/http";
import { startModelDownload } from "@/services/setup.service";

export interface DownloadState {
  running: boolean;
  /** Ollama's current step, e.g. "downloading" or "verifying sha256 digest". */
  status: string;
  /** 0–100 while a layer is downloading, otherwise null. */
  percent: number | null;
  error: string | null;
  done: boolean;
}

const IDLE: DownloadState = { running: false, status: "", percent: null, error: null, done: false };

/** Downloads the coach's model and tracks progress. `onDone` runs after a successful download. */
export function useModelDownload(onDone: () => void) {
  const [state, setState] = useState<DownloadState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  /** Starts the download. */
  async function start() {
    setState({ ...IDLE, running: true, status: "Starting…" });
    abortRef.current = new AbortController();
    try {
      const r = await startModelDownload(abortRef.current.signal);
      if (!r.ok) return setState({ ...IDLE, error: r.error });
      for await (const e of r.data) {
        if (e.type === "progress") {
          const percent = e.total ? Math.floor(((e.completed ?? 0) / e.total) * 100) : null;
          setState((s) => ({ ...s, status: e.status, percent }));
        } else if (e.type === "error") {
          return setState({ ...IDLE, error: e.error });
        } else {
          setState({ ...IDLE, done: true, status: "Downloaded" });
          onDone();
        }
      }
    } catch (e) {
      setState({ ...IDLE, error: isAbort(e) ? null : "Lost connection to your PC during the download." });
    } finally {
      abortRef.current = null;
    }
  }

  /** Cancels a running download (Ollama keeps what it has and resumes next time). */
  const cancel = () => abortRef.current?.abort();

  return { state, start, cancel };
}
