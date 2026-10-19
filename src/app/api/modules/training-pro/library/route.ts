import { NextResponse, type NextRequest } from "next/server";
import { isModuleEnabled } from "@/lib/modules/server";
import { ensureLibrary, libraryPhotos, loadLibrary, searchLibrary } from "@/modules/training-pro/lib/library";

export const dynamic = "force-dynamic";

/** Searches the exercise library: ?q=bench&muscle=chest&equipment=barbell. */
export async function GET(req: NextRequest) {
  if (!(await isModuleEnabled("training-pro"))) return NextResponse.json({ error: "Pro training is off." }, { status: 404 });
  if (loadLibrary().length === 0) {
    try {
      await ensureLibrary();
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 503 });
    }
  }
  const sp = req.nextUrl.searchParams;
  const results = searchLibrary(sp.get("q")?.slice(0, 80) ?? "", {
    muscle: sp.get("muscle") || undefined,
    equipment: sp.get("equipment") || undefined,
    limit: 40,
  });
  return NextResponse.json({
    total: loadLibrary().length,
    results: results.map((e) => ({
      id: e.id,
      name: e.name,
      muscles: e.primaryMuscles,
      equipment: e.equipment,
      level: e.level,
      photos: libraryPhotos(e),
    })),
  });
}
