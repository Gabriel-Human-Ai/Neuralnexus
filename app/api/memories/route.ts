export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  try {
  const profileId = await resolveRequestProfileId(req);
  const projectId = new URL(req.url).searchParams.get("projectId") || undefined;
  const memories = await db.memory.findMany({
    where: projectId ? { profileId, OR: [{ projectId }, { projectId: null }] } : { profileId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(memories);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  const b = await req.json();
  const profileId = await resolveRequestProfileId(req, b.profileId);
  if (!b.content?.trim()) return NextResponse.json({ error: "Inhalt fehlt" }, { status: 400 });
  if (b.projectId) {
    const project = await db.project.findUnique({ where: { id: b.projectId } });
    assertRecordProfile(project?.profileId, profileId);
  }
  const m = await db.memory.create({ data: { profileId, kind: b.kind ?? "note", content: b.content.trim(), projectId: b.projectId ?? null } });
  return NextResponse.json(m);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const profileId = await resolveRequestProfileId(req);
  if (id) {
    const memory = await db.memory.findUnique({ where: { id } });
    assertRecordProfile(memory?.profileId, profileId);
    await db.memory.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
