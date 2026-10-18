// Small display formatters shared by screens.

/** Time-of-day greeting. */
export function greeting(hour = new Date().getHours()): string {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Whole number with thousands separators: 1834.6 → "1,835". */
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Signed number: 0.4 → "+0.4", -0.4 → "-0.4". */
export const fmtSigned = (n: number) => `${n > 0 ? "+" : ""}${n}`;
