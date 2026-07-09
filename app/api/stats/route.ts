export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [chats, messages, memories] = await Promise.all([
      db.project.count({ where: { archived: false } }),
      db.message.count(),
      db.memory.count(),
    ]);
    return NextResponse.json({ chats, messages, memories });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
