import { headers } from "next/headers";
import PageHeader from "@/components/PageHeader";
import HealthTokens from "@/components/settings/HealthTokens";
import { prisma } from "@/lib/db";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

/** Apple Health through an iPhone Shortcut: a device token, and how to build the Shortcut. */
export default async function HealthPage() {
  const [tokens, h] = await Promise.all([prisma.apiToken.findMany({ orderBy: { createdAt: "desc" } }), headers()]);
  const host = h.get("host") ?? "your-pc:3443";
  const proto = h.get("x-forwarded-proto") ?? (host.endsWith(":3443") ? "https" : "http");
  const endpoint = `${proto}://${host}/api/ingest/health`;

  return (
    <>
      <PageHeader title="Apple Health" back="/settings" backLabel="Settings" subtitle="Send your weight, steps and active calories automatically." />
      <div className="space-y-4">
        <HealthTokens
          tokens={tokens.map((t) => ({ id: t.id, name: t.name, createdAt: t.createdAt.toISOString(), lastUsedAt: t.lastUsedAt?.toISOString() ?? null }))}
          endpoint={endpoint}
        />
        <section className={`${card} space-y-2 text-[15px]`}>
          <h2 className="font-display text-xl font-semibold">Build the Shortcut (once)</h2>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              In the <b>Shortcuts</b> app, make a new shortcut called &quot;OpenFit Health&quot;.
            </li>
            <li>
              Add <b>Find Health Samples</b>: Type <i>Weight</i>, sorted by Start Date, latest first, limit 1. Add <b>Get Details of Health Sample</b>: <i>Value</i>.
            </li>
            <li>
              Add <b>Find Health Samples</b> for <i>Steps</i> (Start Date is today) and <b>Calculate Statistics</b>: Sum. Do the same for <i>Active Energy</i> if you like.
            </li>
            <li>
              Add <b>Get Contents of URL</b> with the address below, Method <i>POST</i>, Header <i>Authorization</i> = <code>Bearer</code> followed by your token, and Request
              Body <i>JSON</i> with: <code>weight</code> (the weight value), <code>weightUnit</code> (<i>kg</i> or <i>lb</i>, as on your iPhone), <code>steps</code>,{" "}
              <code>activeKcal</code>.
            </li>
            <li>
              In <b>Automation</b>, run it every morning (and turn off &quot;Ask Before Running&quot;). Weigh-ins from a smart scale then arrive by themselves.
            </li>
          </ol>
          <p className="text-muted">
            Address: <code className="break-all">{endpoint}</code>
          </p>
          <p className="text-sm text-faint">
            A weight that day replaces that day&apos;s weigh-in. Away from home, the Shortcut needs the same network as the app (for example Tailscale).
          </p>
        </section>
      </div>
    </>
  );
}
