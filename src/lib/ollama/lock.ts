// One Ollama job at a time across the whole app (coach replies, notes, checkups,
// self-tests). A local GPU serves one request well; queueing more just makes
// every request slow and lets repeated taps pile up minutes of work.

let holder: string | null = null;

/** Claims Ollama for `who`; false if another job already holds it. */
export function tryAcquireOllama(who: string): boolean {
  if (holder) return false;
  holder = who;
  return true;
}

/** Releases the claim, but only if `who` is the holder. */
export function releaseOllama(who: string) {
  if (holder === who) holder = null;
}

/** Name of the job currently using Ollama, or null. */
export const ollamaBusyWith = () => holder;
