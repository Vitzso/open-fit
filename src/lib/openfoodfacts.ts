import "server-only";
import { prisma } from "./db";
import { isPlausibleBarcode, normalizeBarcode, type Per100g } from "./nutrition";

/**
 * Open Food Facts product lookup.
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 *
 * Called from the Next.js server (not the phone) so we can send the
 * User-Agent OFF asks for, cache results in SQLite, and keep working for
 * previously-scanned products when the internet is down.
 */

const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "image_front_small_url",
  "image_url",
  "serving_size",
  "serving_quantity",
  "nutriments",
].join(",");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface FoodProductData {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  servingSize: string | null;
  servingQuantityG: number | null;
  per100g: Per100g;
  /** false when OFF has no calorie data — the UI asks the user to fill it in. */
  nutritionComplete: boolean;
  source: "cache" | "openfoodfacts";
}

export type OffErrorCode = "INVALID_BARCODE" | "NOT_FOUND" | "TIMEOUT" | "NETWORK" | "UPSTREAM";

export class OpenFoodFactsError extends Error {
  constructor(
    message: string,
    public readonly code: OffErrorCode,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = "OpenFoodFactsError";
  }
}

type Nutriments = Record<string, number | string | undefined>;

interface OffResponse {
  status?: number;
  status_verbose?: string;
  product?: {
    code?: string;
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    brands?: string;
    image_front_small_url?: string;
    image_url?: string;
    serving_size?: string;
    serving_quantity?: number | string;
    nutriments?: Nutriments;
  };
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function parsePer100g(n: Nutriments = {}): { per100g: Per100g; complete: boolean } {
  // Prefer explicit kcal; fall back to kJ (energy_100g is kJ in OFF).
  const kcal = num(n["energy-kcal_100g"]) ?? (num(n["energy_100g"]) ?? NaN) / 4.184;
  const protein = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);
  return {
    per100g: {
      kcal: Number.isFinite(kcal) ? Math.round(kcal) : 0,
      protein: protein ?? 0,
      carbs: carbs ?? 0,
      fat: fat ?? 0,
    },
    complete: Number.isFinite(kcal) && protein !== null && carbs !== null && fat !== null,
  };
}

/** Raw network lookup against Open Food Facts (no cache). */
export async function fetchProductFromOFF(
  rawBarcode: string,
  { timeoutMs = 8000 }: { timeoutMs?: number } = {},
): Promise<FoodProductData> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!isPlausibleBarcode(barcode)) {
    throw new OpenFoodFactsError("Barcode must be 8–14 digits.", "INVALID_BARCODE", 400);
  }

  let res: Response;
  try {
    res = await fetch(`${OFF_PRODUCT_URL}/${barcode}.json?fields=${FIELDS}`, {
      headers: {
        "User-Agent": process.env.OFF_USER_AGENT || "OpenFit/0.1 (self-hosted personal tracker)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new OpenFoodFactsError("Open Food Facts took too long to respond.", "TIMEOUT", 504);
    }
    throw new OpenFoodFactsError(
      "Could not reach Open Food Facts. Is the PC connected to the internet?",
      "NETWORK",
      502,
    );
  }

  // OFF answers unknown products with HTTP 404 + { status: 0 }.
  if (res.status === 404) {
    throw new OpenFoodFactsError(`No product found for barcode ${barcode}.`, "NOT_FOUND", 404);
  }
  if (!res.ok) {
    throw new OpenFoodFactsError(`Open Food Facts returned HTTP ${res.status}.`, "UPSTREAM", 502);
  }

  let data: OffResponse;
  try {
    data = (await res.json()) as OffResponse;
  } catch {
    throw new OpenFoodFactsError("Open Food Facts sent an unreadable response.", "UPSTREAM", 502);
  }
  if (data.status !== 1 || !data.product) {
    throw new OpenFoodFactsError(`No product found for barcode ${barcode}.`, "NOT_FOUND", 404);
  }

  const p = data.product;
  const { per100g, complete } = parsePer100g(p.nutriments);
  return {
    barcode,
    name: (p.product_name || p.product_name_en || p.generic_name || "Unnamed product").trim(),
    brand: p.brands?.split(",")[0]?.trim() || null,
    // Third-party data: only accept https image URLs.
    imageUrl: [p.image_front_small_url, p.image_url].find((u) => u?.startsWith("https://")) ?? null,
    servingSize: p.serving_size || null,
    servingQuantityG: num(p.serving_quantity),
    per100g,
    nutritionComplete: complete,
    source: "openfoodfacts",
  };
}

/**
 * Cached lookup: SQLite first (30-day TTL), then Open Food Facts.
 * If OFF is unreachable but a stale cache entry exists, the stale entry is returned.
 */
export async function getProductByBarcode(rawBarcode: string): Promise<FoodProductData> {
  const barcode = normalizeBarcode(rawBarcode);
  const cached = await prisma.foodProduct.findUnique({ where: { barcode } });
  const fromCache = (c: NonNullable<typeof cached>): FoodProductData => ({
    barcode: c.barcode,
    name: c.name,
    brand: c.brand,
    imageUrl: c.imageUrl,
    servingSize: c.servingSize,
    servingQuantityG: c.servingQuantityG,
    per100g: { kcal: c.kcal100g, protein: c.protein100g, carbs: c.carbs100g, fat: c.fat100g },
    nutritionComplete: c.nutritionComplete,
    source: "cache",
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) return fromCache(cached);

  try {
    const product = await fetchProductFromOFF(barcode);
    const row = {
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      servingSize: product.servingSize,
      servingQuantityG: product.servingQuantityG,
      kcal100g: product.per100g.kcal,
      protein100g: product.per100g.protein,
      carbs100g: product.per100g.carbs,
      fat100g: product.per100g.fat,
      nutritionComplete: product.nutritionComplete,
      fetchedAt: new Date(),
    };
    await prisma.foodProduct.upsert({ where: { barcode }, update: row, create: { barcode, ...row } });
    return product;
  } catch (err) {
    const transient =
      err instanceof OpenFoodFactsError && ["TIMEOUT", "NETWORK", "UPSTREAM"].includes(err.code);
    if (cached && transient) return fromCache(cached);
    throw err;
  }
}
