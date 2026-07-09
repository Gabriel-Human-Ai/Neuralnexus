export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try { return NextResponse.json(await db.skill.findMany({ orderBy: { createdAt: "desc" } })); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (b.id) { const { id, createdAt, ...data } = b; return NextResponse.json(await db.skill.update({ where: { id }, data })); }
    const dupe = await db.skill.findFirst({ where: { name: b.name } });
    if (dupe) return NextResponse.json(dupe);
    return NextResponse.json(await db.skill.create({ data: b }));
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) await db.skill.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
