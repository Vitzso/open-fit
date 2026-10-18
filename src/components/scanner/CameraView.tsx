import { Camera, Flashlight, LoaderCircle } from "lucide-react";
import { btnSecondary } from "@/lib/ui";
import type { ScanStatus } from "./useLiveScanner";

/** The live camera feed with its overlays: aiming frame, "starting", torch button, or error + retry. */
export default function CameraView({
  videoRef,
  status,
  error,
  hasTorch,
  torchOn,
  onToggleTorch,
  onRetry,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: ScanStatus;
  error: string | null;
  hasTorch: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
      {status === "scanning" && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-[10%] top-[30%] bottom-[30%] rounded-xl border-2 border-plate-green/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            <div className="animate-scanline absolute inset-x-2 h-0.5 bg-plate-green shadow-[0_0_12px_2px_rgba(52,211,153,0.8)]" />
          </div>
          <p className="absolute inset-x-0 bottom-6 text-center text-sm text-fg">Point at the barcode</p>
        </div>
      )}
      {status === "starting" && (
        <div className="absolute inset-0 flex items-center justify-center text-fg">
          <LoaderCircle className="animate-spin" /> <span className="ml-2">Starting camera…</span>
        </div>
      )}
      {status === "scanning" && hasTorch && (
        <button
          type="button"
          onClick={onToggleTorch}
          className={`absolute top-3 right-3 rounded-full p-3 ${torchOn ? "bg-amber-300 text-ink" : "bg-surface/80 text-fg"}`}
          aria-label="Toggle flashlight"
        >
          <Flashlight size={20} />
        </button>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-fg">{error}</p>
          <button type="button" className={btnSecondary} onClick={onRetry}>
            <Camera size={18} /> Try again
          </button>
        </div>
      )}
    </div>
  );
}
