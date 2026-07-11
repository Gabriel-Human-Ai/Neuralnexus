import { NextResponse } from "next/server";
import { profileScopeErrorResponse, resolveRequestProfileId } from "@/lib/scope";
import { buildProfileSignals } from "@/lib/profile-signals";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    return NextResponse.json(await buildProfileSignals(profileId));
  } catch (error) {
    return profileScopeErrorResponse(error) ?? NextResponse.json({ error: "Unable to read profile" }, { status: 500 });
  }
}

