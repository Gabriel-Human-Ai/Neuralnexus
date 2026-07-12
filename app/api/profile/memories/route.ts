export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AMBIENT_CONSENT_KEY, LEARNING_PAUSED_KEY, clearLivingProfile, listLivingProfileMemories, removeLivingProfileMemory, updateLivingProfileMemory } from "@/lib/living-profile";
import { PROFILE_DIMENSIONS, type ProfileDimension } from "@/lib/profile-signals";
import { getProfileSetting, setProfileSetting } from "@/lib/settings";
import { profileScopeErrorResponse, resolveRequestProfileId } from "@/lib/scope";

function labelForConfidence(confidence: number) {
  if (confidence >= 4) return "strong";
  if (confidence >= 2) return "steady";
  return "new";
}

function isDimension(value: string): value is ProfileDimension {
  return PROFILE_DIMENSIONS.includes(value as ProfileDimension);
}

export async function GET(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    const [rows, paused, consent] = await Promise.all([
      listLivingProfileMemories(profileId),
      getProfileSetting(profileId, LEARNING_PAUSED_KEY),
      getProfileSetting(profileId, AMBIENT_CONSENT_KEY),
    ]);
    const dimensions = PROFILE_DIMENSIONS.reduce((result, dimension) => {
      result[dimension] = [];
      return result;
    }, {} as Record<ProfileDimension, any[]>);

    for (const row of rows) {
      const dimension = isDimension(row.contextTag) ? row.contextTag : "answer_style";
      dimensions[dimension].push({
        id: row.id,
        insight: row.chosenDesc,
        evidence: row.evidence || "This pattern appeared in your recent chats.",
        confidence: labelForConfidence(row.confidence),
        updatedAt: row.updatedAt,
      });
    }

    return NextResponse.json({ paused: paused === "true", consented: consent === "true", dimensions, total: rows.length });
  } catch (error) {
    return profileScopeErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Profile memories unavailable." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const profileId = await resolveRequestProfileId(req, body.profileId);

    if (body.action === "pause") {
      await setProfileSetting(profileId, LEARNING_PAUSED_KEY, body.paused ? "true" : "");
      return NextResponse.json({ ok: true, paused: Boolean(body.paused) });
    }

    if (body.action === "consent") {
      await setProfileSetting(profileId, AMBIENT_CONSENT_KEY, body.consented ? "true" : "");
      return NextResponse.json({ ok: true, consented: Boolean(body.consented) });
    }

    if (body.action === "remove" && body.id) {
      await removeLivingProfileMemory(profileId, String(body.id));
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update" && body.id && body.insight) {
      const insight = String(body.insight).replace(/\s+/g, " ").trim();
      if (insight.length < 6) return NextResponse.json({ error: "Profile memory is too short." }, { status: 400 });
      await updateLivingProfileMemory(profileId, String(body.id), insight);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "clear") {
      await clearLivingProfile(profileId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown profile action." }, { status: 400 });
  } catch (error) {
    return profileScopeErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Profile update failed." }, { status: 500 });
  }
}
