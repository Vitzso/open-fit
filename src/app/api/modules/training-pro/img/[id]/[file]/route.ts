import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isModuleEnabled } from "@/lib/modules/server";
import { isLibraryId, LIBRARY_DIR, LIBRARY_SOURCE } from "@/modules/training-pro/lib/library";

export const dynamic = "force-dynamic";

const headers = { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" };

/**
 * A library exercise photo. Downloaded from free-exercise-db the first time anyone views it, then
 * served from data/modules/training-pro/img on this PC (and cached on the phone for a year).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  if (!isLibraryId(id) || (file !== "0.jpg" && file !== "1.jpg")) return new Response("Not found", { status: 404 });
  if (!(await isModuleEnabled("training-pro"))) return new Response("Pro training is off", { status: 404 });

  const local = path.join(LIBRARY_DIR, "img", id, file);
  if (existsSync(local)) return new Response(readFileSync(local), { headers });

  const res = await fetch(`${LIBRARY_SOURCE}/exercises/${id}/${file}`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok || !res.headers.get("content-type")?.startsWith("image/")) return new Response("Photo unavailable", { status: 404 });
  const bytes = Buffer.from(await res.arrayBuffer());
  try {
    mkdirSync(path.dirname(local), { recursive: true });
    writeFileSync(local, bytes);
  } catch {
    /* can't cache (read-only folder): still serve it */
  }
  return new Response(bytes, { headers });
}
