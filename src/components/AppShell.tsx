"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import OutboxSync from "@/components/offline/OutboxSync";

/** Pages laid out for a big screen: no phone-width column and no bottom tab bar. */
const isWide = (path: string) => path === "/desktop" || path.startsWith("/desktop/");

/** The phone frame (narrow column + bottom tabs) around every page except the desktop dashboard. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (isWide(path)) return <>{children}</>;
  return (
    <>
      <main className="pt-safe mx-auto max-w-xl px-5 pb-32">{children}</main>
      <OutboxSync />
      <BottomNav />
    </>
  );
}
