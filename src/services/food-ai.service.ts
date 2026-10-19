// AI food estimates (POST /api/food/ai) and preparing a photo for it.
import type { AiFoodItem } from "@/lib/food-ai/schema";
import { requestJson } from "./http";

/** Asks the local AI what's in the photo and/or description. Can take 10–30 s, longer the first time. */
export const estimateFood = (input: { text?: string; image?: string }) =>
  requestJson<{ items: AiFoodItem[] }>("/api/food/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

/**
 * Shrinks a camera photo to at most `maxSide` px and returns it as a JPEG data: URL. A 12–48 MP
 * iPhone photo becomes ~100–200 KB: fast over mobile data, and plenty for the model.
 */
export function photoToDataUrl(file: File, maxSide = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that photo."));
    };
    img.src = url;
  });
}
