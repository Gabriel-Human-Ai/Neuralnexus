export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { toContribution } from "@/lib/index-protocol";
import { resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    return NextResponse.json(await toContribution(profileId));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Could not prepare Index payload." }, { status: 500 });
  }
}
