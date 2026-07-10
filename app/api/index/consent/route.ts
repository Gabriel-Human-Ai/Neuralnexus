export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureIndexInstanceId } from "@/lib/index-protocol";

export async function POST(req: Request) {
  const body = await req.json();
  const value = body.consent === "on" ? "on" : "off";
  if (value === "on") await ensureIndexInstanceId();
  await db.setting.upsert({ where: { key: "INDEX_CONSENT" }, update: { value }, create: { key: "INDEX_CONSENT", value } });
  return NextResponse.json({ ok: true, consent: value, endpointConfigured: Boolean(process.env.INDEX_ENDPOINT) });
}
