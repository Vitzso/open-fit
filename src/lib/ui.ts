// Shared Tailwind class strings so screens stay consistent.
// Colours are the bumper-plate tokens from globals.css.

/** A raised surface. Use for the few things that deserve weight; lists sit on the page. */
export const card = "rounded-[var(--radius-card)] bg-surface p-4";
/** Rows in a plain list (no box around each item). */
export const listRow = "flex items-center gap-3 py-3";

export const input =
  "h-12 w-full rounded-xl bg-raised px-3.5 text-fg placeholder:text-faint outline-none ring-1 ring-transparent transition focus:ring-plate-white/60";
/** Field label: sentence case, readable at arm's length. */
export const label = "mb-1.5 block text-sm font-medium text-muted";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";
/** Main action on a screen: the white plate. */
export const btnPrimary = `${btn} h-12 bg-plate-white px-5 text-ink active:bg-white/80`;
export const btnSecondary = `${btn} h-12 bg-raised px-5 text-fg active:bg-line`;
export const btnSmall = `${btn} h-9 bg-raised px-3.5 text-sm text-fg active:bg-line`;
/** 44×44 tap target for icon-only buttons. */
export const btnIcon =
  "inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition active:bg-raised active:text-fg";

/** Section colours (see globals.css). */
export type Section = "today" | "train" | "food" | "weight" | "coach";
export const SECTION_COLOR: Record<Section, string> = {
  today: "var(--color-plate-white)",
  train: "var(--color-plate-blue)",
  food: "var(--color-plate-green)",
  weight: "var(--color-plate-yellow)",
  coach: "var(--color-plate-red)",
};
