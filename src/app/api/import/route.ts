import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateAll } from "@/actions/revalidate";
import { commitImport, previewImport } from "@/lib/import/commit";
import { detectSource, parseImport } from "@/lib/import/parsers";
import { IMPORT_SOURCES, SOURCE_LABEL } from "@/lib/import/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  /** Leave out to recognise the file automatically. */
  source: z.enum(IMPORT_SOURCES).optional(),
  /** The unit the file's weights are in (Strong doesn't say). */
  unit: z.enum(["kg", "lb"]).default("kg"),
  text: z.string().min(1).max(40_000_000),
  /** false: only preview what would be added. */
  commit: z.boolean().default(false),
});

/** Imports an export from MyFitnessPal, Strong, Hevy or an OpenFit backup (preview first, then commit). */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a file to import." }, { status: 400 });
  const { unit, text, commit } = body.data;
  const source = body.data.source ?? detectSource(text);
  if (!source) {
    return NextResponse.json(
      { error: "That file isn't one OpenFit recognises. Use a MyFitnessPal, Strong or Hevy CSV export, or an OpenFit backup." },
      { status: 400 },
    );
  }
  try {
    const plan = parseImport(source, text, unit);
    const summary = commit ? await commitImport(plan) : await previewImport(plan);
    if (commit) revalidateAll();
    return NextResponse.json({ source, sourceLabel: SOURCE_LABEL[source], committed: commit, summary });
  } catch (e) {
    console.error("import failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't read that file." }, { status: 400 });
  }
}
