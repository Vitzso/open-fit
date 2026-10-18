import { NextResponse, type NextRequest } from "next/server";
import { getSetupStatus } from "@/lib/setup/checks";

export const dynamic = "force-dynamic";

/** The setup checklist shown in Settings, plus the addresses to open OpenFit at on a phone. */
export async function GET(req: NextRequest) {
  return NextResponse.json(await getSetupStatus(publicUrl(req)));
}

/** The URL as the phone sees it: Next.js's own req.url uses its internal hostname ("localhost"). */
function publicUrl(req: NextRequest): string {
  const url = new URL(req.url);
  const host = req.headers.get("host");
  if (host) url.host = host;
  return url.toString();
}
