import Link from "next/link";
import { btnPrimary } from "@/lib/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-sm text-muted">That page or item doesn&apos;t exist. It may have been deleted.</p>
      <Link href="/" className={btnPrimary}>
        Home
      </Link>
    </div>
  );
}
