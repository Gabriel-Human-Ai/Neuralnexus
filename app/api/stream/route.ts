export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [skillRules, tasteRules, draftOutputs, projects, benchmarkRuns, policies] = await Promise.all([
    db.skillRule.findMany({ where: { status: "proposed" }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.tasteRule.findMany({ where: { status: "proposed" }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.output.findMany({ where: { status: "draft" }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.project.findMany({ select: { id: true, name: true } }),
    db.benchmarkRun.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
    db.modelPolicy.findMany(),
  ]);

  const projectName = new Map(projects.map((project) => [project.id, project.name]));
  const autopilotGroups = new Map<string, typeof benchmarkRuns>();
  benchmarkRuns.forEach((run) => {
    const key = `${run.projectId}|||${run.stepName}|||${run.challengerModel}`;
    autopilotGroups.set(key, [...(autopilotGroups.get(key) ?? []), run]);
  });

  const autopilotItems = Array.from(autopilotGroups.values()).flatMap((runs) => {
    const latest = runs[0];
    const avgScore = runs.reduce((sum, item) => sum + item.similarityScore, 0) / Math.max(1, runs.length);
    if (runs.length < 3 || avgScore < 8) return [];
    if (policies.some((policy) => policy.projectId === latest.projectId && policy.stepName === latest.stepName && policy.model === latest.challengerModel)) return [];
    return [{
      id: `autopilot:${latest.projectId}:${latest.stepName}:${latest.challengerModel}`,
      type: "autopilot",
      source: "AUTOPILOT",
      preview: `${latest.stepName} can run on ${latest.challengerModel}`,
      provenance: `${projectName.get(latest.projectId) ?? "Workspace"} · ${runs.length} shadow runs · ${avgScore.toFixed(1)}/10 match`,
      endpoint: "/api/autopilot",
      projectId: latest.projectId,
      payload: { projectId: latest.projectId, stepName: latest.stepName, model: latest.challengerModel, provider: "" },
    }];
  });

  const items = [
    ...skillRules.map((rule) => ({
      id: `skill:${rule.id}`,
      type: "skill_rule",
      source: "SKILL GENOME",
      preview: rule.text,
      provenance: `Skill ${rule.skillId} · learned rule`,
      endpoint: `/api/rules/${rule.id}`,
    })),
    ...tasteRules.map((rule) => ({
      id: `taste:${rule.id}`,
      type: "taste_rule",
      source: "THE EYE",
      preview: rule.text,
      provenance: `${rule.contextTag} · proposed taste rule`,
      endpoint: `/api/eye/rules/${rule.id}`,
    })),
    ...autopilotItems,
    ...draftOutputs.map((output) => ({
      id: `output:${output.id}`,
      type: "draft_output",
      source: "OUTPUT",
      preview: (output.finalContent || output.draftContent).slice(0, 180) || output.stepName || "Draft output",
      provenance: `${projectName.get(output.projectId) ?? "Workspace"} · ${output.stepName || "draft"} · ${output.model}`,
      endpoint: `/api/outputs/${output.id}/finalize`,
      projectId: output.projectId,
      outputId: output.id,
      payload: { content: output.finalContent || output.draftContent },
    })),
  ].slice(0, 60);

  return NextResponse.json({ items, count: items.length });
}
