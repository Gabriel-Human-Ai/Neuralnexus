export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json([]);
  const rows = await db.output.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 50 });
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
    createdAt: row.createdAt,
    parentOutputId: row.parentOutputId,
    forkChangedVariable: row.forkChangedVariable,
    preview: (row.finalContent || row.draftContent).slice(0, 200),
    hasQualityReport: Boolean(row.qualityReport),
  })));
}
