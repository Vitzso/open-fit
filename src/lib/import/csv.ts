// A small CSV reader: quoted fields, commas and newlines inside quotes, "" escapes, a BOM, and
// ";" or tab separators (some apps use ";" in European locales). Pure.

/** Splits CSV text into rows of fields. The separator is guessed from the header line. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n/) === -1 ? src.length : src.search(/\r?\n/));
  const count = (c: string) => firstLine.split(c).length;
  const sep = count(";") > count(",") && count(";") > count("\t") ? ";" : count("\t") > count(",") ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Rows as objects keyed by the (trimmed, lower-case) header names. */
export function csvObjects(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

/** "1,5" or "1.5" or "" → number (NaN when empty or not a number). */
export const num = (s: string | undefined) => (s == null || s.trim() === "" ? NaN : Number(s.trim().replace(",", ".")));
