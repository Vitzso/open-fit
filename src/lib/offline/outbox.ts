// The phone's outbox: every food entry, set and weigh-in is saved here first and then sent to
// the PC (POST /api/log). If the PC can't be reached (no Wi-Fi in the gym, VPN off, PC asleep)
// entries wait here and go out by themselves once it's back. Each entry has its own id, so a
// retry after a lost reply never saves it twice.
"use client";

export type OutboxKind = "food" | "relog" | "set" | "weight";

export interface OutboxItem {
  /** Also the clientId the server de-duplicates on. */
  id: string;
  kind: OutboxKind;
  payload: Record<string, unknown>;
  /** What to show while it waits, e.g. "Banana · 105 kcal". */
  label: string;
  /** The day it belongs to (YYYY-MM-DD), fixed when it was logged. */
  day: string;
  /** For sets: the workout they belong to, and the exercise (to count planned sets). */
  workoutId?: number;
  exercise?: string;
  createdAt: number;
  attempts: number;
  /** Set when the PC refused it for good (e.g. the workout was deleted); it's kept for you to see. */
  failed?: string;
}

const KEY = "openfit:outbox:v1";
const EVENT = "openfit:outbox";
/** Fired after entries reached the PC, so pages can refresh their data. */
export const SYNCED_EVENT = "openfit:synced";

let cache: OutboxItem[] | null = null;

function load(): OutboxItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(items: OutboxItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked: keep it in memory for this session */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** All waiting (and failed) entries, oldest first. Same array until something changes. */
export const getOutbox = (): OutboxItem[] => (typeof window === "undefined" ? EMPTY : load());
const EMPTY: OutboxItem[] = [];

/** Calls `onChange` whenever the outbox changes (in this tab or another one). */
export function subscribeOutbox(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      onChange();
    }
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * A random UUID. crypto.randomUUID only exists on secure (HTTPS) pages, and the iPhone may use
 * OpenFit over plain HTTP at home, so build it from getRandomValues, which works everywhere.
 */
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Saves an entry on the phone and starts sending it. Returns the item (it shows as "waiting" until sent). */
export function enqueue(kind: OutboxKind, payload: Record<string, unknown>, meta: Pick<OutboxItem, "label" | "day" | "workoutId" | "exercise">) {
  const item: OutboxItem = { id: newId(), kind, payload, createdAt: Date.now(), attempts: 0, ...meta };
  save([...load(), item]);
  void flush();
  return item;
}

/** Removes an entry (e.g. you discard one the PC refused). */
export function discard(id: string) {
  save(load().filter((i) => i.id !== id));
}

/** Puts a refused entry back in line, e.g. after you fixed what was wrong on the PC. */
export function retry(id: string) {
  save(load().map((i) => (i.id === id ? { ...i, failed: undefined, attempts: 0 } : i)));
  void flush();
}

export type FlushResult = "done" | "offline" | "error" | "busy";
let running: Promise<FlushResult> | null = null;

/** Sends waiting entries to the PC in order. Stops at the first one the PC can't take right now. */
export function flush(): Promise<FlushResult> {
  if (running) return running;
  // Assign before any work and clear only when THIS run ends: a run with nothing to send finishes
  // synchronously, and clearing inside it left a settled promise stuck here, so nothing synced again.
  const run = (async (): Promise<FlushResult> => {
    let sent = 0;
    try {
      for (;;) {
        const next = load().find((i) => !i.failed);
        if (!next) return "done";
        let res: Response;
        try {
          res = await fetch("/api/log", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            body: JSON.stringify({ kind: next.kind, clientId: next.id, payload: next.payload }),
          });
        } catch {
          return "offline"; // network error: the PC isn't reachable, keep everything
        }
        if (res.ok) {
          save(load().filter((i) => i.id !== next.id));
          sent++;
          continue;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string; permanent?: boolean };
        if (res.status === 401) return "error"; // signed out: wait until you sign in again
        if (body.permanent || res.status === 400 || res.status === 409) {
          save(load().map((i) => (i.id === next.id ? { ...i, failed: body.error ?? `Refused (HTTP ${res.status})` } : i)));
          continue;
        }
        // Server trouble: count the attempt and try again later.
        save(load().map((i) => (i.id === next.id ? { ...i, attempts: i.attempts + 1 } : i)));
        return "error";
      }
    } finally {
      if (sent > 0) window.dispatchEvent(new Event(SYNCED_EVENT));
    }
  })();
  running = run;
  void run.finally(() => {
    if (running === run) running = null;
  });
  return run;
}
