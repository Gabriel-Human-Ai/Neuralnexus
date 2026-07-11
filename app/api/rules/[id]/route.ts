export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { action } = await req.json();
  const profileId = await resolveRequestProfileId(req);
  const rule = await db.skillRule.findUnique({ where: { id: params.id } });
  if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });
  assertRecordProfile(rule.profileId, profileId);
  if (action === "accept") {
    await db.skillRule.update({ where: { id: params.id }, data: { status: "active" } });
    await db.skill.update({ where: { id: rule.skillId }, data: { version: { increment: 1 } } });
    return NextResponse.json({ ok: true });
  }
  if (action === "reject") {
    await db.skillRule.update({ where: { id: params.id }, data: { status: "rejected" } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const profileId = await resolveRequestProfileId(req);
  const rule = await db.skillRule.findUnique({ where: { id: params.id } });
  if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });
  assertRecordProfile(rule.profileId, profileId);
  if (!["active", "proposed"].includes(rule.status)) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  await db.skillRule.update({ where: { id: params.id }, data: { status: "rejected" } });
  return NextResponse.json({ ok: true });
}
