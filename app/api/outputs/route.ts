export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json([]);
  const profileId = await resolveRequestProfileId(req);
  const project = await db.project.findUnique({ where: { id: projectId } });
  assertRecordProfile(project?.profileId, profileId);
  const rows = await db.output.findMany({ where: { profileId, projectId }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(rows.map((row) => ({
    id: row.id,
    stepName: row.stepName,
    status: row.status,
    model: row.model,
    provider: row.provider,
    costUsd: row.costUsd,
    skillVersion: row.skillVersion,
    finalContent: row.finalContent,
    draftContent: row.draftContent,
    knowledgeIds: row.knowledgeIds,
    qualityReport: row.qualityReport,
    claimsJson: row.claimsJson,
    createdAt: row.createdAt,
    parentOutputId: row.parentOutputId,
    forkChangedVariable: row.forkChangedVariable,
    preview: (row.finalContent || row.draftContent).slice(0, 200),
    hasQualityReport: Boolean(row.qualityReport),
  })));
}
