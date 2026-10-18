"use client";

import { useState } from "react";
import { LoaderCircle, Lock } from "lucide-react";
import { btnPrimary, input } from "@/lib/ui";
import { signIn } from "@/services/auth.service";

const ERRORS: Record<string, string> = {
  wrong: "Wrong passcode.",
  locked: "Too many attempts. Wait 10 minutes and try again.",
};

/**
 * Signs in with fetch, then does a full page load of the destination.
 * The full load (not a client-side navigation) makes sure every request after
 * this carries the new session cookie, and drops any pages cached while locked.
 * Still a normal <form>, so it works if JavaScript hasn't loaded yet.
 */
export default function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [error, setError] = useState<string | null>(initialError && ERRORS[initialError] ? ERRORS[initialError] : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await signIn(e.currentTarget);
    if (r.ok) {
      window.location.replace(typeof r.data?.next === "string" ? r.data.next : next);
      return; // keep the spinner while the app loads
    }
    setError(
      r.status === 0
        ? "Can't reach your PC. Check that OpenFit is running (and Tailscale is on when away)."
        : (ERRORS[r.error] ?? "Couldn't sign in. Try again."),
    );
    setBusy(false);
  }

  return (
    <form method="post" action="/api/login" onSubmit={submit} className="mx-auto mt-24 max-w-xs space-y-4 text-center">
      <Lock size={34} className="mx-auto text-plate-white" />
      <h1 className="font-display text-[32px] leading-tight font-bold">OpenFit is locked</h1>
      <p className="text-[15px] text-muted">Enter your passcode. This device will stay signed in.</p>
      <input type="hidden" name="next" value={next} />
      <input
        name="passcode"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        autoFocus
        required
        placeholder="Passcode"
        className={`${input} text-center text-lg tracking-widest`}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className={`${btnPrimary} w-full`} disabled={busy}>
        {busy && <LoaderCircle size={18} className="animate-spin" />}
        {busy ? "Unlocking…" : "Unlock"}
      </button>
    </form>
  );
}
