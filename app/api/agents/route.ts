export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try { return NextResponse.json(await db.agent.findMany({ orderBy: { createdAt: "desc" } })); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (b.id) { const { id, createdAt, ...data } = b; return NextResponse.json(await db.agent.update({ where: { id }, data })); }
    const dupe = await db.agent.findFirst({ where: { name: b.name } });
    if (dupe) return NextResponse.json(dupe);
    try {
      return NextResponse.json(await db.agent.create({ data: b }));
    } catch {
      // Unique constraint hit (concurrent seed race) — the other request won, return its row.
      const winner = await db.agent.findFirst({ where: { name: b.name } });
      if (winner) return NextResponse.json(winner);
      throw new Error("Agent konnte nicht angelegt werden.");
    }
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) await db.agent.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
