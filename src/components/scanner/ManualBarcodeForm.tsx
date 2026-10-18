"use client";

import { useState } from "react";
import { Keyboard } from "lucide-react";
import { btnSecondary, input } from "@/lib/ui";

/** Type the digits printed under the barcode. */
export default function ManualBarcodeForm({ onSubmit }: { onSubmit: (digits: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <div className="relative flex-1">
        <Keyboard size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          className={`${input} pl-9`}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Type barcode digits"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <button className={btnSecondary} type="submit">
        Look up
      </button>
    </form>
  );
}
