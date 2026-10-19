// The full exercise library (free-exercise-db by yuhonas, public domain / The Unlicense): ~870
// exercises with how-tos and start/end photos. Downloaded once when the module is switched on and
// kept in data/modules/training-pro/; photos are fetched and cached only when someone views them.
import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { rankExercises } from "./search";

export const LIBRARY_SOURCE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main";
export const LIBRARY_DIR = path.join(process.cwd(), "data", "modules", "training-pro");
const LIBRARY_FILE = path.join(LIBRARY_DIR, "exercises.json");

export interface LibraryExercise {
  id: string;
  name: string;
  category: string;
  level: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  /** Number of photos (0 or 2): served at /api/modules/training-pro/img/<id>/<n>.jpg. */
  photos: number;
}

/** Exercise ids are letters, digits, "_" and "-" (they're also folder names on disk). */
export const isLibraryId = (id: string) => /^[A-Za-z0-9_-]{1,120}$/.test(id);

let cache: LibraryExercise[] | null = null;

/** Downloads the library if it isn't on this PC yet. Throws with a readable message if that fails. */
export async function ensureLibrary(): Promise<number> {
  if (existsSync(LIBRARY_FILE)) return loadLibrary().length;
  const res = await fetch(`${LIBRARY_SOURCE}/dist/exercises.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Couldn't download the exercise library (HTTP ${res.status}).`);
  const raw = (await res.json()) as Array<Record<string, unknown>>;
  const list: LibraryExercise[] = raw
    .filter((e) => typeof e.id === "string" && isLibraryId(e.id) && typeof e.name === "string")
    .map((e) => ({
      id: e.id as string,
      name: e.name as string,
      category: String(e.category ?? ""),
      level: String(e.level ?? ""),
      equipment: (e.equipment as string | null) ?? null,
      primaryMuscles: (e.primaryMuscles as string[]) ?? [],
      secondaryMuscles: (e.secondaryMuscles as string[]) ?? [],
      instructions: (e.instructions as string[]) ?? [],
      photos: Array.isArray(e.images) ? Math.min(2, e.images.length) : 0,
    }));
  if (list.length < 100) throw new Error("The exercise library download looks incomplete.");
  mkdirSync(LIBRARY_DIR, { recursive: true });
  writeFileSync(LIBRARY_FILE, JSON.stringify(list));
  cache = list;
  return list.length;
}

/** The library, or an empty list when it hasn't been downloaded yet. */
export function loadLibrary(): LibraryExercise[] {
  if (cache) return cache;
  if (!existsSync(LIBRARY_FILE)) return [];
  try {
    cache = JSON.parse(readFileSync(LIBRARY_FILE, "utf8")) as LibraryExercise[];
  } catch {
    cache = [];
  }
  return cache;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Finds the library entry for an exercise name you use (exact match, ignoring case and punctuation). */
export function findLibraryExercise(name: string): LibraryExercise | null {
  const key = norm(name);
  return loadLibrary().find((e) => norm(e.name) === key) ?? null;
}

/** Search by words in the name, muscles or equipment (ranking: see rankExercises). */
export function searchLibrary(
  q: string,
  opts: { muscle?: string; equipment?: string; limit?: number; prefer?: Iterable<string> } = {},
): LibraryExercise[] {
  return rankExercises(loadLibrary(), q, opts);
}

/** Photo URLs for a library exercise (served and cached by the module's image route). */
export const libraryPhotos = (e: LibraryExercise) =>
  e.photos >= 2 ? { start: `/api/modules/training-pro/img/${e.id}/0.jpg`, end: `/api/modules/training-pro/img/${e.id}/1.jpg` } : null;
