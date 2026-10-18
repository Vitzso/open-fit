/** Local calendar date as "YYYY-MM-DD". */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysAgoKey(n: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

/** The last `n` day keys, oldest first, ending today. */
export function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgoKey(n - 1 - i));
}

/** First day of the calendar week: 0 = Sunday, 1 = Monday. */
export const WEEK_START = 0;

/** The 7 day keys of the current calendar week, starting on WEEK_START (includes days still to come). */
export function currentWeek(from: Date = new Date()): string[] {
  const start = new Date(from);
  start.setDate(start.getDate() - ((start.getDay() - WEEK_START + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return dayKey(d);
  });
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDay(key: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return parseDayKey(key).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...opts,
  });
}

export const isDayKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** A `?day=` query value if it's a valid date before today; otherwise undefined (meaning today). */
export function pastDayParam(q: string | undefined): string | undefined {
  return q && isDayKey(q) && q < dayKey() ? q : undefined;
}
