import { Plate } from "@/components/PageHeader";
import type { Section } from "@/lib/ui";

/**
 * Instant placeholder shown the moment you tap a tab, while the page's data
 * comes from the PC. Next.js prefetches these, so they appear with no network
 * wait even on a slow mobile connection.
 */
export default function PageSkeleton({ title, section, rows = 4 }: { title: string; section?: Section; rows?: number }) {
  return (
    <div data-skeleton aria-busy="true" aria-label={`Loading ${title}`}>
      <header className="mb-5 pt-3">
        <h1 className="flex items-center gap-2.5 font-display text-[34px] leading-none font-bold">
          {section && <Plate section={section} size={16} />}
          {title}
        </h1>
        <div className="mt-2.5 h-4 w-32 animate-pulse rounded bg-raised" />
      </header>
      <div className="mb-6 h-40 animate-pulse rounded-[var(--radius-card)] bg-surface" />
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />
            <div className="h-4 flex-1 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
