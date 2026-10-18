import { ImageUp, LoaderCircle } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

/** "Take a photo of the barcode": opens the native camera. Works over plain HTTP too. */
export default function PhotoCapture({ busy, primary, onPhoto }: { busy: boolean; primary: boolean; onPhoto: (file: File) => void }) {
  return (
    <label className={`${primary ? btnPrimary : btnSecondary} w-full cursor-pointer`}>
      {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ImageUp size={18} />}
      {busy ? "Reading photo…" : "Take a photo of the barcode"}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // allow picking the same photo again
          if (f) onPhoto(f);
        }}
      />
    </label>
  );
}
