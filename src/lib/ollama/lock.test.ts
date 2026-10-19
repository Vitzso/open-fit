import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireOllama, ollamaBusyMessage, ollamaBusyWith, releaseOllama, tryAcquireOllama } from "./lock";

afterEach(() => {
  // Drain whatever a test left behind.
  for (let i = 0; i < 10 && ollamaBusyWith(); i++) releaseOllama(ollamaBusyWith()!);
  vi.useRealTimers();
});

describe("Ollama lock", () => {
  it("waits its turn instead of failing", async () => {
    expect(await acquireOllama("note")).toBe(true);
    const coach = acquireOllama("coach");
    expect(ollamaBusyWith()).toBe("note");
    releaseOllama("note");
    expect(await coach).toBe(true);
    expect(ollamaBusyWith()).toBe("coach");
  });

  it("serves jobs first come, first served", async () => {
    await acquireOllama("note");
    const order: string[] = [];
    const a = acquireOllama("coach").then(() => order.push("coach"));
    const b = acquireOllama("checkup").then(() => order.push("checkup"));
    releaseOllama("note");
    await a;
    releaseOllama("coach");
    await b;
    expect(order).toEqual(["coach", "checkup"]);
  });

  it("gives up after the wait and names what's running", async () => {
    vi.useFakeTimers();
    await acquireOllama("selftest");
    const waiting = acquireOllama("coach", { waitMs: 1000 });
    vi.advanceTimersByTime(1000);
    expect(await waiting).toBe(false);
    expect(ollamaBusyMessage()).toBe("The coach is still busy running the coach self-test. Try again when it's finished.");
    releaseOllama("selftest");
    expect(ollamaBusyWith()).toBeNull(); // the job that gave up isn't handed the lock
  });

  it("stops waiting when the caller hangs up", async () => {
    await acquireOllama("note");
    const hangUp = new AbortController();
    const waiting = acquireOllama("coach", { signal: hangUp.signal });
    hangUp.abort();
    expect(await waiting).toBe(false);
    releaseOllama("note");
    expect(ollamaBusyWith()).toBeNull();
  });

  it("only the holder can release", async () => {
    await acquireOllama("note");
    releaseOllama("coach");
    expect(ollamaBusyWith()).toBe("note");
  });

  it("takes over a lock held for over 15 minutes", () => {
    vi.useFakeTimers();
    expect(tryAcquireOllama("report")).toBe(true);
    expect(tryAcquireOllama("coach")).toBe(false);
    vi.advanceTimersByTime(15 * 60_000 + 1);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(tryAcquireOllama("coach")).toBe(true);
    expect(ollamaBusyWith()).toBe("coach");
  });
});
