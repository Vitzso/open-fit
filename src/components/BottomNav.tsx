"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Apple, Bot, Dumbbell, House, Scale } from "lucide-react";
import { SECTION_COLOR, type Section } from "@/lib/ui";

const TABS: { href: string; label: string; Icon: typeof House; section: Section }[] = [
  { href: "/", label: "Today", Icon: House, section: "today" },
  { href: "/workouts", label: "Train", Icon: Dumbbell, section: "train" },
  { href: "/nutrition", label: "Food", Icon: Apple, section: "food" },
  { href: "/weight", label: "Weight", Icon: Scale, section: "weight" },
  { href: "/coach", label: "Coach", Icon: Bot, section: "coach" },
];

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

export default function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  // The tab you just tapped lights up immediately, instead of after the page arrives.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [path]);

  // Fetch every tab's full page in the background shortly after each navigation,
  // so the next tab switch needs no round trip to the PC. <Link prefetch> alone
  // waits for the link to be seen on screen; this doesn't. Fresh pages are skipped.
  useEffect(() => {
    if (path === "/login") return;
    const t = setTimeout(() => {
      for (const { href } of TABS) {
        if (href !== path) router.prefetch(href, { kind: "full" } as Parameters<typeof router.prefetch>[1]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [path, router]);

  if (path === "/login") return null;
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-5 px-1">
        {TABS.map(({ href, label, Icon, section }) => {
          const active = pending ? pending === href : isActive(href, path);
          const color = SECTION_COLOR[section];
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={true}
                onClick={() => setPending(href)}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 pt-2 pb-1.5 text-xs font-medium transition-colors active:opacity-60"
                style={{ color: active ? color : "var(--color-faint)" }}
              >
                {/* The active tab sits on a pill tinted with its own plate colour. */}
                <span
                  className="flex h-8 w-14 items-center justify-center rounded-full transition-colors"
                  style={{ background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : "transparent" }}
                >
                  <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
                </span>
                <span className={active ? "text-fg" : undefined}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
