export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domainTagFromProject, parseClaims, synthesizeWarning } from "@/lib/truth";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { claimId, correctionText } = await req.json();
  const profileId = await resolveRequestProfileId(req);
  const output = await db.output.findUnique({ where: { id: params.id } });
  if (!output) return NextResponse.json({ error: "not_found" }, { status: 404 });
  assertRecordProfile(output.profileId, profileId);
  const claims = parseClaims(output.claimsJson);
  const claim = claims.find((item) => item.id === claimId);
  if (!claim) return NextResponse.json({ error: "invalid_claim_id" }, { status: 400 });
  claim.status = "corrected";
  await db.output.update({ where: { id: output.id }, data: { claimsJson: JSON.stringify(claims) } });
  const project = await db.project.findUnique({ where: { id: output.projectId } });
  await synthesizeWarning({
    projectId: output.projectId,
    profileId,
    outputId: output.id,
    skillId: output.skillId,
    model: output.model,
    provider: output.provider,
    domainHint: domainTagFromProject(project ?? {}, output.stepName),
    claimText: claim.text,
    correctionText: String(correctionText ?? ""),
    source: "manual",
  });
  return NextResponse.json({ claims, recorded: true });
}
