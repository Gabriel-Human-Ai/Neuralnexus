export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
  const projectId = new URL(req.url).searchParams.get("projectId") || undefined;
  const memories = await db.memory.findMany({
    where: projectId ? { OR: [{ projectId }, { projectId: null }] } : {},
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(memories);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.content?.trim()) return NextResponse.json({ error: "Inhalt fehlt" }, { status: 400 });
  const m = await db.memory.create({ data: { kind: b.kind ?? "note", content: b.content.trim(), projectId: b.projectId ?? null } });
  return NextResponse.json(m);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) await db.memory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
