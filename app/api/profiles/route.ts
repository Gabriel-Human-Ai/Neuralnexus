export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { profileScopeErrorResponse } from "@/lib/scope";
import { createProfileForCurrentUser, isProfileType, listProfiles } from "@/lib/profiles";

export async function GET() {
  try {
    return NextResponse.json(await listProfiles());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const type = String(body.type ?? "").trim();
    if (name.length < 1 || name.length > 60) return NextResponse.json({ error: "Invalid profile name" }, { status: 400 });
    if (!isProfileType(type)) return NextResponse.json({ error: "Invalid profile type" }, { status: 400 });

    const profile = await createProfileForCurrentUser({ name, type });
    return NextResponse.json(profile);
  } catch (e: any) {
    const scoped = profileScopeErrorResponse(e);
    if (scoped) return scoped;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
