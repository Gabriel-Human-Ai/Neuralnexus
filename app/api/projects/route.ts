export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";
import { setProfileSetting } from "@/lib/settings";

export async function GET(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    const showArchived = new URL(req.url).searchParams.get("archived") === "1";
    const projects = await db.project.findMany({
      where: { profileId, archived: showArchived }, orderBy: { createdAt: "desc" },
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    return NextResponse.json(projects);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = await resolveRequestProfileId(req, body.profileId);
    if (!body.name?.trim()) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
    const p = await db.project.create({ data: {
      profileId,
      name: body.name.trim(),
      goal: body.goal ?? "", techStack: body.techStack ?? "", rules: body.rules ?? "",
    }});
    if (Array.isArray(body.steps)) {
      await setProfileSetting(profileId, `WORKSPACE_STEPS_${p.id}`, JSON.stringify(body.steps.slice(0, 8)));
    }
    return NextResponse.json(p);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PATCH(req: Request) {
  try {
    const { id, archived, name } = await req.json();
    const profileId = await resolveRequestProfileId(req);
    if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
    const existing = await db.project.findUnique({ where: { id } });
    assertRecordProfile(existing?.profileId, profileId);
    const data: any = {};
    if (typeof archived === "boolean") data.archived = archived;
    if (typeof name === "string") data.name = name;
    const p = await db.project.update({ where: { id }, data });
    return NextResponse.json(p);
  } catch (e: any) { return NextResponse.json({ error: e.name === "ProfileScopeError" ? "Not found" : e.message }, { status: e.name === "ProfileScopeError" ? 404 : 500 }); }
}
