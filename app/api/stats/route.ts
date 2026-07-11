export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    const [chats, messages, memories] = await Promise.all([
      db.project.count({ where: { profileId, archived: false } }),
      db.message.count({ where: { profileId } }),
      db.memory.count({ where: { profileId } }),
    ]);
    return NextResponse.json({ chats, messages, memories });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
