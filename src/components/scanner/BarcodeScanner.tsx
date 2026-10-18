"use client";

import { useRef, useState } from "react";
import { decodeBarcodePhoto } from "@/lib/barcode-reader";
import { isPlausibleBarcode, normalizeBarcode } from "@/lib/nutrition";
import CameraView from "./CameraView";
import ManualBarcodeForm from "./ManualBarcodeForm";
import PhotoCapture from "./PhotoCapture";
import { useLiveScanner } from "./useLiveScanner";

/**
 * Camera barcode scanner for iPhone Safari / home-screen PWA.
 *
 * Three ways to get a barcode, from best to most compatible:
 *  1. Live camera (getUserMedia + ZXing). Requires a secure context (HTTPS or localhost).
 *  2. Photo capture: opens the native camera, decodes the still image. Works over plain HTTP.
 *  3. Typing the digits.
 */
export default function BarcodeScanner({ onDetected }: { onDetected: (barcode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [decodingPhoto, setDecodingPhoto] = useState(false);

  /** Accepts the text if it's a product barcode: buzzes and reports it. */
  function accept(raw: string): boolean {
    const code = normalizeBarcode(raw);
    if (!isPlausibleBarcode(code)) return false;
    navigator.vibrate?.(60);
    onDetected(code);
    return true;
  }

  const live = useLiveScanner(videoRef, accept);

  /** For photos and typed digits: accept, and close the live camera if it worked. */
  function acceptOther(raw: string): boolean {
    const ok = accept(raw);
    if (ok) live.stop();
    return ok;
  }

  /** Decodes a still photo of the barcode. */
  async function readPhoto(file: File) {
    setDecodingPhoto(true);
    setMessage(null);
    try {
      const text = await decodeBarcodePhoto(file);
      if (!acceptOther(text)) setMessage(`Read "${text}", which isn't a product barcode.`);
    } catch {
      setMessage("No barcode found in that photo. Fill the frame with the barcode, in good light, and hold steady.");
    } finally {
      setDecodingPhoto(false);
    }
  }

  return (
    <div className="space-y-4">
      {live.supported !== false && (
        <CameraView
          videoRef={videoRef}
          status={live.status}
          error={live.error}
          hasTorch={live.hasTorch}
          torchOn={live.torchOn}
          onToggleTorch={() => void live.toggleTorch()}
          onRetry={() => void live.start()}
        />
      )}
      {live.supported === false && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Live scanning needs HTTPS (see SETUP.md). You can still snap a photo of the barcode below.
        </div>
      )}
      <PhotoCapture busy={decodingPhoto} primary={live.supported === false} onPhoto={(f) => void readPhoto(f)} />
      {message && <p className="text-sm text-red-400">{message}</p>}
      <ManualBarcodeForm onSubmit={(digits) => (acceptOther(digits) ? setMessage(null) : setMessage("Enter the 8–14 digits printed under the barcode."))} />
    </div>
  );
}
