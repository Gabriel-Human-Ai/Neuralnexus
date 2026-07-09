export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const showArchived = new URL(req.url).searchParams.get("archived") === "1";
    const projects = await db.project.findMany({
      where: { archived: showArchived }, orderBy: { createdAt: "desc" },
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    return NextResponse.json(projects);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
    const p = await db.project.create({ data: {
      name: body.name.trim(),
      goal: body.goal ?? "", techStack: body.techStack ?? "", rules: body.rules ?? "",
    }});
    return NextResponse.json(p);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PATCH(req: Request) {
  try {
    const { id, archived, name } = await req.json();
    if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
    const data: any = {};
    if (typeof archived === "boolean") data.archived = archived;
    if (typeof name === "string") data.name = name;
    const p = await db.project.update({ where: { id }, data });
    return NextResponse.json(p);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
