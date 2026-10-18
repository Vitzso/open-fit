// ZXing barcode decoding for food packs (browser only; ZXing loads on first use).
import type { BrowserMultiFormatReader } from "@zxing/browser";

/** Creates a reader limited to product barcode formats. `tryHarder` is slower but better for still photos. */
export async function createBarcodeReader(tryHarder: boolean): Promise<BrowserMultiFormatReader> {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map<unknown, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.ITF]],
  ]);
  if (tryHarder) hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints as never, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 500 });
}

/** Loads an image file into an <img> element. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/** Draws the image onto a canvas no larger than `maxSide` pixels on its long edge. */
function downscale(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Reads the barcode text from a photo. Throws if none is found. */
export async function decodeBarcodePhoto(file: File): Promise<string> {
  // Full-res iPhone photos (12–48 MP) are slow and *less* reliable to decode; downscale.
  const canvas = downscale(await loadImage(file), 1600);
  const reader = await createBarcodeReader(true);
  return reader.decodeFromCanvas(canvas).getText();
}

/** Plain-language explanation of a getUserMedia failure, with what to do about it. */
export function describeCameraError(e: unknown): string {
  const name = (e as Error)?.name;
  switch (name) {
    case "NotAllowedError":
      return "Camera access was denied. On iPhone: Settings → Safari → Camera → Allow (or Ask), then reload. You can also use the photo option below.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No usable camera was found on this device.";
    case "NotReadableError":
    case "AbortError":
      return "The camera is busy in another app or tab. Close it and try again.";
    case "SecurityError":
      return "Camera blocked: this page isn't on a secure (HTTPS) origin.";
    default:
      return `Couldn't start the camera${name ? ` (${name})` : ""}.`;
  }
}
