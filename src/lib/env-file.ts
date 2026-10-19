// Reads and updates OpenFit's .env file from the server, in the same format the launcher
// scripts write (KEY="value", UTF-8 without a byte-order mark, other lines untouched).
import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const envPath = () => path.join(process.cwd(), ".env");

/** Undoes the escaping Set-EnvValue (and setEnvValues) applies inside double quotes. */
const unquote = (v: string) => {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\(["\\])/g, "$1");
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
  return t;
};

/**
 * The current values in .env, read fresh from disk (so a change made in Settings shows up
 * straight away, while process.env keeps what the server started with).
 */
export function readEnvFile(): Record<string, string> {
  if (!existsSync(envPath())) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(envPath(), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    // Like Next.js and Prisma, the last occurrence of a key wins.
    if (m) out[m[1]] = unquote(m[2]);
  }
  return out;
}

/**
 * Sets KEY="value" for each entry, replacing existing lines or appending new ones.
 * Values must already be validated: this refuses anything with a newline or a quote.
 */
export function setEnvValues(values: Record<string, string>) {
  for (const [k, v] of Object.entries(values)) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(k) || /[\r\n"\\]/.test(v)) throw new Error(`Refusing to write ${k} to .env.`);
  }
  const text = existsSync(envPath()) ? readFileSync(envPath(), "utf8").replace(/^\uFEFF/, "") : "";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.length ? text.replace(/\r?\n$/, "").split(/\r?\n/) : [];
  const pending = new Map(Object.entries(values));
  const updated = lines.map((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m && pending.has(m[1])) return `${m[1]}="${pending.get(m[1])}"`;
    return line;
  });
  for (const [k, v] of pending) if (!lines.some((l) => new RegExp(`^\\s*${k}\\s*=`).test(l))) updated.push(`${k}="${v}"`);
  writeFileSync(envPath(), updated.join(eol) + eol, "utf8");
}
