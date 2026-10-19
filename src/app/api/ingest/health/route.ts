import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateWeight } from "@/actions/revalidate";
import { prisma } from "@/lib/db";
import { dayKey, isDayKey } from "@/lib/dates";
import { writeWeight } from "@/lib/log/writes";
import { verifyBearer } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/** Shortcuts sends numbers as text ("79,4" on some iPhones); empty means "not sent". */
const optNum = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : typeof v === "string" ? Number(v.replace(",", ".")) : v), z.number().finite().min(0).max(max).optional());

const Body = z.object({
  /** The day (YYYY-MM-DD, or anything starting with it); today when left out. */
  date: z.preprocess((v) => (typeof v === "string" ? v.slice(0, 10) : v), z.string().refine(isDayKey).optional()),
  weight: optNum(1500),
  /** The unit Apple Health gave the weight in. */
  weightUnit: z.preprocess((v) => (typeof v === "string" ? v.toLowerCase().replace(/s$/, "").replace("pound", "lb").replace("kilogram", "kg") : v), z.enum(["kg", "lb"]).default("kg")),
  steps: optNum(200_000),
  activeKcal: optNum(20_000),
});

/**
 * Data from Apple Health, sent by an iPhone Shortcut with "Authorization: Bearer <device token>"
 * (Settings → Apple Health). Weight becomes the day's weigh-in; steps and active energy are kept
 * per day. Not behind the passcode cookie: the token is the key.
 */
export async function POST(req: Request) {
  const token = await verifyBearer(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "Missing or revoked device token." }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  const { weight, weightUnit, steps, activeKcal } = body.data;
  const day = body.data.date ?? dayKey();
  if (day > dayKey()) return NextResponse.json({ error: "The date is in the future." }, { status: 400 });

  const saved: string[] = [];
  if (weight && weight > 0) {
    await writeWeight({ weight, unit: weightUnit, day });
    revalidateWeight();
    saved.push("weight");
  }
  if (steps !== undefined || activeKcal !== undefined) {
    const data = { ...(steps !== undefined ? { steps: Math.round(steps) } : {}), ...(activeKcal !== undefined ? { activeKcal } : {}) };
    await prisma.dailyActivity.upsert({ where: { day }, update: data, create: { day, ...data } });
    saved.push(...Object.keys(data));
  }
  return NextResponse.json({ ok: true, day, saved });
}
