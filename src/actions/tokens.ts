"use server";
// Device tokens for the Apple Health Shortcut (Settings → Apple Health).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/tokens";

/** Makes a token and returns it (shown once). */
export async function createDeviceToken(name: string): Promise<{ token: string }> {
  const { token } = await createToken(z.string().max(60).parse(name));
  revalidatePath("/settings/health");
  return { token };
}

/** Revokes a token: the Shortcut using it stops working straight away. */
export async function revokeDeviceToken(id: number) {
  await prisma.apiToken.deleteMany({ where: { id: z.number().int().positive().parse(id) } });
  revalidatePath("/settings/health");
}
