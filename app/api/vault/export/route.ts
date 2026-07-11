export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  const profileId = await resolveRequestProfileId(req);
  const profile = await db.profile.findUnique({ where: { id: profileId } });
  const [skillRules, tasteRules, correctionRecords, decisionRecords, modelPolicies] = await Promise.all([
    db.skillRule.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }),
    db.tasteRule.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }),
    db.correctionRecord.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }),
    db.decisionRecord.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }),
    db.modelPolicy.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ exportedAt: new Date().toISOString(), profile: profile ? { id: profile.id, name: profile.name, type: profile.type } : null, skillRules, tasteRules, correctionRecords, decisionRecords, modelPolicies });
}
