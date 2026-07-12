export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { recordAmbientActionSignal } from "@/lib/living-profile";
import { profileScopeErrorResponse, resolveRequestProfileId } from "@/lib/scope";

const ACTIONS = new Set(["copy", "regenerate", "edit", "choose", "dismiss"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = await resolveRequestProfileId(req, body.profileId);
    const action = String(body.action ?? "");
    if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown ambient action." }, { status: 400 });

    const result = await recordAmbientActionSignal({
      profileId,
      action: action as "copy" | "regenerate" | "edit" | "choose" | "dismiss",
      subject: typeof body.subject === "string" ? body.subject : "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return profileScopeErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Ambient signal failed." }, { status: 500 });
  }
}
