// Pro training: an optional module (Settings → Modules). Everything it adds lives in this folder;
// core screens only show its pieces while it's switched on.
import type { ModuleManifest } from "@/lib/modules/types";

export const trainingPro: ModuleManifest = {
  id: "training-pro",
  name: "Pro training",
  description: "For lifters who want more than the basics.",
  features: [
    "Full exercise library: about 870 exercises with photos and how-tos (downloaded when you switch this on)",
    "Personal records: a celebration when you beat your best",
    "Plate and warm-up calculator next to the weight",
    "Warm-up and drop sets (warm-ups don't count for records)",
    "Build your own programs next to the ready-made ones",
  ],
};
