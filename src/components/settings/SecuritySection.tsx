import Link from "next/link";
import { Download, FileUp, HeartPulse } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import { btnSecondary, card } from "@/lib/ui";

/** Passcode status, backup download and sign-out. */
export default function SecuritySection({ locked }: { locked: boolean }) {
  return (
    <section className={`${card} mt-4 space-y-3`}>
      <h2 className="font-display text-xl font-semibold">Security and data</h2>
      {locked ? (
        <p className="text-[15px] text-muted">Passcode lock is on. Every device has to sign in once.</p>
      ) : (
        <p className="rounded-xl bg-plate-yellow/15 p-3 text-[15px]">
          No passcode set: anyone on your Wi-Fi can open OpenFit and read or change your data. Add <code>APP_PASSCODE=&quot;…&quot;</code> to{" "}
          <code>.env</code> and restart the server.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <a href="/api/export" className={btnSecondary} download>
          <Download size={16} /> Export backup
        </a>
        {locked && <SignOutButton />}
      </div>
      <p className="text-sm text-muted">The backup is a file of all your workouts, weigh-ins, food log, settings and coach history.</p>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/settings/import" className={btnSecondary}>
          <FileUp size={16} /> Import
        </Link>
        <Link href="/settings/health" className={btnSecondary}>
          <HeartPulse size={16} /> Apple Health
        </Link>
      </div>
      <p className="text-sm text-muted">Bring history over from MyFitnessPal, Strong or Hevy, or restore a backup. Apple Health sends weight and steps by itself.</p>
    </section>
  );
}
