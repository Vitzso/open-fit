import type { Per100g } from "@/lib/nutrition";
import type { FoodProductData } from "@/lib/openfoodfacts";
import { card } from "@/lib/ui";

/** The scanned product: photo, name, brand and per-100 g values. */
export default function ProductSummary({ product, per100g }: { product: FoodProductData; per100g: Per100g }) {
  return (
    <div className={`${card} flex gap-3`}>
      {product.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain" />
      )}
      <div className="min-w-0">
        <p className="font-semibold leading-tight">{product.name}</p>
        {product.brand && <p className="text-sm text-muted">{product.brand}</p>}
        <p className="mt-1 text-xs text-muted">
          per 100 g: {per100g.kcal} kcal · P {per100g.protein} · C {per100g.carbs} · F {per100g.fat}
          {product.servingSize && ` · serving ${product.servingSize}`}
        </p>
      </div>
    </div>
  );
}
