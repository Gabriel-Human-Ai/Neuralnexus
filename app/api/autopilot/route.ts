export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pickMetaModel } from "@/lib/meta-model";

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ recommendations: [], policies: [] });
  if (!(await pickMetaModel())) return NextResponse.json({ disabled: true, message: "Autopilot needs a connected model.", recommendations: [], policies: [] });
  const [runs, policies, userRuns] = await Promise.all([
    db.benchmarkRun.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    db.modelPolicy.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    db.modelRun.findMany({ where: { projectId, purpose: "user", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
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
    return [{
      stepName: latest.stepName,
      fromModel: latest.primaryModel,
      toModel: latest.challengerModel,
      runs: runsCount,
      avgScore: Number(avgScore.toFixed(1)),
      projectedMonthlySavingUsd: Math.max(0, avgPrimary - avgChallenger) * Math.max(1, userRuns.length),
      samples: items.slice(0, 3).map((item) => item.id),
    }];
  });
  return NextResponse.json({ recommendations, policies });
}

export async function POST(req: Request) {
  const { projectId, stepName, model, provider } = await req.json();
  if (!projectId || !stepName || !model) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  await db.modelPolicy.upsert({ where: { projectId_stepName: { projectId, stepName } }, create: { projectId, stepName, model, provider: provider ?? "" }, update: { model, provider: provider ?? "" } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { projectId, stepName } = await req.json();
  await db.modelPolicy.deleteMany({ where: { projectId, stepName } });
  return NextResponse.json({ ok: true });
}
