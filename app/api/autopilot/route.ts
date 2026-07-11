export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pickMetaModel } from "@/lib/meta-model";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ recommendations: [], policies: [] });
  const profileId = await resolveRequestProfileId(req);
  const project = await db.project.findUnique({ where: { id: projectId } });
  assertRecordProfile(project?.profileId, profileId);
  if (!(await pickMetaModel())) return NextResponse.json({ disabled: true, message: "Autopilot needs a connected model.", recommendations: [], policies: [] });
  const [runs, policies, userRuns] = await Promise.all([
    db.benchmarkRun.findMany({ where: { profileId, projectId }, orderBy: { createdAt: "desc" } }),
    db.modelPolicy.findMany({ where: { profileId, projectId }, orderBy: { createdAt: "desc" } }),
    db.modelRun.findMany({ where: { profileId, projectId, purpose: "user", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
  ]);
  const groups = new Map<string, typeof runs>();
  for (const run of runs) {
    const key = `${run.stepName}|||${run.challengerModel}`;
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }
  const recommendations = Array.from(groups.values()).flatMap((items) => {
    const runsCount = items.length;
    const avgScore = items.reduce((sum, item) => sum + item.similarityScore, 0) / Math.max(1, runsCount);
    if (runsCount < 3 || avgScore < 8) return [];
    const latest = items[0];
    if (policies.some((policy) => policy.stepName === latest.stepName && policy.model === latest.challengerModel)) return [];
    const avgPrimary = items.reduce((sum, item) => sum + item.primaryCostUsd, 0) / runsCount;
    const avgChallenger = items.reduce((sum, item) => sum + item.challengerCostUsd, 0) / runsCount;
    const scoreRows = items.slice(0, 8).reverse();
    return [{
      stepName: latest.stepName,
      fromModel: latest.primaryModel,
      toModel: latest.challengerModel,
      runs: runsCount,
      avgScore: Number(avgScore.toFixed(1)),
      scores: scoreRows.map((item) => item.similarityScore),
      avgPrimaryCostUsd: Number(avgPrimary.toFixed(6)),
      avgChallengerCostUsd: Number(avgChallenger.toFixed(6)),
      projectedMonthlySavingUsd: Math.max(0, avgPrimary - avgChallenger) * Math.max(1, userRuns.length),
      samples: items.slice(0, 3).map((item) => item.id),
    }];
  });
  return NextResponse.json({ recommendations, policies });
}

export async function POST(req: Request) {
  const { projectId, stepName, model, provider } = await req.json();
  const profileId = await resolveRequestProfileId(req);
  if (!projectId || !stepName || !model) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const project = await db.project.findUnique({ where: { id: projectId } });
  assertRecordProfile(project?.profileId, profileId);
  await db.modelPolicy.upsert({ where: { projectId_stepName: { projectId, stepName } }, create: { profileId, projectId, stepName, model, provider: provider ?? "" }, update: { model, provider: provider ?? "" } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { projectId, stepName } = await req.json();
  const profileId = await resolveRequestProfileId(req);
  await db.modelPolicy.deleteMany({ where: { profileId, projectId, stepName } });
  return NextResponse.json({ ok: true });
}
