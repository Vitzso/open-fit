import { redirect } from "next/navigation";
import { passcodeEnabled } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!passcodeEnabled()) redirect("/");
  const { next = "/", error } = await searchParams;
  // Only same-app paths; the API re-checks this too.
  const safe = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
  return <LoginForm next={safe} initialError={error} />;
}
