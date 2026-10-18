"use client";
// Chat state: Ollama status, the conversation, and streaming a reply.
import { useCallback, useEffect, useRef, useState } from "react";
import { askCoach, clearChatHistory, fetchChatHistory, fetchCoachHealth } from "@/services/coach.service";
import { isAbort } from "@/services/http";
import type { CoachHealth } from "@/services/types";

export interface ChatMsg {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const UNREACHABLE_HEALTH: CoachHealth = {
  ok: false,
  baseUrl: "?",
  model: "?",
  models: [],
  error: { error: "OpenFit server unreachable.", code: "UNREACHABLE" },
};

/** Loads status + history on mount; `ask` streams a reply into the last message. */
export function useCoachChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [health, setHealth] = useState<CoachHealth | null>(null);
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  /** Re-checks Ollama and reloads the data block the coach sees. */
  const refreshHealth = useCallback(async () => {
    setHealth(null);
    const r = await fetchCoachHealth();
    if (r.ok && r.data.health) {
      setHealth(r.data.health);
      setContext(r.data.context?.text ?? "");
    } else {
      setHealth(UNREACHABLE_HEALTH);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    void fetchChatHistory().then(setMessages);
    return () => abortRef.current?.abort();
  }, [refreshHealth]);

  /** Sends a question (empty = weekly review) and streams the answer in. */
  async function ask(question: string) {
    if (busy) return;
    setBusy(true);
    const replyId = `r${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: `q${Date.now()}`, role: "user", content: question || "Weekly review" },
      { id: replyId, role: "assistant", content: "" },
    ]);
    const patch = (fn: (c: ChatMsg) => ChatMsg) => setMessages((m) => m.map((x) => (x.id === replyId ? fn(x) : x)));

    abortRef.current = new AbortController();
    try {
      const r = await askCoach(question, abortRef.current.signal);
      if (!r.ok) {
        patch((c) => ({ ...c, error: true, content: `${r.error}${r.hint ? `\n\n${r.hint}` : ""}` }));
        void refreshHealth();
        return;
      }
      for await (const chunk of r.data) patch((c) => ({ ...c, content: c.content + chunk }));
    } catch (e) {
      if (!isAbort(e)) patch((c) => ({ ...c, error: true, content: c.content + "\n\nLost connection to the OpenFit server." }));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  /** Stops the reply being written. */
  const stop = () => abortRef.current?.abort();

  /** Deletes the conversation after confirming. */
  async function clear() {
    if (!confirm("Clear the whole conversation?")) return;
    if (await clearChatHistory()) setMessages([]);
  }

  return { messages, health, context, busy, ask, stop, clear, refreshHealth };
}
