"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Trash } from "lucide-react";
import { createDeviceToken, revokeDeviceToken } from "@/actions/tokens";
import { btnPrimary, btnSmall, card, input, label } from "@/lib/ui";

interface TokenRow {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never");

/** Device tokens for the Apple Health Shortcut: make one (shown once), see when each was used, revoke. */
export default function HealthTokens({ tokens, endpoint }: { tokens: TokenRow[]; endpoint: string }) {
  const router = useRouter();
  const [name, setName] = useState("iPhone");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function create() {
    startTransition(async () => {
      const r = await createDeviceToken(name);
      setFresh(r.token);
      setCopied(false);
      router.refresh();
    });
  }

  return (
    <div className={`${card} space-y-3`}>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <KeyRound size={18} /> Device token
      </h2>
      {fresh ? (
        <div className="space-y-2 rounded-xl bg-plate-green/15 p-3">
          <p className="text-[15px]">Copy this token into the Shortcut now. It won&apos;t be shown again.</p>
          <code className="block rounded-lg bg-ink p-2 text-sm break-all select-all">{fresh}</code>
          <button
            type="button"
            className={btnSmall}
            onClick={() => {
              void navigator.clipboard?.writeText(fresh).then(() => setCopied(true));
            }}
          >
            <Copy size={15} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="token-name" className={label}>
              Name it (which device)
            </label>
            <input id="token-name" className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <button type="button" className={btnPrimary} onClick={create}>
            Make token
          </button>
        </div>
      )}
      {tokens.length > 0 && (
        <ul className="divide-y divide-line">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-[15px]">
                {t.name}
                <span className="block text-sm text-faint">Last used: {when(t.lastUsedAt)}</span>
              </span>
              <button
                type="button"
                className={btnSmall}
                aria-label={`Revoke ${t.name}`}
                onClick={() => startTransition(async () => (await revokeDeviceToken(t.id), router.refresh()))}
              >
                <Trash size={15} /> Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-faint">The Shortcut sends to {endpoint}</p>
    </div>
  );
}
