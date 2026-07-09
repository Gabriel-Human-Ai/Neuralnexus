export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { action } = await req.json();
  const rule = await db.skillRule.findUnique({ where: { id: params.id } });
  if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });
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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const rule = await db.skillRule.findUnique({ where: { id: params.id } });
  if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["active", "proposed"].includes(rule.status)) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  await db.skillRule.update({ where: { id: params.id }, data: { status: "rejected" } });
  return NextResponse.json({ ok: true });
}
