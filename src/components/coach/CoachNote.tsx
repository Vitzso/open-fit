"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import Markdown from "@/components/Markdown";
import { Plate } from "@/components/PageHeader";
import { btnIcon } from "@/lib/ui";
import { fetchTodayNote, writeTodayNote } from "@/services/coach-note.service";

type State =
  | { kind: "loading" }
  | { kind: "writing" }
  | { kind: "ready"; content: string; createdAt: string }
  | { kind: "offline"; message: string };

/**
 * The coach's note for today on the home screen. Written once a day from your
 * latest data (on first open), then kept; tap refresh after logging more.
 */
export default function CoachNote() {
  const [state, setState] = useState<State>({ kind: "loading" });

  async function write() {
    setState({ kind: "writing" });
    const r = await writeTodayNote();
    if (r.ok && r.data.note) setState({ kind: "ready", ...r.data.note });
    else setState({ kind: "offline", message: r.ok ? "The coach isn't available right now." : r.error });
  }

  useEffect(() => {
    let cancelled = false;
    void fetchTodayNote().then((r) => {
      if (cancelled) return;
      if (!r.ok) setState({ kind: "offline", message: r.error });
      else if (r.data.note) setState({ kind: "ready", ...r.data.note });
      else void write(); // first open today: ask the coach for a note
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const time =
    state.kind === "ready" ? new Date(state.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <section aria-labelledby="coach-note" className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="coach-note" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Plate section="coach" size={12} /> Coach&apos;s note
        </h2>
        {(state.kind === "ready" || state.kind === "offline") && (
          <button type="button" onClick={() => void write()} className={btnIcon} aria-label="Write a fresh note">
            <RefreshCw size={18} />
          </button>
        )}
      </div>
      <div className="border-l-2 border-plate-red pl-4 text-[16px] leading-relaxed">
        {state.kind === "loading" || state.kind === "writing" ? (
          <p className="flex items-center gap-2 text-muted">
            <LoaderCircle size={16} className="animate-spin" />
            {state.kind === "writing" ? "Your coach is looking at your week…" : "Loading…"}
          </p>
        ) : state.kind === "ready" ? (
          <>
            <Markdown text={state.content} />
            <p className="mt-2 text-sm text-faint">
              Written at {time}.{" "}
              <Link href="/coach" className="text-muted underline">
                Ask a follow-up
              </Link>
            </p>
          </>
        ) : (
          <p className="text-muted">
            {state.message}{" "}
            <Link href="/coach/checkup" className="text-fg underline">
              Check the coach
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
