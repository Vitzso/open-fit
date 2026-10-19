// Device tokens: let an iPhone Shortcut send data without the passcode cookie. The token is shown
// once; only its SHA-256 hash is stored, and each one can be revoked on its own.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Makes a new token. Returns the token itself (show it once) and its row. */
export async function createToken(name: string) {
  const token = `of_${randomBytes(24).toString("base64url")}`;
  const row = await prisma.apiToken.create({ data: { name: name.trim().slice(0, 60) || "iPhone Shortcut", tokenHash: hash(token) } });
  return { token, row };
}

/** The token row for an "Authorization: Bearer of_…" header, or null. Records when it was used. */
export async function verifyBearer(header: string | null) {
  const token = header?.match(/^Bearer\s+(of_[A-Za-z0-9_-]{20,80})$/)?.[1];
  if (!token) return null;
  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hash(token) } });
  if (row) await prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  return row;
}
