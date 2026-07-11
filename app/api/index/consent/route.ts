export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureIndexInstanceId } from "@/lib/index-protocol";
import { resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request) {
  const body = await req.json();
  const profileId = await resolveRequestProfileId(req, body.profileId);
  const value = body.consent === "on" ? "on" : "off";
  if (value === "on") await ensureIndexInstanceId();
  await db.profileSetting.upsert({ where: { profileId_key: { profileId, key: "INDEX_CONSENT" } }, update: { value }, create: { profileId, key: "INDEX_CONSENT", value } });
  return NextResponse.json({ ok: true, consent: value, endpointConfigured: Boolean(process.env.INDEX_ENDPOINT) });
}
