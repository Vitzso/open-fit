import { NextResponse } from "next/server";
import { buildCoachContext } from "@/lib/coach";
import { checkOllamaHealth, isValidModelName, validateOllamaUrl } from "@/lib/ollama";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Ollama status + the exact data block the coach will receive. Optional ?baseUrl=&model= to test unsaved values. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const s = await getSettings();

  const rawUrl = url.searchParams.get("baseUrl");
  const rawModel = url.searchParams.get("model");
  const baseUrl = rawUrl ? validateOllamaUrl(rawUrl) : s.ollamaBaseUrl;
  if (rawUrl && !baseUrl) {
    return NextResponse.json({ error: "Ollama URL must look like http://127.0.0.1:11434 (or http://<other-pc-ip>:11434)" }, { status: 400 });
  }
  if (rawModel && !isValidModelName(rawModel)) {
    return NextResponse.json({ error: "Invalid model name." }, { status: 400 });
  }

  const [health, context] = await Promise.all([
    checkOllamaHealth({ baseUrl: baseUrl || undefined, model: rawModel || s.ollamaModel || undefined }),
    buildCoachContext(),
  ]);
  return NextResponse.json({ health, context });
}
