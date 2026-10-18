import { NextResponse } from "next/server";
import { getProductByBarcode, OpenFoodFactsError } from "@/lib/openfoodfacts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const product = await getProductByBarcode(code);
    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof OpenFoodFactsError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error("barcode lookup failed", err);
    return NextResponse.json({ error: "Lookup failed.", code: "INTERNAL" }, { status: 500 });
  }
}
