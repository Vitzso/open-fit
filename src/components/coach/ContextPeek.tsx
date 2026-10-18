/** Collapsible view of the exact data block the coach reads. */
export default function ContextPeek({ text }: { text: string }) {
  return (
    <details className="rounded-2xl border border-line bg-surface/60 px-4 py-2 text-sm">
      <summary className="cursor-pointer text-muted">What the coach sees (last 7 days)</summary>
      <pre className="mt-2 max-h-72 overflow-auto text-xs whitespace-pre-wrap text-fg">{text || "Loading…"}</pre>
    </details>
  );
}
