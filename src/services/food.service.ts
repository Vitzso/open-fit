// Food lookups (Open Food Facts, cached on the PC).
import type { FoodProductData } from "@/lib/openfoodfacts";
import { requestJson } from "./http";

/** Looks up a product by barcode; status 404 means Open Food Facts doesn't know it. */
export const lookupBarcode = (barcode: string) =>
  requestJson<{ product: FoodProductData }>(`/api/food/barcode/${encodeURIComponent(barcode)}`);
