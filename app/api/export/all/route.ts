export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    const projects = await db.project.findMany({
      where: { profileId },
      include: { messages: { orderBy: { createdAt: "asc" } }, memories: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ exportedAt: new Date().toISOString(), profileId, projects });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
