// A timeout whose deadline can be pushed back (first-token wait, then idle wait between tokens).

export interface Deadline {
  signal: AbortSignal;
  /** True once the timer has fired (so an abort can be reported as a timeout). */
  readonly fired: boolean;
  /** Restarts the countdown with a new duration. */
  reset(ms: number): void;
  clear(): void;
}

/** Creates an AbortController that aborts after `ms` unless reset or cleared. */
export function deadline(ms: number): Deadline {
  const controller = new AbortController();
  let fired = false;
  const arm = (t: number) => setTimeout(() => ((fired = true), controller.abort()), t);
  let timer = arm(ms);
  return {
    signal: controller.signal,
    get fired() {
      return fired;
    },
    reset(next: number) {
      clearTimeout(timer);
      timer = arm(next);
    },
    clear: () => clearTimeout(timer),
  };
}
