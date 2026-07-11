export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    return NextResponse.json(await db.workflow.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }));
  }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const profileId = await resolveRequestProfileId(req, b.profileId);
    if (b.id) {
      const existing = await db.workflow.findUnique({ where: { id: b.id } });
      assertRecordProfile(existing?.profileId, profileId);
      const { id, createdAt, profileId: _profileId, ...data } = b;
      return NextResponse.json(await db.workflow.update({ where: { id }, data }));
    }
    return NextResponse.json(await db.workflow.create({ data: { ...b, profileId } }));
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const profileId = await resolveRequestProfileId(req);
  if (id) {
    const existing = await db.workflow.findUnique({ where: { id } });
    assertRecordProfile(existing?.profileId, profileId);
    await db.workflow.delete({ where: { id } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
