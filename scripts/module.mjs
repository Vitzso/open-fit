// Optional modules from the command line (used by Setup and the launcher):
//   node scripts/module.mjs status training-pro    → prints "on" or "off"
//   node scripts/module.mjs enable training-pro    → switches it on (and downloads its data)
//   node scripts/module.mjs disable training-pro
// Same storage as Settings → Modules: the Settings row's enabledModules column.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const KNOWN = ["training-pro"];
const [action, id] = process.argv.slice(2);
if (!["status", "enable", "disable"].includes(action) || !KNOWN.includes(id)) {
  console.error(`Usage: node scripts/module.mjs status|enable|disable ${KNOWN.join("|")}`);
  process.exit(2);
}
// Like prisma.config.ts: read .env with Node's own loader; real environment variables win.
if (existsSync(".env")) process.loadEnvFile(".env");

/** Downloads the Pro training exercise library (same file the app uses: src/modules/training-pro/lib/library.ts). */
async function downloadLibrary() {
  const dir = path.join(process.cwd(), "data", "modules", "training-pro");
  const file = path.join(dir, "exercises.json");
  if (existsSync(file)) return "already downloaded";
  const res = await fetch("https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = (await res.json())
    .filter((e) => typeof e.id === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(e.id) && typeof e.name === "string")
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: String(e.category ?? ""),
      level: String(e.level ?? ""),
      equipment: e.equipment ?? null,
      primaryMuscles: e.primaryMuscles ?? [],
      secondaryMuscles: e.secondaryMuscles ?? [],
      instructions: e.instructions ?? [],
      photos: Array.isArray(e.images) ? Math.min(2, e.images.length) : 0,
    }));
  if (list.length < 100) throw new Error("the download looks incomplete");
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(list));
  return `${list.length} exercises`;
}

// Imported only now: a static import would run first and let Prisma read a different .env.
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
try {
  const row = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const on = new Set(row.enabledModules.split(",").map((s) => s.trim()).filter((s) => KNOWN.includes(s)));
  if (action === "status") {
    console.log(on.has(id) ? "on" : "off");
  } else {
    if (action === "enable") on.add(id);
    else on.delete(id);
    await prisma.settings.update({ where: { id: 1 }, data: { enabledModules: [...on].join(",") } });
    console.log(`${id}: ${action === "enable" ? "on" : "off"}`);
    if (action === "enable" && id === "training-pro") {
      try {
        console.log(`Exercise library: ${await downloadLibrary()}`);
      } catch (e) {
        // The module still works; the app downloads the library the first time it's needed.
        console.log(`Exercise library: not downloaded now (${e.message}); the app will try again when you use it.`);
      }
    }
  }
} finally {
  await prisma.$disconnect();
}
