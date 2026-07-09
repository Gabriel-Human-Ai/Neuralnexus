import { db } from "@/lib/db";
import { MODELS, pickModelForTask, runChatWithFallback } from "@/lib/providers";
import { estimateCost } from "@/lib/tokens";
import { runQualityGates } from "@/lib/judge";

export type RunOutputRequest = {
  projectId: string;
  stepName: string;
  stepDescription: string;
  userInput: string;
  skillId?: string;
  model?: string;
  checklist: string[];
  parentOutputId?: string;
  forkChangedVariable?: string;
};

export async function resolveModel(projectId: string, stepName: string, explicit?: string) {
  if (explicit) return explicit;
  const exact = await db.modelPolicy.findUnique({ where: { projectId_stepName: { projectId, stepName } } });
  if (exact) return exact.model;
  const star = await db.modelPolicy.findUnique({ where: { projectId_stepName: { projectId, stepName: "*" } } });
  if (star) return star.model;
  return pickModelForTask(`${stepName} strategic workspace step`);
}

export async function runWorkspaceStep(body: RunOutputRequest) {
  const { projectId, stepName, stepDescription, userInput } = body;
  if (!projectId || !stepName || !stepDescription) throw new Error("missing_fields");
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("project_not_found");

  const skill = body.skillId ? await db.skill.findUnique({ where: { id: body.skillId } }) : null;
  const activeRules = skill ? await db.skillRule.findMany({ where: { skillId: skill.id, status: "active" }, orderBy: { createdAt: "asc" } }) : [];
  const knowledge = await db.memory.findMany({ where: { projectId, kind: "knowledge" }, orderBy: { createdAt: "desc" }, take: 8 });
  const model = await resolveModel(projectId, stepName, body.model);

  const systemPrompt = [
    "You are executing one step of a reusable AI workspace.",
    "",
    `WORKSPACE: ${project.name}`,
    `PURPOSE: ${project.goal.slice(0, 400)}`,
    "",
    `STEP: ${stepName}`,
    `STEP GOAL: ${stepDescription}`,
    "",
    skill ? `METHOD (Skill: ${skill.name} v${skill.version}):\n${skill.instructions}` : "",
    activeRules.length ? `LEARNED RULES — follow every rule strictly:\n${activeRules.map((rule) => `- ${rule.text}`).join("\n")}` : "",
    knowledge.length ? `KNOWLEDGE SOURCES:\n${knowledge.map((item) => `--- ${item.content.slice(0, 1200)}`).join("\n")}` : "",
    "Produce the step output directly. No preamble, no meta commentary.",
  ].filter(Boolean).join("\n");
  const prompt = userInput?.trim() || "Execute this step now.";

  const result = await runChatWithFallback(model, [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ]);
  const provider = MODELS.find((item) => item.id === result.usedModel)?.provider ?? "unknown";
  const primaryCost = estimateCost(result.usedModel, result.inputTokens, result.outputTokens);
  await db.modelRun.create({ data: { projectId, provider, model: result.usedModel, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: primaryCost, purpose: "user" } });

  const gated = await runQualityGates({ projectId, content: result.text, checklist: body.checklist ?? [], systemPrompt, primaryModel: result.usedModel });
  const totalCost = primaryCost + gated.extraCost;
  const output = await db.output.create({
    data: {
      projectId,
      stepName,
      prompt,
      draftContent: gated.content,
      skillId: skill?.id,
      skillVersion: skill?.version ?? 1,
      model: result.usedModel,
      provider,
      inputTokens: result.inputTokens + gated.extraInputTokens,
      outputTokens: result.outputTokens + gated.extraOutputTokens,
      costUsd: totalCost,
      knowledgeIds: knowledge.map((item) => item.id).join(","),
      parentOutputId: body.parentOutputId,
      forkChangedVariable: body.forkChangedVariable,
      qualityReport: gated.report ? JSON.stringify(gated.report) : "",
    },
  });
  return { output, content: gated.content, model: result.usedModel, provider, costUsd: totalCost, qualityReport: gated.report, systemPrompt };
}
