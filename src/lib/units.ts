export type WeightUnit = "kg" | "lb";

const LB_PER_KG = 2.2046226218;

export const asUnit = (u: string | null | undefined): WeightUnit => (u === "lb" ? "lb" : "kg");

export function toDisplay(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

export function fromDisplay(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value / LB_PER_KG : value;
}

const CM_PER_IN = 2.54;

/** Height follows the weight unit: inches for lb users, centimetres otherwise. */
export const heightUnit = (unit: WeightUnit): "cm" | "in" => (unit === "lb" ? "in" : "cm");

/** Stored centimetres → the number shown in the height field. */
export function heightToDisplay(cm: number, unit: WeightUnit): number {
  return unit === "lb" ? cm / CM_PER_IN : cm;
}

/** The number typed in the height field → centimetres for storage. */
export function heightFromDisplay(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value * CM_PER_IN : value;
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Parses numbers typed on a phone. iOS shows a comma decimal key in many
 * regions ("91,5"), which Number() would turn into NaN.
 */
export function parseDecimal(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const s = v.trim().replace(/\s/g, "").replace(",", ".");
  return s === "" ? NaN : Number(s);
}

export function fmtWeight(kg: number, unit: WeightUnit, digits = 1): string {
  return `${round(toDisplay(kg, unit), digits)} ${unit}`;
}
