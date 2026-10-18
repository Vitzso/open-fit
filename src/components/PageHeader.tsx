import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SECTION_COLOR, type Section } from "@/lib/ui";

/** A small bumper-plate disc in the section's colour. */
export function Plate({ section, size = 14 }: { section: Section; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: SECTION_COLOR[section],
        // The hub of a plate.
        boxShadow: `inset 0 0 0 ${Math.max(2, size * 0.32)}px ${SECTION_COLOR[section]}, inset 0 0 0 ${size}px rgb(0 0 0 / 0.28)`,
      }}
    />
  );
}

export default function PageHeader({
  title,
  subtitle,
  back,
  backLabel = "Back",
  action,
  section,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: string;
  backLabel?: string;
  action?: React.ReactNode;
  section?: Section;
}) {
  return (
    <header
      className="mb-5 pt-3"
      style={section ? ({ "--accent": SECTION_COLOR[section] } as React.CSSProperties) : undefined}
    >
      {back && (
        <Link href={back} className="-ml-2 mb-1 inline-flex h-10 items-center pr-3 text-[15px] text-muted active:text-fg">
          <ChevronLeft size={20} /> {backLabel}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 font-display text-[34px] leading-none font-bold">
            {section && <Plate section={section} size={16} />}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
