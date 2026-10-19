// One Ollama job at a time across the whole app (coach replies, notes, reports, checkups,
// self-tests, food photos). A local GPU serves one request well; running several at once
// just makes every one of them slow. Jobs wait their turn in order instead of failing, so
// the home page's coach note and a question from the phone no longer knock each other out.

type Waiter = { who: string; grant: (ok: boolean) => void };

let holder: string | null = null;
let heldSince = 0;
const queue: Waiter[] = [];

/** A job holding Ollama longer than this is assumed lost (a bug), and the next one takes over. */
const STALE_MS = 15 * 60_000;

function take(who: string) {
  holder = who;
  heldSince = Date.now();
}

/** Claims Ollama for `who` right now; false if another job holds it. */
export function tryAcquireOllama(who: string): boolean {
  if (holder && Date.now() - heldSince < STALE_MS) return false;
  if (holder) console.warn(`Ollama lock held by "${holder}" for over 15 minutes; taking it over.`);
  take(who);
  return true;
}

/**
 * Claims Ollama for `who`, waiting in line (first come, first served) while another job uses it.
 * Resolves false if it's still busy after `waitMs` or `signal` aborts (the caller hung up).
 */
export function acquireOllama(who: string, { waitMs = 120_000, signal }: { waitMs?: number; signal?: AbortSignal } = {}): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  if (tryAcquireOllama(who)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const giveUp = () => {
      const i = queue.indexOf(waiter);
      if (i >= 0) queue.splice(i, 1);
      waiter.grant(false);
    };
    const timer = setTimeout(giveUp, waitMs);
    const waiter: Waiter = {
      who,
      grant: (ok) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", giveUp);
        resolve(ok);
      },
    };
    signal?.addEventListener("abort", giveUp, { once: true });
    queue.push(waiter);
  });
}

/** Releases the claim (only if `who` is the holder) and hands Ollama to the next job in line. */
export function releaseOllama(who: string) {
  if (holder !== who) return;
  const next = queue.shift();
  if (next) {
    take(next.who);
    next.grant(true);
  } else {
    holder = null;
  }
}

/** Name of the job currently using Ollama, or null. */
export const ollamaBusyWith = () => holder;

const JOBS: Record<string, string> = {
  coach: "answering a coach question",
  note: "writing today's coach note",
  report: "writing a progress report",
  checkup: "running the Ollama checkup",
  selftest: "running the coach self-test",
  "food-ai": "reading a meal",
  "model-pull": "downloading a model",
};

/** The error shown when a job waited its whole turn and Ollama is still busy. */
export function ollamaBusyMessage() {
  const job = holder ? JOBS[holder] : null;
  return `The coach is still busy${job ? ` ${job}` : ""}. Try again when it's finished.`;
}
