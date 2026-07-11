export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const profileId = await resolveRequestProfileId(req);
  const skill = await db.skill.findUnique({ where: { id: params.id } });
  assertRecordProfile(skill?.profileId, profileId);
  const rules = await db.skillRule.findMany({ where: { profileId, skillId: params.id }, orderBy: { createdAt: "desc" } });
  const outputs = await db.output.findMany({ where: { profileId, id: { in: rules.map((rule) => rule.sourceOutputId).filter(Boolean) as string[] } } });
  return NextResponse.json(rules.map((rule) => {
    const output = outputs.find((item) => item.id === rule.sourceOutputId);
    return { ...rule, provenance: output ? { stepName: output.stepName, createdAt: output.createdAt } : null };
  }));
}
