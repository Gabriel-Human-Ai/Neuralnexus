export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      include: { messages: { orderBy: { createdAt: "asc" } }, memories: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ exportedAt: new Date().toISOString(), projects });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
