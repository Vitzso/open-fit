"use client";

import { useState } from "react";
import { LoaderCircle, ScanBarcode } from "lucide-react";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import FoodEntryForm from "@/components/food/FoodEntryForm";
import type { Meal } from "@/lib/nutrition";
import type { FoodProductData } from "@/lib/openfoodfacts";
import { btnSecondary } from "@/lib/ui";
import { lookupBarcode } from "@/services/food.service";

type State =
  | { step: "scan" }
  | { step: "loading"; barcode: string }
  | { step: "found"; product: FoodProductData }
  | { step: "error"; barcode: string; message: string; notFound: boolean };

export default function ScanFlow({ defaultMeal, day }: { defaultMeal: Meal; day?: string }) {
  const [state, setState] = useState<State>({ step: "scan" });

  async function lookup(barcode: string) {
    setState({ step: "loading", barcode });
    const r = await lookupBarcode(barcode);
    if (r.ok) setState({ step: "found", product: r.data.product });
    else setState({ step: "error", barcode, message: r.error, notFound: r.status === 404 });
  }

  const rescan = (
    <button className={`${btnSecondary} w-full`} onClick={() => setState({ step: "scan" })}>
      <ScanBarcode size={18} /> Scan another
    </button>
  );

  switch (state.step) {
    case "scan":
      return <BarcodeScanner onDetected={lookup} />;
    case "loading":
      return (
        <div className="flex items-center justify-center gap-2 py-16 text-muted">
          <LoaderCircle className="animate-spin" /> Looking up {state.barcode}…
        </div>
      );
    case "found":
      return (
        <div className="space-y-3">
          <FoodEntryForm product={state.product} defaultMeal={defaultMeal} day={day} />
          {rescan}
        </div>
      );
    case "error":
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {state.message}
            {state.notFound && " You can add it manually below (and contribute it to openfoodfacts.org)."}
          </div>
          <FoodEntryForm barcode={state.barcode} defaultMeal={defaultMeal} day={day} />
          {rescan}
        </div>
      );
  }
}
