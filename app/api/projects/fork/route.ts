export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    const profileId = await resolveRequestProfileId(req);
    const source = await db.project.findUnique({ where: { id }, include: { messages: true, memories: true } });
    if (!source) return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    assertRecordProfile(source.profileId, profileId);

    const copy = await db.project.create({ data: {
      profileId,
      name: `${source.name} (Kopie)`, goal: source.goal, techStack: source.techStack, rules: source.rules,
    }});
    if (source.messages.length) {
      await db.message.createMany({ data: source.messages.map(m => ({ profileId, projectId: copy.id, role: m.role, content: m.content, model: m.model })) });
    }
    if (source.memories.length) {
      await db.memory.createMany({ data: source.memories.filter((m) => m.profileId === profileId).map(m => ({ profileId, projectId: copy.id, kind: m.kind, content: m.content })) });
    }
    return NextResponse.json(copy);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
