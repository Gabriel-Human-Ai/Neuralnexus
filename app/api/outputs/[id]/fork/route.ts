export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runWorkspaceStep } from "@/lib/output-runner";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { change } = await req.json();
  if (!change || !["model", "skill"].includes(change.type)) return NextResponse.json({ error: "invalid_change" }, { status: 400 });
  const parent = await db.output.findUnique({ where: { id: params.id } });
  if (!parent) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const children = await db.output.count({ where: { parentOutputId: parent.id } });
  if (children >= 5) return NextResponse.json({ error: "fork_limit" }, { status: 400 });
  const report = parent.qualityReport ? JSON.parse(parent.qualityReport) : null;
  const result = await runWorkspaceStep({
    projectId: parent.projectId,
    stepName: parent.stepName,
    stepDescription: parent.stepName,
    userInput: parent.prompt,
    skillId: change.type === "skill" ? change.value : parent.skillId ?? undefined,
    model: change.type === "model" ? change.value : parent.model,
    checklist: report?.checks?.map((check: any) => check.check) ?? [],
    parentOutputId: parent.id,
    forkChangedVariable: change.type,
  });
  return NextResponse.json({ outputId: result.output.id, content: result.content, model: result.model, provider: result.provider, costUsd: result.costUsd, qualityReport: result.qualityReport });
}
