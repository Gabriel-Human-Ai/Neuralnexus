export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getJudgmentConsent, judgmentAssetStats, JUDGMENT_CONSENT_COPY, updateJudgmentConsent } from "@/lib/judgment-layer";
import { resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  const profileId = await resolveRequestProfileId(req);
  return NextResponse.json({
    consent: await getJudgmentConsent(profileId),
    copy: JUDGMENT_CONSENT_COPY,
    asset: await judgmentAssetStats(profileId),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const profileId = await resolveRequestProfileId(req, body.profileId);
  const patch = {
    personal: typeof body.personal === "boolean" ? body.personal : body.consent === "on" ? true : body.consent === "off" ? false : undefined,
    network: typeof body.network === "boolean" ? body.network : undefined,
    research: typeof body.research === "boolean" ? body.research : undefined,
  };
  const consent = await updateJudgmentConsent(profileId, patch);
  return NextResponse.json({
    ok: true,
    consent,
    copy: JUDGMENT_CONSENT_COPY,
    asset: await judgmentAssetStats(profileId),
  });
}
