import { beforeEach, describe, expect, it, vi } from "vitest";

// A minimal browser for the outbox: localStorage, events and fetch.
function fakeBrowser() {
  const store = new Map<string, string>();
  const target = new EventTarget();
  const calls: { kind: string; clientId: string }[] = [];
  let online = true;
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal("window", target);
  vi.stubGlobal("crypto", globalThis.crypto);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      if (!online) throw new TypeError("Failed to fetch");
      calls.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }),
  );
  return { calls, setOnline: (v: boolean) => (online = v) };
}

describe("outbox", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("still syncs after an empty sync (regression: a stuck 'running' flag stopped all syncing)", async () => {
    const b = fakeBrowser();
    const { enqueue, flush, getOutbox } = await import("./outbox");
    expect(await flush()).toBe("done"); // app opened with nothing waiting
    enqueue("food", { name: "Pear" }, { label: "Pear", day: "2026-10-19" });
    await flush();
    expect(b.calls).toHaveLength(1);
    expect(getOutbox()).toHaveLength(0);
  });

  it("keeps entries while the PC is unreachable and sends each once, in order, when it's back", async () => {
    const b = fakeBrowser();
    const { enqueue, flush, getOutbox } = await import("./outbox");
    b.setOnline(false);
    enqueue("food", { name: "A" }, { label: "A", day: "2026-10-19" });
    enqueue("weight", { weight: 80 }, { label: "B", day: "2026-10-19" });
    expect(await flush()).toBe("offline");
    expect(getOutbox()).toHaveLength(2);
    b.setOnline(true);
    expect(await flush()).toBe("done");
    expect(b.calls.map((c) => c.kind)).toEqual(["food", "weight"]);
    expect(new Set(b.calls.map((c) => c.clientId)).size).toBe(2);
  });

  it("makes RFC 4122 v4 ids without crypto.randomUUID (plain-HTTP iPhones)", async () => {
    fakeBrowser();
    const { newId } = await import("./outbox");
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
